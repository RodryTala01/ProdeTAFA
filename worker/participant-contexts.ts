import type { Env } from './index';
import type {
  CompetitionContext,
  ContextBase,
  RoundContexts,
} from '../src/competition-contexts';
import { scoreEntrySegment } from './competition-total-groups';
type Link = {
  id: number;
  sequence: number;
  purpose: string;
  label: string | null;
  competition_id: number;
  code: string;
  display_name: string;
  family: string;
  sort_order: number;
  season_id: number;
  division_id: number | null;
  stage_id: number;
  stage_code: string;
  stage_name: string;
  stage_type: string;
};
type Member = { userId: string; fullName: string };
const validity =
  '(m.valid_from_round_id IS NULL OR m.valid_from_round_id<=?) AND (m.valid_to_round_id IS NULL OR m.valid_to_round_id>?)';
export async function participantCompetitionContexts(
  env: Env,
  roundId: number,
  userId: string,
): Promise<RoundContexts | null> {
  const round = await env.DB.prepare(
    "SELECT id,name,status,category FROM rounds WHERE id=? AND status IN ('open','finished')",
  )
    .bind(roundId)
    .first<RoundContexts['round']>();
  if (!round) return null;
  const links = await env.DB.prepare(
    `SELECT l.*,c.code,c.display_name,c.family,c.sort_order,c.season_id,c.division_id,s.code AS stage_code,s.name AS stage_name,s.stage_type FROM competition_round_links l JOIN competitions c ON c.id=l.competition_id JOIN competition_stages s ON s.id=l.stage_id WHERE l.round_id=? AND l.purpose='NORMAL' ORDER BY c.sort_order,s.sequence,l.sequence`,
  )
    .bind(roundId)
    .all<Link>();
  const membership = new Map<number, Member[]>();
  async function members(entryId: number) {
    if (!membership.has(entryId)) {
      const rows = await env.DB.prepare(
        `SELECT DISTINCT m.user_id AS userId,u.full_name AS fullName FROM competition_entry_members m JOIN users u ON u.id=m.user_id WHERE m.entry_id=? AND ${validity} ORDER BY u.full_name`,
      )
        .bind(entryId, roundId, roundId)
        .all<Member>();
      membership.set(entryId, rows.results ?? []);
    }
    return membership.get(entryId)!;
  }
  async function entryName(id: number) {
    const entry = await env.DB.prepare(
      'SELECT display_name,entry_type FROM competition_entries WHERE id=?',
    )
      .bind(id)
      .first<{ display_name: string; entry_type: string }>();
    return entry?.entry_type === 'DUO'
      ? (await members(id)).map((m) => m.fullName).join(' + ')
      : (entry?.display_name ?? 'Rival');
  }
  const contexts: { context: CompetitionContext; order: number }[] = [];
  function base(l: Link): ContextBase {
    return {
      id: '',
      competition: {
        id: l.competition_id,
        code: l.code,
        displayName: l.display_name,
        family: l.family,
      },
      stage: l.stage_id
        ? {
            id: l.stage_id,
            code: l.stage_code,
            name: l.stage_name,
            stageType: l.stage_type,
          }
        : null,
      roundLink: l.id
        ? { id: l.id, sequence: l.sequence, purpose: l.purpose, label: l.label }
        : null,
    };
  }
  function add(context: CompetitionContext, order: number) {
    if (!contexts.some((c) => c.context.id === context.id))
      contexts.push({ context, order });
  }
  for (const l of links.results ?? []) {
    const b = base(l);
    if (
      l.stage_type === 'LEAGUE_TABLE' &&
      ['LIGA_A', 'LIGA_B'].includes(l.code)
    ) {
      const d = await env.DB.prepare(
        'SELECT d.id,d.code,d.name FROM season_division_members m JOIN season_divisions d ON d.id=m.division_id WHERE m.season_id=? AND m.user_id=? AND m.division_id=?',
      )
        .bind(l.season_id, userId, l.division_id)
        .first<{ id: number; code: string; name: string }>();
      if (d)
        add(
          { ...b, id: `league-${l.id}`, kind: 'LEAGUE', division: d },
          l.sort_order,
        );
      continue;
    }
    const entries = await env.DB.prepare(
      `SELECT DISTINCT e.id,e.entry_type FROM competition_entries e JOIN competition_entry_members m ON m.entry_id=e.id WHERE e.competition_id=? AND m.user_id=? AND ${validity}`,
    )
      .bind(l.competition_id, userId, roundId, roundId)
      .all<{ id: number; entry_type: string }>();
    for (const entry of entries.results ?? []) {
      if (
        ['ACCUMULATIVE_GROUPS', 'ROUND_ROBIN_GROUPS'].includes(l.stage_type)
      ) {
        const gs = await env.DB.prepare(
          'SELECT g.id,g.code,g.name FROM competition_groups g JOIN competition_group_entries ge ON ge.group_id=g.id WHERE g.stage_id=? AND ge.entry_id=?',
        )
          .bind(l.stage_id, entry.id)
          .all<{ id: number; code: string; name: string }>();
        for (const group of gs.results ?? []) {
          if (l.stage_type === 'ACCUMULATIVE_GROUPS')
            add(
              {
                ...b,
                id: `group-${l.id}-${group.id}-${entry.id}`,
                kind: 'ACCUMULATIVE_GROUP',
                entryId: entry.id,
                group,
              },
              l.sort_order,
            );
          else {
            const fixtures = await env.DB.prepare(
              `SELECT e.id,e.segment_id,e.entry_a_id,e.entry_b_id,((l.sequence-1)*3+s.sequence) AS mini_day FROM competition_encounters e JOIN competition_round_segments s ON s.id=e.segment_id JOIN competition_round_links l ON l.id=s.round_link_id WHERE s.round_link_id=? AND e.group_id=? AND e.status<>'cancelled' AND (e.entry_a_id=? OR e.entry_b_id=?) ORDER BY s.sequence,e.id`,
            )
              .bind(l.id, group.id, entry.id, entry.id)
              .all<{
                id: number;
                segment_id: number;
                entry_a_id: number;
                entry_b_id: number;
                mini_day: number;
              }>();
            const miniFixtures = [];
            for (const f of fixtures.results ?? []) {
              const opponent =
                f.entry_a_id === entry.id ? f.entry_b_id : f.entry_a_id;
              if (!opponent) continue;
              const [self, other] = await Promise.all([
                scoreEntrySegment(env, entry.id, f.segment_id),
                scoreEntrySegment(env, opponent, f.segment_id),
              ]);
              miniFixtures.push({
                encounterId: f.id,
                segmentId: f.segment_id,
                miniDay: f.mini_day,
                opponentEntryId: opponent,
                opponentName: await entryName(opponent),
                scoreSelf: self.points,
                scoreOpponent: other.points,
                complete: self.complete && other.complete,
              });
            }
            add(
              {
                ...b,
                id: `total-${l.id}-${group.id}-${entry.id}`,
                kind: 'TOTAL_GROUP',
                entryId: entry.id,
                group,
                miniFixtures,
              },
              l.sort_order,
            );
          }
        }
      } else if (
        l.stage_type === 'SURVIVAL_TABLE' &&
        entry.entry_type === 'DUO'
      ) {
        const ended = await env.DB.prepare(
          `SELECT r.id FROM competition_survival_results r JOIN competition_round_links previous ON previous.id=r.round_link_id WHERE r.stage_id=? AND r.entry_id=? AND previous.sequence<? AND r.decision IN ('ELIMINATED','QUALIFIED') LIMIT 1`,
        )
          .bind(l.stage_id, entry.id, l.sequence)
          .first();
        if (ended) continue;
        const bonus = await env.DB.prepare(
          'SELECT COALESCE(SUM(points),0) AS points FROM competition_entry_bonuses WHERE entry_id=? AND round_link_id=?',
        )
          .bind(entry.id, l.id)
          .first<{ points: number }>();
        add(
          {
            ...b,
            id: `duo-${l.id}-${entry.id}`,
            kind: 'DUO_SURVIVAL',
            entryId: entry.id,
            duoName: await entryName(entry.id),
            partner:
              (await members(entry.id)).find((m) => m.userId !== userId) ??
              null,
            bonusPoints: Number(bonus?.points ?? 0),
          },
          l.sort_order,
        );
      } else if (l.stage_type === 'KNOCKOUT') {
        const encounters = await env.DB.prepare(
          "SELECT * FROM competition_encounters WHERE stage_id=? AND round_link_id=? AND status<>'cancelled' AND (entry_a_id=? OR entry_b_id=?) ORDER BY id",
        )
          .bind(l.stage_id, l.id, entry.id, entry.id)
          .all<{
            id: number;
            slot_key: string;
            entry_a_id: number | null;
            entry_b_id: number | null;
            score_a: number | null;
            score_b: number | null;
            status: string;
            winner_entry_id: number | null;
            resolution: string | null;
            admin_confirmed_at: string | null;
          }>();
        for (const e of encounters.results ?? []) {
          const a = e.entry_a_id === entry.id,
            opponent = a ? e.entry_b_id : e.entry_a_id;
          const node = await env.DB.prepare(
            'SELECT node_code AS code,label,branch FROM competition_champions_nodes WHERE encounter_id=?',
          )
            .bind(e.id)
            .first<{ code: string; label: string; branch: string }>();
          add(
            {
              ...b,
              id: `knockout-${e.id}-${entry.id}`,
              kind: 'KNOCKOUT',
              entryId: entry.id,
              ...(entry.entry_type === 'DUO'
                ? {
                    partner:
                      (await members(entry.id)).find(
                        (m) => m.userId !== userId,
                      ) ?? null,
                  }
                : {}),
              encounter: {
                id: e.id,
                slotKey: e.slot_key,
                opponentEntryId: opponent,
                opponentName: opponent ? await entryName(opponent) : null,
                scoreSelf: a ? e.score_a : e.score_b,
                scoreOpponent: a ? e.score_b : e.score_a,
                status: e.status,
                winnerEntryId: e.winner_entry_id,
                resolution: e.resolution,
                adminConfirmedAt: e.admin_confirmed_at,
              },
              ...(node ? { championNode: node } : {}),
            },
            l.sort_order,
          );
        }
      }
    }
  }
  // TAFA can use a Liga Fecha without a TIEBREAK round link; read its own persisted rounds.
  const ties = await env.DB.prepare(
    `SELECT DISTINCT t.id AS tie_id,t.status AS tie_status,t.encounter_id,t.winner_entry_id,tr.sequence AS tie_sequence,te.entry_id,c.id AS competition_id,c.code,c.display_name,c.family,c.sort_order,t.stage_id,s.code AS stage_code,s.name AS stage_name,s.stage_type FROM competition_tiebreak_rounds tr JOIN competition_tiebreaks t ON t.id=tr.tiebreak_id JOIN competition_tiebreak_entries te ON te.tiebreak_id=t.id JOIN competition_entry_members m ON m.entry_id=te.entry_id JOIN competitions c ON c.id=t.competition_id LEFT JOIN competition_stages s ON s.id=t.stage_id WHERE tr.round_id=? AND t.status<>'cancelled' AND m.user_id=? AND ${validity} ORDER BY c.sort_order,t.id`,
  )
    .bind(roundId, userId, roundId, roundId)
    .all<
      Link & {
        tie_id: number;
        tie_status: string;
        encounter_id: number | null;
        winner_entry_id: number | null;
        tie_sequence: number;
        entry_id: number;
      }
    >();
  for (const t of ties.results ?? []) {
    const rivals = await env.DB.prepare(
      'SELECT entry_id FROM competition_tiebreak_entries WHERE tiebreak_id=? AND entry_id<>? ORDER BY entry_id',
    )
      .bind(t.tie_id, t.entry_id)
      .all<{ entry_id: number }>();
    const opponents = [];
    for (const r of rivals.results ?? [])
      opponents.push({
        entryId: r.entry_id,
        name: await entryName(r.entry_id),
      });
    add(
      {
        ...base(t),
        roundLink: null,
        id: `tiebreak-${t.tie_id}-${t.entry_id}`,
        kind: 'TIEBREAK',
        entryId: t.entry_id,
        tiebreak: {
          id: t.tie_id,
          status: t.tie_status,
          originalEncounterId: t.encounter_id,
          sequence: t.tie_sequence,
          winnerEntryId: t.winner_entry_id,
          opponents,
        },
      },
      t.sort_order,
    );
  }
  const rank = {
    LEAGUE: 0,
    ACCUMULATIVE_GROUP: 1,
    TOTAL_GROUP: 2,
    DUO_SURVIVAL: 3,
    KNOCKOUT: 4,
    TIEBREAK: 5,
  };
  contexts.sort(
    (a, b) =>
      rank[a.context.kind] - rank[b.context.kind] ||
      a.order - b.order ||
      a.context.id.localeCompare(b.context.id),
  );
  return { round, contexts: contexts.map((c) => c.context) };
}

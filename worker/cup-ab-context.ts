import type { Env } from "./index";

// The division is the source of eligibility in both manual and assisted flows.
export async function cupGroupContext(env: Env, stageId: number) {
  const stage = await env.DB.prepare(
    `SELECT cs.id,cs.competition_id,cs.status,cs.stage_type,c.code,
    c.season_id,c.division_id,c.status AS competition_status,s.status AS season_status,s.season_number,d.code AS division_code
    FROM competition_stages cs JOIN competitions c ON c.id=cs.competition_id
    JOIN tafa_seasons s ON s.id=c.season_id LEFT JOIN season_divisions d ON d.id=c.division_id
    WHERE cs.id=?`,
  )
    .bind(stageId)
    .first<{
      id: number;
      competition_id: number;
      status: string;
      stage_type: string;
      code: string;
      season_id: number;
      division_id: number;
      competition_status: string;
      season_status: string;
      season_number: number;
      division_code: string;
    }>();
  if (
    !stage ||
    !["COPA_A", "COPA_B"].includes(stage.code) ||
    stage.stage_type !== "ACCUMULATIVE_GROUPS"
  )
    return null;
  const eligible = await env.DB.prepare(
    `SELECT u.id AS userId,u.full_name AS fullName FROM season_division_members dm
    JOIN users u ON u.id=dm.user_id AND u.role='participant' WHERE dm.season_id=? AND dm.division_id=? ORDER BY u.full_name COLLATE NOCASE`,
  )
    .bind(stage.season_id, stage.division_id)
    .all<{ userId: string; fullName: string }>();
  const champion = await env.DB.prepare(
    `SELECT m.user_id FROM competition_results r JOIN competitions c ON c.id=r.competition_id
    JOIN tafa_seasons s ON s.id=c.season_id JOIN competition_entry_members m ON m.entry_id=r.entry_id
    WHERE c.code=? AND s.season_number<? AND r.result_code='CHAMPION'
    ORDER BY s.season_number DESC,r.confirmed_at DESC LIMIT 1`,
  )
    .bind(stage.code, stage.season_number)
    .first<{ user_id: string }>();
  const audit = await env.DB.prepare(
    `SELECT after_json,created_at FROM audit_log WHERE entity_type='competition_stage' AND entity_id=?
    AND action IN ('competition.groups_configured','competition.groups_drawn') ORDER BY id DESC LIMIT 1`,
  )
    .bind(String(stageId))
    .first<{ after_json: string; created_at: string }>();
  const lastConfiguration = audit
    ? { ...JSON.parse(audit.after_json), createdAt: audit.created_at }
    : null;
  const championId =
    champion?.user_id ?? lastConfiguration?.defendingChampionUserId ?? null;
  const assignments = await env.DB.prepare(
    `SELECT g.code,g.name,m.user_id AS userId,ge.seed_position FROM competition_groups g
    JOIN competition_group_entries ge ON ge.group_id=g.id JOIN competition_entry_members m ON m.entry_id=ge.entry_id
    WHERE g.stage_id=? ORDER BY g.sequence,ge.seed_position,ge.entry_id`,
  )
    .bind(stageId)
    .all<{ code: string; name: string; userId: string }>();
  return {
    stage,
    eligible: eligible.results ?? [],
    defendingChampionUserId: (eligible.results ?? []).some(
      (e) => e.userId === championId,
    )
      ? championId
      : null,
    championKnown: Boolean(champion),
    assignments: assignments.results ?? [],
    lastConfiguration,
  };
}

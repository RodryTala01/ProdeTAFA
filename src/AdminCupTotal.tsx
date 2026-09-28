import { useEffect, useState } from 'react';
import {
  cupApi,
  cupAdmin,
  type CupCompetition,
  type CupRound,
  type Encounter,
} from './cup-ab-api';
import { statusLabel } from './competition-presentation';
import TotalKnockout from './TotalKnockout';
import TotalQualification, { type TotalStanding } from './TotalQualification';
import './cup-ab.css';
type Person = { userId: string; fullName: string; divisionCode: string };
type Group = { code: string; name: string; userIds: string[] };
type Context = {
  eligible: Person[];
  assignments: { code: string; name: string; userId: string }[];
  defendingChampionUserId: string | null;
  fixtureCount: number;
  links: {
    id: number;
    roundId: number;
    name: string;
    status: string;
    matchCount: number;
  }[];
  lastConfiguration: null | { configurationMode: string; randomSeed?: number };
};
type TableGroup = {
  id: number;
  code: string;
  name: string;
  provisional: boolean;
  standings: TotalStanding[];
  fixtures: {
    id: number;
    segmentId: number;
    entryAId: number;
    entryBId: number;
    scoreA: number;
    scoreB: number;
    complete: boolean;
  }[];
};
type Segment = {
  id: number;
  globalMiniDay: number;
  roundName: string;
  roundId: number;
  matches: { matchId: number; home: string; away: string; kickoffAt: string }[];
};
const tabs = [
  'Resumen',
  'Grupos',
  'Mini-fechas',
  'Tabla',
  'Clasificación',
  'Octavos',
  'Cuartos',
  'Semifinal',
  'Final / 3.º puesto',
];
export default function AdminCupTotal({
  competition,
  seasonNumber,
  rounds,
  disabled,
}: {
  competition: CupCompetition;
  seasonNumber: number;
  rounds: CupRound[];
  disabled: boolean;
}) {
  const stage = competition.stages.find(
    (s) => s.stageType === 'ROUND_ROBIN_GROUPS',
  )!;
  const ko = competition.stages
    .filter((s) => s.stageType === 'KNOCKOUT')
    .sort((a, b) => a.sequence - b.sequence);
  const [tab, setTab] = useState('Resumen'),
    [ctx, setCtx] = useState<Context | null>(null),
    [groups, setGroups] = useState<Group[]>([]),
    [table, setTable] = useState<TableGroup[]>([]),
    [segments, setSegments] = useState<Segment[]>([]);
  const [ranking, setRanking] = useState<
      { userId: string; position: number; totalPoints: number }[]
    >([]),
    [missing, setMissing] = useState<number[]>([]),
    [mode, setMode] = useState('MANUAL'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [outcomes, setOutcomes] = useState<
    { stageId: number; encounters: Encounter[] }[]
  >([]);
  async function load() {
    const [context, t, segs, r, ...knockouts] = await Promise.all([
      cupApi<Context>(`${cupAdmin}/stages/${stage.id}/total/groups`),
      cupApi<{ groups: TableGroup[] }>(
        `/api/competition-engine/stages/${stage.id}/total/groups`,
      ),
      cupApi<{ segments: Segment[] }>(
        `${cupAdmin}/stages/${stage.id}/total/segments`,
      ),
      cupApi<{ ranking: typeof ranking; missingSeasons: number[] }>(
        `/api/competition-engine/iffhs/ranking?throughSeason=${seasonNumber - 1}`,
      ),
      ...ko.map((k) =>
        cupApi<{ encounters: Encounter[] }>(
          `/api/competition-engine/stages/${k.id}/knockout`,
        ),
      ),
    ]);
    setCtx(context);
    setTable(t.groups);
    setSegments(segs.segments);
    setRanking(r.ranking);
    setMissing(r.missingSeasons);
    setOutcomes(
      knockouts.map((o, i) => ({
        stageId: ko[i].id,
        encounters: o.encounters,
      })),
    );
    const saved: Group[] = [];
    for (const a of context.assignments) {
      let g = saved.find((g) => g.code === a.code);
      if (!g) {
        g = { code: a.code, name: a.name, userIds: [] };
        saved.push(g);
      }
      g.userIds.push(a.userId);
    }
    const n = Math.max(1, Math.round(context.eligible.length / 4));
    setGroups(saved.length ? saved : empty(n, context.eligible.length));
  }
  function empty(n: number, total: number): Group[] {
    return Array.from({ length: n }, (_, i) => ({
      code: String.fromCharCode(65 + i),
      name: `Grupo ${String.fromCharCode(65 + i)}`,
      userIds: Array.from(
        { length: Math.floor(total / n) + (i < total % n ? 1 : 0) },
        () => '',
      ),
    }));
  }
  useEffect(() => {
    setBusy(true);
    load()
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, [stage.id, competition.roundLinks.length, competition.stages.length]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const locked =
      disabled || busy || ['finished', 'archived'].includes(competition.status),
    groupLocked = locked || stage.status !== 'draft' || !!ctx?.fixtureCount;
  const people = ctx?.eligible ?? [],
    selected = groups.flatMap((g) => g.userIds);
  const ordered = [...people].sort(
    (a, b) =>
      (ranking.find((r) => r.userId === a.userId)?.position ?? Infinity) -
      (ranking.find((r) => r.userId === b.userId)?.position ?? Infinity),
  );
  const seeds = [
    ...ordered.filter((p) => p.userId === ctx?.defendingChampionUserId),
    ...ordered.filter((p) => p.userId !== ctx?.defendingChampionUserId),
  ];
  const pots: Person[][] = [];
  for (let level = 0, cursor = 0; cursor < seeds.length && level < 5; level++) {
    const width = groups.filter((g) => g.userIds.length > level).length;
    if (!width) break;
    pots.push(seeds.slice(cursor, cursor + width));
    cursor += width;
  }
  async function saveGroups() {
    await run(async () => {
      const d = await cupApi<{ randomSeed?: number }>(
        `${cupAdmin}/stages/${stage.id}/total/groups${mode === 'AUTOMATIC' ? '/draw' : ''}`,
        'POST',
        mode === 'MANUAL'
          ? { groups }
          : { groupSizes: groups.map((g) => g.userIds.length) },
      );
      await load();
      setMessage(
        `Grupos guardados · ${mode === 'MANUAL' ? 'Manual' : 'Automático'}${d.randomSeed == null ? '' : ` · Semilla ${d.randomSeed}`}`,
      );
    });
  }
  const pending = outcomes
    .flatMap((o) => o.encounters)
    .filter((e) => e.status === 'tied');
  const current =
    competition.stages.find(
      (s) =>
        s.id ===
        [...outcomes].reverse().find((o) => o.encounters.length)?.stageId,
    ) ?? stage;
  const flat = table.flatMap((g) =>
    g.standings.map((s) => ({ ...s, group: g.code })),
  );
  const pairName = (g: TableGroup, id: number) =>
    g.standings.find((s) => s.entryId === id)?.displayName ?? 'Participante';
  const phase = (
    index: number,
    label: string,
    kind: 'qualified' | 'winners' | 'third-place' = 'winners',
  ) =>
    ko[index] ? (
      <TotalKnockout
        key={`${ko[index].id}-${competition.roundLinks.length}`}
        competition={competition}
        rounds={rounds}
        sourceId={
          kind === 'qualified'
            ? stage.id
            : kind === 'third-place'
              ? ko[2]?.id
              : ko[index - 1]?.id
        }
        targetId={ko[index].id}
        kind={kind}
        label={label}
        disabled={locked}
      />
    ) : (
      <p>
        Creá la etapa {label} en Configuración general. Orden eliminatorio:
        Octavos, Cuartos, Semifinal, Final y Tercer puesto.
      </p>
    );
  return (
    <section
      className="cup-ab form-stack"
      aria-label="Administración deportiva Copa Total"
    >
      <span className="eyebrow">COPA TOTAL · T{seasonNumber}</span>
      <h2>{competition.displayName}</h2>
      <nav className="cup-tabs" aria-label="Fases de Copa Total">
        {tabs.map((t) => (
          <button
            key={t}
            className={`button button--${tab === t ? 'primary' : 'ghost'}`}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {busy && <p role="status">Cargando…</p>}
      {error && (
        <p role="alert" className="alert alert--error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {tab === 'Resumen' && (
        <>
          <p>
            {people.length} participantes de la temporada, Divisiones A y B ·{' '}
            {statusLabel(competition.status)}.
          </p>
          <p>Fase actual: {current.name}.</p>
          <ul>
            {competition.stages.map((s) => (
              <li key={s.id}>
                {s.name} · {statusLabel(s.status)}
                {competition.roundLinks
                  .filter((l) => l.stageId === s.id)
                  .map((l) => (
                    <p key={l.id}>
                      {l.roundName} · {statusLabel(l.roundStatus)}
                    </p>
                  ))}
              </li>
            ))}
          </ul>
          <p>Desempates TAFA pendientes: {pending.length}</p>
          {pending.map((e) => (
            <p key={e.id}>
              {e.entryA?.name} vs {e.entryB?.name} · {e.round?.name}
            </p>
          ))}
          <button
            className="button button--secondary"
            disabled={busy}
            onClick={() => void run(load)}
          >
            Actualizar Copa Total
          </button>
        </>
      )}
      {tab === 'Grupos' && (
        <>
          <h3>Grupos · Manual primero</h3>
          <p>
            {people.length} participantes elegibles de A+B. Grupos de 3 a 5.
            Cada participante debe aparecer una sola vez.
          </p>
          <details open={mode === 'AUTOMATIC'}>
            <summary>Elegibles, ranking IFFHS y bombos</summary>
            <p>
              IFFHS hasta T{seasonNumber - 1}.{' '}
              {missing.length
                ? `Faltan temporadas históricas: ${missing.join(', ')}.`
                : ''}{' '}
              Los puestos empatados se conservan. Los bombos son referencia para
              el sorteo externo.
            </p>
            <p>
              Campeón vigente elegible · A1 automático:{' '}
              {people.find((p) => p.userId === ctx?.defendingChampionUserId)
                ?.fullName ?? 'Sin campeón registrado elegible'}
            </p>
            <div className="cup-grid">
              {pots.map((pot, i) => (
                <div className="competition-stage" key={i}>
                  <h4>Bombo {i + 1}</h4>
                  <ul>
                    {pot.map((p) => (
                      <li key={p.userId}>
                        {p.fullName} · División {p.divisionCode}
                        <small>
                          IFFHS:{' '}
                          {ranking.find((r) => r.userId === p.userId)
                            ?.totalPoints ?? 0}{' '}
                          pts · puesto{' '}
                          {ranking.find((r) => r.userId === p.userId)
                            ?.position ?? 'sin referencia'}
                        </small>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
          {ctx?.lastConfiguration && (
            <p>
              Última configuración:{' '}
              {ctx.lastConfiguration.configurationMode === 'MANUAL'
                ? 'Manual'
                : 'Automática'}
              {ctx.lastConfiguration.randomSeed != null
                ? ` · Semilla ${ctx.lastConfiguration.randomSeed}`
                : ''}{' '}
              · Auditada.
            </p>
          )}
          {!!ctx?.fixtureCount && (
            <p>Grupos bloqueados: el fixture ya fue generado.</p>
          )}
          <div className="topbar-actions">
            <button
              className="button button--primary"
              disabled={groupLocked}
              aria-pressed={mode === 'MANUAL'}
              onClick={() => setMode('MANUAL')}
            >
              Armar manualmente
            </button>
            <button
              className="button button--secondary"
              disabled={groupLocked}
              aria-pressed={mode === 'AUTOMATIC'}
              onClick={() => setMode('AUTOMATIC')}
            >
              Sorteo automático
            </button>
          </div>
          <label className="field">
            Cantidad de grupos
            <input
              type="number"
              min="1"
              max={Math.max(1, Math.floor(people.length / 3))}
              value={groups.length}
              disabled={groupLocked}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (
                  Number.isInteger(n) &&
                  n >= 1 &&
                  n <= Math.floor(people.length / 3)
                )
                  setGroups(empty(n, people.length));
              }}
            />
          </label>
          <div className="cup-grid">
            {groups.map((g, i) => (
              <fieldset key={g.code}>
                <legend>{g.name}</legend>
                <label className="field">
                  Plazas de {g.name}
                  <input
                    type="number"
                    min="3"
                    max="5"
                    value={g.userIds.length}
                    disabled={groupLocked}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isInteger(n) && n >= 3 && n <= 5)
                        setGroups((gs) =>
                          gs.map((row, k) =>
                            k === i
                              ? {
                                  ...row,
                                  userIds: Array.from(
                                    { length: n },
                                    (_, j) => row.userIds[j] ?? '',
                                  ),
                                }
                              : row,
                          ),
                        );
                    }}
                  />
                </label>
                {mode === 'MANUAL' &&
                  g.userIds.map((v, j) => (
                    <label className="field" key={j}>
                      {g.code}
                      {j + 1}
                      <select
                        aria-label={`Grupo ${g.code} posición ${j + 1}`}
                        value={v}
                        disabled={groupLocked}
                        onChange={(e) =>
                          setGroups((gs) =>
                            gs.map((row, k) =>
                              k === i
                                ? {
                                    ...row,
                                    userIds: row.userIds.map((v, l) =>
                                      j === l ? e.target.value : v,
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                      >
                        <option value="">Elegir participante</option>
                        {people.map((p) => (
                          <option
                            key={p.userId}
                            value={p.userId}
                            disabled={
                              selected.includes(p.userId) && v !== p.userId
                            }
                          >
                            {p.fullName} · {p.divisionCode}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
              </fieldset>
            ))}
          </div>
          {mode === 'AUTOMATIC' && (
            <p>
              El sorteo usa el ranking IFFHS del backend, los bombos y las
              plazas indicadas. Campeón elegible en A1. Revisá los elegibles y
              bombos antes de ejecutarlo.
            </p>
          )}
          <button
            className="button button--primary"
            disabled={
              groupLocked ||
              !people.length ||
              (mode === 'MANUAL' && selected.some((v) => !v))
            }
            onClick={() => void saveGroups()}
          >
            {mode === 'MANUAL'
              ? 'Guardar grupos manuales'
              : 'Ejecutar sorteo de grupos'}
          </button>
        </>
      )}
      {tab === 'Mini-fechas' && (
        <>
          <h3>Dos Fechas Copa · seis mini-fechas</h3>
          {[0, 1].map((i) => (
            <p key={i}>
              <strong>Fecha Copa {i + 1}:</strong>{' '}
              {ctx?.links[i]
                ? `${ctx.links[i].name} · ${ctx.links[i].matchCount}/12 partidos`
                : 'Sin vincular'}
            </p>
          ))}
          <p>
            Usá los controles generales para vincular exactamente dos Fechas.
            Los partidos guardados en cada bloque son la fuente de verdad.
          </p>
          <button
            className="button button--primary"
            disabled={
              locked ||
              !!ctx?.fixtureCount ||
              ctx?.links.length !== 2 ||
              ctx.links.some((l) => l.matchCount !== 12)
            }
            onClick={() =>
              void run(async () => {
                await cupApi(
                  `${cupAdmin}/stages/${stage.id}/total/segments`,
                  'POST',
                  {},
                );
                await load();
                setMessage('Seis mini-fechas generadas.');
              })
            }
          >
            Generar mini-fechas
          </button>
          <details>
            <summary>Revisar grupos antes de generar fixture</summary>
            {table.map((g) => (
              <div key={g.id}>
                <h4>{g.name}</h4>
                <p>{g.standings.map((s) => s.displayName).join(' · ')}</p>
                <p>
                  {g.standings.length === 5
                    ? 'Rueda única; mini-fecha 6 libre.'
                    : 'Doble rueda.'}
                </p>
              </div>
            ))}
          </details>
          <button
            className="button button--primary"
            disabled={
              locked ||
              !!ctx?.fixtureCount ||
              segments.length !== 6 ||
              !table.length
            }
            onClick={() =>
              void run(async () => {
                await cupApi(
                  `${cupAdmin}/stages/${stage.id}/total/fixture`,
                  'POST',
                  {},
                );
                await load();
                setMessage('Fixture generado.');
              })
            }
          >
            Generar fixture de grupos
          </button>
          {!!ctx?.fixtureCount && (
            <p>Fixture generado. No se permite regenerarlo.</p>
          )}
          {segments.map((seg) => (
            <details key={seg.id} className="competition-stage">
              <summary>
                {seg.roundName} · Mini-fecha {seg.globalMiniDay}
              </summary>
              <p>
                Partidos {((seg.globalMiniDay - 1) % 3) * 4 + 1}–
                {((seg.globalMiniDay - 1) % 3) * 4 + 4}
              </p>
              <ul>
                {seg.matches.map((m) => (
                  <li key={m.matchId}>
                    {m.home} vs {m.away} ·{' '}
                    {new Date(
                      m.kickoffAt.includes('T')
                        ? m.kickoffAt
                        : m.kickoffAt.replace(' ', 'T') + 'Z',
                    ).toLocaleString('es-AR', {
                      timeZone: 'America/Argentina/Buenos_Aires',
                    })}
                  </li>
                ))}
              </ul>
              {table.map((g) => (
                <div key={g.id}>
                  <strong>{g.name}</strong>
                  {g.fixtures
                    .filter((f) => f.segmentId === seg.id)
                    .map((f) => (
                      <p key={f.id}>
                        {pairName(g, f.entryAId)} {f.scoreA} – {f.scoreB}{' '}
                        {pairName(g, f.entryBId)} ·{' '}
                        {f.complete ? 'Definitivo' : 'Provisional'}
                      </p>
                    ))}
                  {ctx?.fixtureCount &&
                  !g.fixtures.some((f) => f.segmentId === seg.id) ? (
                    <p>Mini-fecha libre.</p>
                  ) : null}
                </div>
              ))}
            </details>
          ))}
        </>
      )}
      {tab === 'Tabla' && (
        <>
          <h3>Tabla de grupos</h3>
          <button
            className="button button--secondary"
            disabled={busy}
            onClick={() => void run(load)}
          >
            Actualizar tablas
          </button>
          {table.map((g) => (
            <article key={g.id}>
              <h4>
                {g.name} · {g.provisional ? 'Provisional' : 'Final'}
              </h4>
              <div
                className="cup-table-scroll"
                tabIndex={0}
                role="region"
                aria-label={`Tabla ${g.name}`}
              >
                <table>
                  <thead>
                    <tr>
                      {[
                        'POS',
                        'Participante',
                        'PJ',
                        'PG',
                        'PE',
                        'PP',
                        'GF',
                        'GC',
                        'DG',
                        'PTS',
                      ].map((t) => (
                        <th key={t}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.standings.map((s) => (
                      <tr key={s.entryId}>
                        <td>{s.position}</td>
                        <td>{s.displayName}</td>
                        {[
                          s.played,
                          s.won,
                          s.drawn,
                          s.lost,
                          s.gf,
                          s.ga,
                          s.gd,
                          s.points,
                        ].map((v, i) => (
                          <td key={i}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
          <p>
            PTS → DG → GF → PG. Igualdad deportiva conserva la misma posición.
          </p>
        </>
      )}
      {tab === 'Clasificación' &&
        (ko[0] ? (
          <TotalQualification
            stageId={stage.id}
            targetStageId={ko[0].id}
            standings={flat}
            disabled={locked}
          />
        ) : (
          <p>Creá la etapa Octavos desde Configuración general.</p>
        ))}
      {tab === 'Octavos' && phase(0, 'Octavos', 'qualified')}
      {tab === 'Cuartos' && phase(1, 'Cuartos')}
      {tab === 'Semifinal' && phase(2, 'Semifinal')}
      {tab === 'Final / 3.º puesto' && (
        <>
          {phase(3, 'Final')}
          {phase(4, 'Tercer puesto', 'third-place')}
        </>
      )}
    </section>
  );
}

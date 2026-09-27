import { useState } from 'react';
import { cupApi, cupAdmin, type CupCompetition } from './cup-ab-api';
import { loadResultEvidence } from './results-admin';
export type IffhsRanking = {
  includedSeasons: number[];
  missingSeasons: number[];
  ranking: {
    position: number;
    userId: string;
    fullName: string;
    totalPoints: number;
    seasons: { seasonNumber: number; points: number; source: string | null }[];
  }[];
};
export type IffhsDetail = {
  userId: string;
  fullName: string;
  totalPoints: number;
  totalSource: string | null;
  components: {
    competitionCode: string;
    componentCode: string;
    baseValue: number;
    multiplier: number;
    points: number;
    source: string;
  }[];
};
export const sourceLabel = (source: string | null) =>
  source === 'calculated'
    ? 'Calculado'
    : source === 'imported'
      ? 'Importado'
      : 'Sin datos';
const componentLabels: Record<string, string> = {
  TITLE: 'Título', RUNNER_UP: 'Subcampeonato', POSITION: 'Posición final',
  SPORT_POINTS: 'Puntos deportivos', FULLS: 'Plenos', ERROR_RANK: 'Posición por errores',
  RESULT: 'Resultado final', GROUP_POINTS: 'Puntos de grupos',
};
export function IffhsBreakdown({ row, competitionNames = {} }: { row: IffhsDetail; competitionNames?: Record<string, string> }) {
  return (
    <section>
      <h4>
        {row.fullName}: {row.totalPoints} · {sourceLabel(row.totalSource)}
      </h4>
      {row.totalSource === 'imported' ? (
        <p>
          Total histórico importado; no se presenta un cálculo deportivo como
          fuente de ese total.
        </p>
      ) : row.components.length ? (
        <ul>
          {row.components.map((c, i) => (
            <li key={i}>
              {competitionNames[c.competitionCode] ?? c.competitionCode.replaceAll('_', ' ')} ·{' '}
              {componentLabels[c.componentCode] ?? c.componentCode.replaceAll('_', ' ')}: {c.baseValue} ×{' '}
              {c.multiplier} = {c.points} · {sourceLabel(c.source)}
            </li>
          ))}
        </ul>
      ) : (
        <p>Sin componentes calculados.</p>
      )}
    </section>
  );
}
export default function AdminIffhs({
  seasonNumber,
  competitions,
  participants,
}: {
  seasonNumber: number;
  competitions: CupCompetition[];
  participants: { id: string; fullName: string }[];
}) {
  const [through, setThrough] = useState(String(seasonNumber)),
    [ranking, setRanking] = useState<IffhsRanking | null>(null),
    [detail, setDetail] = useState<IffhsDetail | null>(null),
    [detailSeason, setDetailSeason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [blockers, setBlockers] = useState<string[] | null>(null),
    [importSeason, setImportSeason] = useState(''),
    [imports, setImports] = useState([{ userId: '', points: '' }]);
  const validSeason = (v: string) =>
    Number.isInteger(Number(v)) && Number(v) > 0;
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setRanking(
      await cupApi<IffhsRanking>(
        `/api/competition-engine/iffhs/ranking?throughSeason=${Number(through)}`,
      ),
    );
    setDetail(null);
  }
  async function inspect() {
    const issues: string[] = [];
    for (const c of competitions.filter((c) => c.code !== 'PROMOCION')) {
      const d = await loadResultEvidence(c);
      if (
        d.entries.length &&
        (c.status !== 'finished' || d.entries.length !== d.results.length)
      )
        issues.push(
          `${c.displayName}: ${c.status !== 'finished' ? 'falta finalizar competición; ' : ''}${d.results.length}/${d.entries.length} resultados confirmados`,
        );
    }
    setBlockers(issues);
    return issues;
  }
  async function calculate() {
    const issues = await inspect();
    if (issues.length) return;
    await cupApi(
      `${cupAdmin}/iffhs/seasons/${seasonNumber}/calculate`,
      'POST',
      {},
    );
    await refresh();
    setNotice(
      `IFFHS de temporada ${seasonNumber} calculado. Elegí esa temporada como límite para verla en el ranking.`,
    );
  }
  async function importTotals() {
    await cupApi(
      `${cupAdmin}/iffhs/seasons/${Number(importSeason)}/totals`,
      'PUT',
      {
        rows: imports.map((r) => ({
          userId: r.userId,
          totalPoints: Number(r.points),
        })),
      },
    );
    setImports([{ userId: '', points: '' }]);
    await refresh();
    setNotice(
      'Importación guardada y auditada. Los totales existentes permanecen protegidos.',
    );
  }
  return (
    <details className="card panel form-stack">
      <summary>IFFHS Admin</summary>
      <p>
        Resultados finales por competición → finalizar competición → calcular
        temporada. El ranking conserva cinco temporadas completas, sin
        depreciación.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button
        className="button button--secondary"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            await inspect();
          })
        }
      >
        Revisar resultados pendientes de T{seasonNumber}
      </button>
      {blockers && (
        <ul>
          {blockers.length ? (
            blockers.map((b) => <li key={b}>{b}</li>)
          ) : (
            <li>
              Resultados completos. El cálculo validará las demás condiciones y
              protegerá los importados.
            </li>
          )}
        </ul>
      )}
      <button
        className="button button--primary"
        disabled={busy}
        onClick={() => void run(calculate)}
      >
        Calcular temporada {seasonNumber}
      </button>
      <label className="field">
        Ranking hasta temporada
        <input
          type="number"
          min="1"
          step="1"
          disabled={busy}
          value={through}
          onChange={(e) => setThrough(e.target.value)}
        />
      </label>
      <button
        className="button button--secondary"
        disabled={busy || !validSeason(through)}
        onClick={() => void run(refresh)}
      >
        Ver ranking últimas 5 temporadas
      </button>
      {ranking && (
        <>
          <p>
            Ventana: {ranking.includedSeasons.join(', ')}. Temporadas faltantes:{' '}
            {ranking.missingSeasons.join(', ') || 'ninguna'}.
          </p>
          {ranking.ranking.map((r) => (
            <article key={r.userId}>
              <h4>
                {r.position}. {r.fullName} · {r.totalPoints} puntos
              </h4>
              <ul>
                {r.seasons.map((s) => (
                  <li key={s.seasonNumber}>
                    T{s.seasonNumber}: {s.points} · {sourceLabel(s.source)}{' '}
                    <button
                      className="button button--ghost"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const d = await cupApi<{ rows: IffhsDetail[] }>(
                            `/api/competition-engine/iffhs/seasons/${s.seasonNumber}/components?userId=${encodeURIComponent(r.userId)}`,
                          );
                          setDetail(d.rows[0] ?? null);
                          setDetailSeason(String(s.seasonNumber));
                        })
                      }
                    >
                      Desglose de {r.fullName}, T{s.seasonNumber}
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </>
      )}
      {detail && (
        <>
          <h3>Desglose T{detailSeason}</h3>
          <IffhsBreakdown row={detail} competitionNames={Number(detailSeason) === seasonNumber ? Object.fromEntries(competitions.map(c => [c.code, c.displayName])) : {}} />
        </>
      )}
      <details className="form-stack">
        <summary>Importación histórica manual</summary>
        <p>
          Cargar totales faltantes por participante. No se reemplazan totales
          existentes, importados ni calculados.
        </p>
        <label className="field">
          Temporada histórica
          <input
            type="number"
            min="1"
            step="1"
            disabled={busy}
            value={importSeason}
            onChange={(e) => setImportSeason(e.target.value)}
          />
        </label>
        {imports.map((r, i) => (
          <div className="form-stack" key={i}>
            <label className="field">
              Participante
              <select
                disabled={busy}
                value={r.userId}
                onChange={(e) =>
                  setImports((old) =>
                    old.map((v, n) =>
                      n === i ? { ...v, userId: e.target.value } : v,
                    ),
                  )
                }
              >
                <option value="">Elegir participante</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Total IFFHS
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={busy}
                value={r.points}
                onChange={(e) =>
                  setImports((old) =>
                    old.map((v, n) =>
                      n === i ? { ...v, points: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <button
              className="button button--ghost"
              disabled={busy || imports.length === 1}
              onClick={() => setImports((old) => old.filter((_, n) => n !== i))}
            >
              Quitar fila
            </button>
          </div>
        ))}
        <button
          className="button button--secondary"
          disabled={busy}
          onClick={() => setImports([...imports, { userId: '', points: '' }])}
        >
          Agregar participante
        </button>
        <button
          className="button button--primary"
          disabled={
            busy ||
            !validSeason(importSeason) ||
            imports.some(
              (r) =>
                !r.userId ||
                r.points === '' ||
                !Number.isFinite(Number(r.points)) ||
                Number(r.points) < 0,
            ) ||
            new Set(imports.map((r) => r.userId)).size !== imports.length
          }
          onClick={() => void run(importTotals)}
        >
          Importar totales históricos
        </button>
      </details>
    </details>
  );
}

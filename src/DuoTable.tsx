import { useEffect, useState } from 'react';
import { cupApi, cupAdmin, type CupLink, type CupRound } from './cup-ab-api';
type Row = {
  entryId: number;
  displayName: string;
  position: number;
  members: { userId: string; fullName: string; points: number }[];
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  provisional?: boolean;
  decision?: string;
  nextBonusPoints?: number;
};
type Table = {
  confirmed: boolean;
  rows: Row[];
  settings: { eliminateCount: number; bonusByPosition: Record<string, number> };
  boundaryTie?: boolean;
  seedTie?: boolean;
  wouldEliminate?: number[];
  tiebreak?: any;
};
export default function DuoTable({
  link,
  rounds,
  disabled,
  configure,
  onChanged,
  revision,
}: {
  link: CupLink;
  rounds: CupRound[];
  disabled: boolean;
  configure: boolean;
  onChanged: () => Promise<void>;
  revision: unknown;
}) {
  const [table, setTable] = useState<Table | null>(null),
    [eliminate, setEliminate] = useState(0),
    [bonus, setBonus] = useState<Record<string, number>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [tie, setTie] = useState<any>(null),
    [round, setRound] = useState('');
  const path = `${cupAdmin}/round-links/${link.id}/duos`;
  async function load() {
    const d = await cupApi<Table>(
      `/api/competition-engine/round-links/${link.id}/duos/table`,
    );
    setTable(d);
    setEliminate(d.settings.eliminateCount);
    setBonus(d.settings.bonusByPosition);
    if (d.tiebreak) setTie(d.tiebreak);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [link.id, link.roundStatus, revision]);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
      await load();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const locked = disabled || busy || !!table?.confirmed;
  const dirty =
    !!table &&
    (eliminate !== table.settings.eliminateCount ||
      Object.keys({ ...bonus, ...table.settings.bonusByPosition }).some(
        (key) =>
          (bonus[key] ?? 0) !== (table.settings.bonusByPosition[key] ?? 0),
      ));
  return (
    <article className="competition-stage form-stack">
      <h3>{link.roundName}</h3>
      {!table ? (
        <p>Cargando tabla…</p>
      ) : (
        <>
          <p>
            {table.confirmed
              ? 'Tabla confirmada · snapshot histórico'
              : table.rows.some((r) => r.provisional)
                ? 'Tabla provisional'
                : 'Tabla definitiva pendiente de confirmación'}
          </p>
          {configure && (
            <>
              <label className="field">
                Eliminar al final
                <input
                  type="number"
                  min="0"
                  value={eliminate}
                  disabled={locked}
                  onChange={(e) => setEliminate(Number(e.target.value))}
                />
              </label>
              <fieldset>
                <legend>Bonus siguiente Fecha por posición</legend>
                {Array.from({ length: table.rows.length }, (_, i) => i + 1).map(
                  (pos) => (
                    <label className="field" key={pos}>
                      {pos}.º
                      <input
                        aria-label={`Bonus posición ${pos}`}
                        type="number"
                        min="0"
                        value={bonus[pos] ?? 0}
                        disabled={locked}
                        onChange={(e) =>
                          setBonus((b) => ({
                            ...b,
                            [pos]: Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                  ),
                )}
              </fieldset>
              <button
                className="button button--secondary"
                disabled={locked}
                onClick={() =>
                  void run(async () => {
                    await cupApi(path + '/settings', 'PUT', {
                      eliminateCount: eliminate,
                      bonusByPosition: bonus,
                    });
                    setMessage('Configuración guardada.');
                  })
                }
              >
                Guardar configuración de Fecha
              </button>
            </>
          )}
          <div
            className="cup-table-scroll"
            role="region"
            aria-label={`Tabla de ${link.roundName}`}
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  {[
                    'POS',
                    'Dúo',
                    'Integrante 1',
                    'Pts',
                    'Integrante 2',
                    'Pts',
                    'Base',
                    'Bonus',
                    'TOTAL',
                    'Estado',
                    'Bonus siguiente',
                  ].map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r) => (
                  <tr key={r.entryId}>
                    <td>{r.position}</td>
                    <td>{r.displayName.split(' · ')[0]}</td>
                    <td>{r.members?.[0]?.fullName ?? '—'}</td>
                    <td>{r.members?.[0]?.points ?? 0}</td>
                    <td>{r.members?.[1]?.fullName ?? '—'}</td>
                    <td>{r.members?.[1]?.points ?? 0}</td>
                    <td>{r.basePoints}</td>
                    <td>{r.bonusPoints}</td>
                    <td>
                      <strong>{r.totalPoints}</strong>
                    </td>
                    <td>
                      {r.decision === 'ELIMINATED'
                        ? 'Eliminado'
                        : r.decision === 'QUALIFIED'
                          ? 'Clasificado a semifinales'
                          : r.provisional
                            ? 'Provisional'
                            : table.wouldEliminate?.includes(r.entryId)
                              ? 'Eliminación propuesta'
                              : 'Continúa'}
                    </td>
                    <td>
                      {r.nextBonusPoints ??
                        (table.wouldEliminate?.includes(r.entryId)
                          ? 0
                          : table.rows.length -
                                table.settings.eliminateCount ===
                              4
                            ? r.position <= 2
                              ? 2
                              : 0
                            : (table.settings.bonusByPosition[r.position] ??
                              0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!table.confirmed && (
            <>
              <p>
                Configuración guardada: eliminar {table.settings.eliminateCount}{' '}
                · sobreviven {table.rows.length - table.settings.eliminateCount}
                .
              </p>
              {table.rows.length - table.settings.eliminateCount === 4 && (
                <p>
                  En semifinales rige el bonus fijo: +2 para primero y segundo;
                  0 para tercero y cuarto.
                </p>
              )}
              <p>
                Eliminados propuestos:{' '}
                {table.rows
                  .filter((r) => table.wouldEliminate?.includes(r.entryId))
                  .map((r) => r.displayName)
                  .join('; ') || 'Ninguno confirmado'}
              </p>
              {(table.boundaryTie || table.seedTie) && (
                <p role="alert">
                  <strong>
                    {table.boundaryTie
                      ? 'Empate en zona de eliminación'
                      : 'Empate en puestos de semifinales'}
                  </strong>
                  . Resolver por TAFA en una misma Fecha Liga posterior.
                </p>
              )}
              {(table.boundaryTie || table.seedTie || tie) && (
                <button
                  className="button button--secondary"
                  disabled={locked}
                  onClick={() =>
                    void run(async () =>
                      setTie(await cupApi(path + '/tiebreak', 'POST', {})),
                    )
                  }
                >
                  Administrar desempate de tabla TAFA
                </button>
              )}
              {tie && (
                <div className="form-stack">
                  <p>{tie.resolutionDetail}</p>
                  {tie.rounds?.map((r: any) => (
                    <p key={r.round_id}>Desempate: {r.name}</p>
                  ))}
                  {tie.ranking && (
                    <ol>
                      {tie.ranking.map((r: any) => (
                        <li key={r.entry_id}>{r.display_name}</li>
                      ))}
                    </ol>
                  )}
                  <label className="field">
                    Fecha Liga posterior
                    <select
                      value={round}
                      disabled={locked || tie.tiebreak.status === 'resolved'}
                      onChange={(e) => setRound(e.target.value)}
                    >
                      <option value="">Elegir Fecha Liga</option>
                      {rounds
                        .filter(
                          (r) =>
                            r.category === 'LIGA' &&
                            r.id !== link.roundId &&
                            !tie.rounds?.some((t: any) => t.round_id === r.id),
                        )
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    className="button button--secondary"
                    disabled={
                      locked || !round || tie.tiebreak.status === 'resolved'
                    }
                    onClick={() =>
                      void run(async () =>
                        setTie(
                          await cupApi(
                            `${cupAdmin}/tiebreaks/${tie.tiebreak.id}/rounds`,
                            'POST',
                            { roundId: Number(round) },
                          ),
                        ),
                      )
                    }
                  >
                    Vincular Liga para desempate
                  </button>
                  <button
                    className="button button--primary"
                    disabled={locked || tie.tiebreak.status === 'resolved'}
                    onClick={() =>
                      void run(async () =>
                        setTie(
                          await cupApi(
                            `${cupAdmin}/tiebreaks/${tie.tiebreak.id}/refresh`,
                            'POST',
                            {},
                          ),
                        ),
                      )
                    }
                  >
                    Evaluar y confirmar desempate de tabla
                  </button>
                </div>
              )}
              <button
                className="button button--primary"
                disabled={
                  locked ||
                  dirty ||
                  table.rows.some((r) => r.provisional) ||
                  !!table.boundaryTie ||
                  !!table.seedTie ||
                  !table.rows.length
                }
                onClick={() =>
                  void run(async () => {
                    await cupApi(path + '/confirm', 'POST', {});
                    setMessage(
                      'Fecha confirmada: snapshot, eliminación y bonus guardados.',
                    );
                  })
                }
              >
                Confirmar Fecha de Dúos
              </button>
              {dirty && (
                <p>
                  Guardá la configuración para actualizar la vista previa antes
                  de confirmar.
                </p>
              )}
            </>
          )}
          {table.confirmed &&
            table.rows.filter((r) => r.decision === 'QUALIFIED').length ===
              4 && (
              <p>
                <strong>Clasificados a semifinales</strong>:{' '}
                {table.rows
                  .filter((r) => r.decision === 'QUALIFIED')
                  .map((r) => `${r.position}.º ${r.displayName}`)
                  .join(' · ')}
              </p>
            )}
          <button
            className="button button--ghost"
            disabled={busy}
            onClick={() => void run(load)}
          >
            Actualizar tabla
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="alert alert--error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </article>
  );
}

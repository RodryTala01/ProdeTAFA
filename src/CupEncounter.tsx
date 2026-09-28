import { useState } from 'react';
import { cupApi, cupAdmin, type Encounter, type CupRound } from './cup-ab-api';
type Tiebreak = {
  tiebreak: { id: number; status: string };
  winnerEntryId: number | null;
  resolutionDetail: string;
  rounds: { round_id: number; name: string }[];
  days: {
    localDay: string;
    scoreA: number;
    scoreB: number;
    complete: boolean;
  }[];
};
export default function EncounterCard({
  encounter: e,
  rounds,
  disabled,
  onChanged,
  allowExceptional = true,
}: {
  encounter: Encounter;
  rounds: CupRound[];
  disabled: boolean;
  onChanged: () => Promise<void>;
  allowExceptional?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [tie, setTie] = useState<Tiebreak | null>(null);
  const [roundId, setRoundId] = useState(''),
    [winner, setWinner] = useState(''),
    [reason, setReason] = useState('');
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const locked = disabled || busy;
  return (
    <article className="competition-stage">
      <h4>
        {e.entryA?.name ?? 'Libre'}{' '}
        <b>
          {e.scoreA ?? '—'} – {e.scoreB ?? '—'}
        </b>{' '}
        {e.entryB?.name ?? 'Libre'}
      </h4>
      <p>
        {e.adminConfirmedAt
          ? 'Confirmado'
          : ((
              {
                pending: 'Pendiente',
                ready: 'Pendiente',
                live: 'En juego · provisional',
                tied: 'Desempate TAFA pendiente',
                finished: 'Terminado · falta confirmar',
              } as Record<string, string>
            )[e.status] ?? e.status)}{' '}
        · {e.round?.name ?? 'Sin Fecha'}
      </p>
      {e.winner && (
        <p>
          Ganador {e.adminConfirmedAt ? 'confirmado' : 'calculado'}:{' '}
          {e.winner.name}
        </p>
      )}
      {e.winner && !e.adminConfirmedAt && e.resolution === 'normal' && (
        <button
          className="button button--primary"
          disabled={locked}
          onClick={() =>
            void run(async () => {
              await cupApi(`${cupAdmin}/encounters/${e.id}/winner`, 'PUT', {
                winnerEntryId: e.winner!.id,
                resolution: 'normal',
              });
            })
          }
        >
          Confirmar ganador
        </button>
      )}
      {(e.status === 'tied' || e.resolution === 'tiebreak') && (
        <button
          className="button button--secondary"
          disabled={locked}
          onClick={() =>
            void run(async () => {
              setTie(
                await cupApi<Tiebreak>(
                  `${cupAdmin}/encounters/${e.id}/tiebreak`,
                  'POST',
                  {},
                ),
              );
            })
          }
        >
          Administrar desempate TAFA
        </button>
      )}
      {tie && (
        <div className="form-stack">
          <p>{tie.resolutionDetail}</p>
          {tie.rounds.map((r) => (
            <p key={r.round_id}>Fecha de desempate: {r.name}</p>
          ))}
          {tie.days.map((d) => (
            <p key={d.localDay}>
              {d.localDay}: {d.scoreA} – {d.scoreB} ·{' '}
              {d.complete ? 'Día completo' : 'En curso'}
            </p>
          ))}
          <label className="field">
            Fecha posterior
            <select
              aria-label="Fecha posterior para desempate"
              value={roundId}
              disabled={locked || tie.tiebreak.status === 'resolved'}
              onChange={(ev) => setRoundId(ev.target.value)}
            >
              <option value="">Elegir Fecha</option>
              {rounds
                .filter(
                  (r) =>
                    r.id !== e.round?.id &&
                    !tie.rounds.some((t) => t.round_id === r.id),
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
            disabled={locked || !roundId || tie.tiebreak.status === 'resolved'}
            onClick={() =>
              void run(async () => {
                setTie(
                  await cupApi<Tiebreak>(
                    `${cupAdmin}/tiebreaks/${tie.tiebreak.id}/rounds`,
                    'POST',
                    { roundId: Number(roundId) },
                  ),
                );
                setRoundId('');
              })
            }
          >
            Vincular Fecha de desempate
          </button>
          <button
            className="button button--primary"
            disabled={locked || tie.tiebreak.status === 'resolved'}
            onClick={() =>
              void run(async () =>
                setTie(
                  await cupApi<Tiebreak>(
                    `${cupAdmin}/tiebreaks/${tie.tiebreak.id}/refresh`,
                    'POST',
                    {},
                  ),
                ),
              )
            }
          >
            Evaluar y confirmar desempate
          </button>
        </div>
      )}
      {allowExceptional && (
        <details>
          <summary>Corrección excepcional del ganador</summary>
          <p>
            Usar sólo por decisión administrativa. Queda auditada con motivo.
          </p>
          <label className="field">
            Ganador
            <select
              aria-label="Ganador por corrección"
              value={winner}
              disabled={locked}
              onChange={(ev) => setWinner(ev.target.value)}
            >
              <option value="">Elegir</option>
              {[e.entryA, e.entryB].filter(Boolean).map((entry) => (
                <option key={entry!.id} value={entry!.id}>
                  {entry!.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Motivo
            <input
              value={reason}
              disabled={locked}
              onChange={(ev) => setReason(ev.target.value)}
            />
          </label>
          <button
            className="button button--secondary"
            disabled={locked || !winner || !reason.trim()}
            onClick={() =>
              void run(async () => {
                await cupApi(`${cupAdmin}/encounters/${e.id}/winner`, 'PUT', {
                  winnerEntryId: Number(winner),
                  resolution: 'admin',
                  reason,
                });
                setReason('');
              })
            }
          >
            Guardar corrección auditada
          </button>
        </details>
      )}
      {error && (
        <p role="alert" className="alert alert--error">
          {error}
        </p>
      )}
    </article>
  );
}

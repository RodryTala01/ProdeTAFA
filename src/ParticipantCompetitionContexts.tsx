import { useEffect, useState } from 'react';
import {
  contextLabel,
  type RoundContexts,
  type CompetitionContext,
} from './competition-contexts';
export function CompetitionContextList({
  contexts,
}: {
  contexts: CompetitionContext[];
}) {
  return (
    <section
      className="participant-contexts"
      aria-label="Contextos deportivos de esta Fecha"
    >
      <h3>Estás jugando esta Fecha en:</h3>
      {contexts.length ? (
        <ul>
          {contexts.map((c) => (
            <li key={c.id}>
              {contextLabel(c)}
              {c.kind === 'TOTAL_GROUP' && (
                <ul>
                  {c.miniFixtures.map((f) => (
                    <li key={f.encounterId}>
                      Mini-fecha {f.miniDay} · vs {f.opponentName}
                    </li>
                  ))}
                  {!c.miniFixtures.length && (
                    <li>
                      Sin cruce asignado en las mini-fechas de esta Fecha.
                    </li>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay competiciones vinculadas a tu participación en esta Fecha.</p>
      )}
      <p>Un único pronóstico de 12 partidos para todos estos contextos.</p>
    </section>
  );
}
export default function ParticipantCompetitionContexts({
  roundId,
}: {
  roundId: number;
}) {
  const [data, setData] = useState<RoundContexts | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    fetch(`/api/participant/rounds/${roundId}/competition-contexts`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok)
          throw new Error(d.error ?? 'No se pudieron cargar las competiciones');
        return d as RoundContexts;
      })
      .then((d) => {
        if (!controller.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [roundId, retry]);
  if (error)
    return (
      <section className="card panel">
        <p role="alert">{error}. Podés seguir cargando tu pronóstico.</p>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => setRetry((n) => n + 1)}
        >
          Reintentar competiciones
        </button>
      </section>
    );
  if (!data || data.round.id !== roundId)
    return <p role="status">Cargando competiciones de esta Fecha…</p>;
  return <CompetitionContextList contexts={data.contexts} />;
}

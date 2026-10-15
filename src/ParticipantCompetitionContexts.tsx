import { useEffect, useState } from 'react';
import {PredictionContextCard} from './PredictionContextCard';
import {readCompetition,type Overview} from './participant-competitions';
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

      {contexts.length ? (
        <ul>
          {contexts.map((c) => (
            <li key={c.id}>
              {contextLabel(c)}{c.kind === 'KNOCKOUT' && c.encounter.scoreSelf !== null && c.encounter.scoreOpponent !== null && <strong> · {c.encounter.scoreSelf}–{c.encounter.scoreOpponent}</strong>}
              {c.kind === 'TOTAL_GROUP' && (
                <ul>
                  {c.miniFixtures.map((f) => (
                    <li key={f.encounterId}>
                      Mini-fecha {f.miniDay} · vs {f.opponentName} · {f.scoreSelf}–{f.scoreOpponent}{!f.complete && ' (parcial)'}
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

    </section>
  );
}
export default function ParticipantCompetitionContexts({
  roundId,
}: {
  roundId: number;
}) {
  const [overview,setOverview]=useState<Overview|null>(null);
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
      .catch(() => {
        if (!controller.signal.aborted) setError('No pudimos cargar las competiciones');
      });
    return () => controller.abort();
  }, [roundId, retry]);
  useEffect(()=>{
    if(!data)return;
    const controller=new AbortController();
    setOverview(null);
    async function load(){
      let value=await readCompetition<Overview>('/api/competition-engine/overview',controller.signal);
      const ids=data!.contexts.map(c=>c.competition.id);
      if(!ids.length)return;
      if(!value.season?.competitions.some(c=>ids.includes(c.id))){
        for(const edition of value.editions){
          const candidate=await readCompetition<Overview>(`/api/competition-engine/overview?season=${edition.seasonNumber}`,controller.signal);
          if(candidate.season?.competitions.some(c=>ids.includes(c.id))){value=candidate;break;}
        }
      }
      if(!controller.signal.aborted)setOverview(value);
    }
    void load().catch(()=>{});
    return()=>controller.abort();
  },[data]);
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
  return <div className="prediction-context-cards">{data.contexts.length ? data.contexts.map(context=><PredictionContextCard key={context.id} context={context} overview={overview} roundId={roundId}/>) : <section className="prediction-summary"><p>Sin competiciones vinculadas a esta Fecha.</p></section>}</div>;
}

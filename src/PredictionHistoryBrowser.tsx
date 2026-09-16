import { useEffect, useState } from 'react';
import PredictionHistory from './PredictionHistory';

export default function PredictionHistoryBrowser({ participantId = '', own = false }: { participantId?: string; own?: boolean }) {
  const [rounds, setRounds] = useState<{ id: number; name: string }[]>([]);
  const [roundId, setRoundId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/${own ? 'participant' : 'admin'}/rounds`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las fechas');
        setRounds(data.rounds);
      }).catch((caught) => { if (!controller.signal.aborted) setError(caught.message); });
    return () => controller.abort();
  }, [own]);
  return <section className="card prediction-history">
    <h2>{own ? 'Mi historial de pronósticos' : 'Historial del participante'}</h2>
    <label>Fecha del Prode<select value={roundId} onChange={(event) => setRoundId(event.target.value)}>
      <option value="">Elegir fecha</option>
      {rounds.map((round) => <option key={round.id} value={round.id}>{round.name}</option>)}
    </select></label>
    {error && <p role="alert">{error}</p>}
    {roundId && <PredictionHistory key={`${participantId}-${roundId}`} roundId={Number(roundId)} participantId={participantId} own={own} initiallyOpen />}
  </section>;
}

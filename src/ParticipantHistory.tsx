import { useEffect, useState } from 'react';

type HistoryRound = {
  id: number;
  name: string;
  finishedAt: string | null;
  lastSubmittedAt: string;
  submissionCount: number;
  points: number;
  fulls: number;
  partials: number;
  errors: number;
  extras: number;
};

function formatDate(value: string | null) {
  if (!value) return '';
  const normalized = /(Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(normalized));
}

export default function ParticipantHistory() {
  const [rounds, setRounds] = useState<HistoryRound[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/participant/history');
      const data = await response.json() as { rounds?: HistoryRound[]; error?: string };
      if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
      setRounds(data.rounds ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (loading) return <section className="card panel"><p>Cargando historial...</p></section>;

  return (
    <div className="form-stack">
      <section className="card panel">
        <div className="panel-heading">
          <div><span className="eyebrow">HISTORIAL</span><h1>Tus fechas</h1><p>Resumen de todas las fechas que ya cerraron.</p></div>
          <button className="button button--ghost" onClick={() => void load()}>Actualizar</button>
        </div>
        {error && <div className="alert alert--error">{error}</div>}
      </section>

      {rounds.length === 0 ? (
        <section className="card panel"><p>Todavía no tenés fechas finalizadas.</p></section>
      ) : (
        <section className="card panel panel--wide">
          <div className="user-list">
            {rounds.map((round) => (
              <div className="user-row" key={round.id}>
                <div className="avatar">{round.points}</div>
                <div className="user-data">
                  <strong>{round.name}</strong>
                  <span>{formatDate(round.finishedAt)} · {round.fulls} plenos · {round.partials} parciales · {round.errors} errores · {round.extras} extras</span>
                </div>
                <span className="user-chip">{round.points} pts</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

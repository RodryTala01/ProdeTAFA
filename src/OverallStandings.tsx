import { useEffect, useState } from 'react';

type Standing = {
  position: number;
  userId: string;
  fullName: string;
  roundsPlayed: number;
  points: number;
  averagePoints: number;
  fulls: number;
  partials: number;
  errors: number;
  extras: number;
};

type RecentRound = {
  id: number;
  name: string;
  finishedAt: string | null;
  points: number;
  fulls: number;
  partials: number;
  errors: number;
  extras: number;
};

type Data = {
  finishedRounds: number;
  currentUserId: string;
  standings: Standing[];
  recentRounds: RecentRound[];
};

function formatDate(value: string | null) {
  if (!value) return '';
  const normalized = /(Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(normalized));
}

export default function OverallStandings() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const response = await fetch('/api/standings/overall');
      const next = await response.json() as Data & { error?: string };
      if (!response.ok) throw new Error(next.error || `Error ${response.status}`);
      setData(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar la tabla general');
    }
  }

  useEffect(() => { void load(); }, []);

  if (error) return <section className="card panel"><div className="alert alert--error">{error}</div></section>;
  if (!data) return <section className="card panel"><p>Cargando tabla general...</p></section>;

  const mine = data.standings.find((entry) => entry.userId === data.currentUserId) ?? null;

  if (data.finishedRounds === 0) {
    return <section className="card panel"><h1>Tabla general</h1><p>Todavia no hay fechas cerradas.</p></section>;
  }

  return (
    <div className="form-stack">
      <section className="card panel">
        <div className="panel-heading">
          <div><span className="eyebrow">TEMPORADA</span><h1>Tabla general</h1><p>Acumulado de todas las fechas finalizadas.</p></div>
          <button className="button button--ghost" onClick={() => void load()}>Actualizar</button>
        </div>
      </section>

      <div className="grid-two">
        <div className="card stat-card"><span>Fechas cerradas</span><strong>{data.finishedRounds}</strong></div>
        {mine && <div className="card stat-card"><span>Tu posicion</span><strong>#{mine.position}</strong></div>}
        {mine && <div className="card stat-card"><span>Tus puntos</span><strong>{mine.points}</strong></div>}
        {mine && <div className="card stat-card"><span>Promedio</span><strong>{mine.averagePoints}</strong></div>}
      </div>

      <section className="card panel panel--wide">
        <div className="panel-heading"><div><h2>Clasificacion acumulada</h2><p>Solo cuentan fechas ya cerradas.</p></div></div>
        <div className="user-list">
          {data.standings.map((entry) => (
            <div className="user-row" key={entry.userId}>
              <div className="avatar">{entry.position}</div>
              <div className="user-data">
                <strong>{entry.fullName}{entry.userId === data.currentUserId ? ' - Vos' : ''}</strong>
                <span>{entry.roundsPlayed} fechas | {entry.fulls} plenos | {entry.partials} parciales | {entry.errors} errores | {entry.extras} extras</span>
              </div>
              <div className="topbar-actions">
                <span className="user-chip">Prom. {entry.averagePoints}</span>
                <span className="user-chip">{entry.points} pts</span>
              </div>
            </div>
          ))}
        </div>
        <p>Desempate: puntos, plenos, parciales, menos errores y extras.</p>
      </section>

      {data.recentRounds.length > 0 && (
        <section className="card panel panel--wide">
          <div className="panel-heading"><div><h2>Tus ultimas fechas</h2><p>Resumen de rendimiento por fecha cerrada.</p></div></div>
          <div className="user-list">
            {data.recentRounds.map((round) => (
              <div className="user-row" key={round.id}>
                <div className="avatar">{round.points}</div>
                <div className="user-data">
                  <strong>{round.name}</strong>
                  <span>{formatDate(round.finishedAt)} | {round.fulls} plenos | {round.partials} parciales | {round.errors} errores | {round.extras} extras</span>
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

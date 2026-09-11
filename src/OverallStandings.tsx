import { useEffect, useState } from 'react';
import './overall-standings.css';

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

type StandingsData = {
  finishedRounds: number;
  currentUserId: string;
  standings: Standing[];
};

type ApiError = { error?: string };

async function api<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

export default function OverallStandings() {
  const [data, setData] = useState<StandingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setData(await api<StandingsData>('/api/standings/overall'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar la tabla general');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (loading) return <section className="card standings-empty"><p>Cargando tabla general…</p></section>;
  if (error) return <section className="card standings-empty"><div className="alert alert--error">{error}</div></section>;
  if (!data) return null;

  const mine = data.standings.find((entry) => entry.userId === data.currentUserId) ?? null;

  if (data.finishedRounds === 0) {
    return (
      <section className="card standings-empty">
        <span className="eyebrow">TABLA GENERAL</span>
        <h1>Todavía no hay fechas cerradas</h1>
        <p>La clasificación acumulada empieza a contar cuando finaliza la primera fecha.</p>
      </section>
    );
  }

  return (
    <div className="overall-standings">
      <section className="card overall-header">
        <div>
          <span className="eyebrow">TEMPORADA</span>
          <h1>Tabla general</h1>
          <p>Acumulado de todas las fechas finalizadas del Prode.</p>
        </div>
        <button className="button button--ghost" onClick={() => void load()}>Actualizar</button>
      </section>

      <div className="overall-summary">
        <div className="card overall-stat"><span>Fechas cerradas</span><strong>{data.finishedRounds}</strong></div>
        {mine && <div className="card overall-stat"><span>Tu posición</span><strong>#{mine.position}</strong></div>}
        {mine && <div className="card overall-stat"><span>Tus puntos</span><strong>{mine.points}</strong></div>}
        {mine && <div className="card overall-stat"><span>Promedio</span><strong>{mine.averagePoints}</strong></div>}
      </div>

      <section className="card overall-table-card">
        <div className="overall-table-wrap">
          <table className="overall-table">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Participante</th>
                <th>Pts.</th>
                <th>Plenos</th>
                <th>Parciales</th>
                <th>Errores</th>
                <th>Extras</th>
                <th>Fechas</th>
                <th>Prom.</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.map((entry) => (
                <tr key={entry.userId} className={entry.userId === data.currentUserId ? 'overall-table__me' : ''}>
                  <td><strong>#{entry.position}</strong></td>
                  <td>{entry.fullName}{entry.userId === data.currentUserId ? <small> vos</small> : null}</td>
                  <td><strong>{entry.points}</strong></td>
                  <td>{entry.fulls}</td>
                  <td>{entry.partials}</td>
                  <td>{entry.errors}</td>
                  <td>{entry.extras}</td>
                  <td>{entry.roundsPlayed}</td>
                  <td>{entry.averagePoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="overall-tiebreak">Desempate: puntos → plenos → parciales → menos errores → extras.</p>
      </section>
    </div>
  );
}

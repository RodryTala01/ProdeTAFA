import { useEffect, useState } from 'react';
import './round-ranking.css';

type RankingEntry = {
  position: number;
  userId: string;
  fullName: string;
  points: number;
  fulls: number;
  partials: number;
  errors: number;
  extras: number;
  provisional: boolean;
};

type ApiError = { error?: string };

type Props = {
  roundId: number;
  mode: 'admin' | 'participant';
  refreshToken?: number;
};

async function api<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

export default function RoundRanking({ roundId, mode, refreshToken = 0 }: Props) {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api<{ ranking: RankingEntry[] }>(`/api/${mode}/ranking/${roundId}`);
        if (active) setRanking(data.ranking);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'No se pudo cargar el ranking');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [roundId, mode, refreshToken]);

  return (
    <section className="card ranking-card">
      <div className="ranking-heading">
        <div>
          <span className="eyebrow">CLASIFICACIÓN</span>
          <h2>Ranking de la fecha</h2>
        </div>
        {ranking.some((entry) => entry.provisional) && <span className="ranking-provisional">En vivo</span>}
      </div>

      {loading ? <p className="ranking-empty">Cargando ranking…</p> : error ? (
        <div className="alert alert--error">{error}</div>
      ) : ranking.length === 0 ? (
        <p className="ranking-empty">Todavía no hay participantes con pronóstico enviado.</p>
      ) : (
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Participante</th>
                <th>Pts</th>
                <th>Plenos</th>
                <th>Parciales</th>
                <th>Errores</th>
                <th>Extras</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((entry) => (
                <tr key={entry.userId}>
                  <td><strong>{entry.position}</strong></td>
                  <td>
                    <strong>{entry.fullName}</strong>
                    {entry.provisional && <small> provisional</small>}
                  </td>
                  <td className="ranking-points">{entry.points}</td>
                  <td>{entry.fulls}</td>
                  <td>{entry.partials}</td>
                  <td>{entry.errors}</td>
                  <td>{entry.extras}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

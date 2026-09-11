import { useState } from 'react';
import './finished-predictions.css';

type Match = {
  id: number;
  matchType: 'NORMAL' | 'PENALTIES_ONLY';
  home: { id: string | null; name: string };
  away: { id: string | null; name: string };
};

type Prediction = {
  matchId: number;
  homeScore: number | null;
  awayScore: number | null;
  extraTeamId: string | null;
  points: number;
};

type Participant = {
  id: string;
  fullName: string;
  points: number;
  predictions: Prediction[];
};

type RevealData = {
  round: { id: number; name: string; finishedAt: string | null };
  matches: Match[];
  participants: Participant[];
};

type ApiError = { error?: string };

async function api<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  const data = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

function predictionLabel(match: Match, prediction: Prediction) {
  if (match.matchType === 'PENALTIES_ONLY') {
    if (prediction.extraTeamId === match.home.id) return match.home.name;
    if (prediction.extraTeamId === match.away.id) return match.away.name;
    return 'Sin pronóstico';
  }

  if (prediction.homeScore === null || prediction.awayScore === null) return 'Sin pronóstico';
  return `${prediction.homeScore} - ${prediction.awayScore}`;
}

export default function FinishedPredictions({ roundId }: { roundId: number }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<RevealData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || data || loading) return;

    setLoading(true);
    setError('');
    try {
      setData(await api<RevealData>(`/api/participant/reveal/${roundId}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los pronósticos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card reveal-card">
      <div className="reveal-heading">
        <div>
          <span className="eyebrow">PRONÓSTICOS FINALES</span>
          <h2>Qué jugó cada participante</h2>
          <p>Se habilita únicamente después del cierre de la fecha.</p>
        </div>
        <button type="button" className="button button--secondary" onClick={() => void toggle()}>
          {open ? 'Ocultar' : 'Ver pronósticos'}
        </button>
      </div>

      {open && (
        <div className="reveal-body">
          {loading && <p>Cargando pronósticos…</p>}
          {error && <div className="alert alert--error">{error}</div>}
          {data && data.participants.length === 0 && <p>No hubo envíos registrados en esta fecha.</p>}
          {data && data.participants.map((participant) => (
            <article className="reveal-participant" key={participant.id}>
              <div className="reveal-participant-heading">
                <strong>{participant.fullName}</strong>
                <span>{participant.points} pt{participant.points === 1 ? '' : 's'}</span>
              </div>
              <div className="reveal-prediction-list">
                {data.matches.map((match) => {
                  const prediction = participant.predictions.find((item) => item.matchId === match.id) ?? {
                    matchId: match.id,
                    homeScore: null,
                    awayScore: null,
                    extraTeamId: null,
                    points: 0,
                  };
                  return (
                    <div className="reveal-prediction" key={match.id}>
                      <span>{match.home.name} – {match.away.name}</span>
                      <strong>{predictionLabel(match, prediction)}</strong>
                      <small>{prediction.points} pt{prediction.points === 1 ? '' : 's'}</small>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

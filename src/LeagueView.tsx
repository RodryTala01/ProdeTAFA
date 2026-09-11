import { useEffect, useState } from 'react';

type LeagueRound = {
  slot: number;
  id: number;
  name: string;
  status: string;
  matchCount: number;
  finalizedMatches: number;
};

type Standing = {
  position: number;
  userId: string;
  fullName: string;
  roundsPlayed: number;
  points: number;
  fulls: number;
  partials: number;
  errors: number;
  extras: number;
};

type Season = {
  id: number;
  name: string;
  status: 'open' | 'finished';
  roundCount: number;
  totalMatches: number;
  finalizedMatches: number;
  currentUserId: string | null;
  rounds: LeagueRound[];
  standings: Standing[];
};

type SeasonOption = {
  id: number;
  name: string;
  status: string;
};

type ResponseData = {
  season: Season | null;
  seasons: SeasonOption[];
  error?: string;
};

export default function LeagueView() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(nextSeasonId = seasonId) {
    setLoading(true);
    setError('');
    try {
      const suffix = nextSeasonId ? `?seasonId=${nextSeasonId}` : '';
      const response = await fetch(`/api/league${suffix}`);
      const next = await response.json() as ResponseData;
      if (!response.ok) throw new Error(next.error || `Error ${response.status}`);
      setData(next);
      if (next.season) setSeasonId(next.season.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar la Liga');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(null); }, []);

  if (loading && !data) return <section className="card panel"><p>Cargando Liga...</p></section>;
  if (error && !data) return <section className="card panel"><div className="alert alert--error">{error}</div></section>;
  if (!data?.season) {
    return <section className="card panel"><span className="eyebrow">LIGA</span><h1>Todavía no hay una temporada</h1><p>Cuando el administrador cree la Liga, la tabla va a aparecer acá.</p></section>;
  }

  const season = data.season;
  const mine = season.standings.find((entry) => entry.userId === season.currentUserId) ?? null;

  return (
    <div className="form-stack">
      <section className="card panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">LIGA</span>
            <h1>{season.name}</h1>
            <p>La tabla se actualiza únicamente con partidos que ya tienen resultado definitivo.</p>
          </div>
          <button className="button button--ghost" onClick={() => void load()}>Actualizar</button>
        </div>

        {data.seasons.length > 1 && (
          <label className="field">
            <span>Temporada</span>
            <select value={season.id} onChange={(event) => { const id = Number(event.target.value); setSeasonId(id); void load(id); }}>
              {data.seasons.map((item) => <option key={item.id} value={item.id}>{item.name}{item.status === 'finished' ? ' - finalizada' : ''}</option>)}
            </select>
          </label>
        )}
      </section>

      <div className="grid-two">
        <div className="card stat-card"><span>Fechas</span><strong>{season.roundCount}/5</strong></div>
        <div className="card stat-card"><span>Partidos definidos</span><strong>{season.finalizedMatches}/{season.totalMatches || 0}</strong></div>
        {mine && <div className="card stat-card"><span>Tu posición</span><strong>#{mine.position}</strong></div>}
        {mine && <div className="card stat-card"><span>Tus puntos</span><strong>{mine.points}</strong></div>}
      </div>

      <section className="card panel panel--wide">
        <div className="panel-heading"><div><h2>Tabla de la temporada</h2><p>Desempate: puntos, plenos, parciales, menos errores y extras.</p></div></div>
        <div className="user-list">
          {season.standings.map((entry) => (
            <div className="user-row" key={entry.userId}>
              <div className="avatar">{entry.position}</div>
              <div className="user-data">
                <strong>{entry.fullName}{entry.userId === season.currentUserId ? ' · Vos' : ''}</strong>
                <span>{entry.roundsPlayed}/5 fechas jugadas · {entry.fulls} plenos · {entry.partials} parciales · {entry.errors} errores · {entry.extras} extras</span>
              </div>
              <span className="user-chip">{entry.points} pts</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card panel panel--wide">
        <div className="panel-heading"><div><h2>Las 5 fechas</h2><p>Progreso de la Liga.</p></div></div>
        <div className="user-list">
          {[1, 2, 3, 4, 5].map((slot) => {
            const round = season.rounds.find((item) => item.slot === slot);
            return (
              <div className="user-row" key={slot}>
                <div className="avatar">{slot}</div>
                <div className="user-data">
                  <strong>{round?.name ?? `Fecha ${slot} sin vincular`}</strong>
                  <span>{round ? `${round.finalizedMatches}/${round.matchCount} partidos definidos · ${round.status === 'finished' ? 'Cerrada' : 'En curso'}` : 'Pendiente de configuración'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

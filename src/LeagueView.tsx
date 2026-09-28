import { Fragment, useEffect, useState } from 'react';

type RoundBreakdown = {
  roundId: number;
  sequence: number;
  name: string;
  status: string;
  submitted: boolean;
  points: number;
  fulls: number;
  partials: number;
  errors: number;
  extras: number;
  provisional: boolean;
};

type EngineStanding = {
  position: number;
  userId: string;
  fullName: string;
  roundsPlayed: number;
  points: number;
  fulls: number;
  partials: number;
  errors: number;
  extras: number;
  provisional: boolean;
  rounds: RoundBreakdown[];
};

type EngineLeagueData = {
  currentUserId: string;
  season: {
    id: number;
    seasonNumber: number;
    name: string;
    status: string;
  };
  competition: {
    id: number;
    code: 'LIGA_A' | 'LIGA_B';
    displayName: string;
    status: string;
  };
  division: {
    id: number;
    code: 'A' | 'B';
    name: string;
  };
  linkedRounds: Array<{
    roundId: number;
    sequence: number;
    name: string;
    status: string;
    category: string;
    finishedAt: string | null;
  }>;
  provisional: boolean;
  standings: EngineStanding[];
};

type CurrentCompetitionContext = {
  season: null | {
    seasonNumber: number;
    division: null | { code: string };
  };
};

type LegacyLeagueRound = {
  slot: number;
  id: number;
  name: string;
  status: string;
  matchCount: number;
  finalizedMatches: number;
};

type LegacyStanding = {
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

type LegacySeason = {
  id: number;
  name: string;
  status: 'open' | 'finished';
  roundCount: number;
  totalMatches: number;
  finalizedMatches: number;
  currentUserId: string | null;
  rounds: LegacyLeagueRound[];
  standings: LegacyStanding[];
};

type LegacyResponse = {
  season: LegacySeason | null;
  seasons: Array<{ id: number; name: string; status: string }>;
  error?: string;
};

type Zone = {
  className: string;
  label: string;
};

function zoneFor(position: number, total: number, division: 'A' | 'B'): Zone | null {
  if (division === 'B') {
    if (position === 1) return { className: 'league-row--promotion', label: 'Ascenso' };
    if (position === 2 || position === 3) return { className: 'league-row--playoff', label: 'Promoción' };
    return null;
  }

  if (position === 1) return { className: 'league-row--champion', label: 'Campeón' };

  const directRelegationStart = Math.max(1, total - 1);
  const playoffStart = Math.max(1, total - 3);
  const playoffEnd = Math.max(1, total - 2);

  if (position >= directRelegationStart) {
    return { className: 'league-row--relegation', label: 'Descenso' };
  }
  if (position >= playoffStart && position <= playoffEnd) {
    return { className: 'league-row--playoff', label: 'Promoción' };
  }
  if (position >= 2 && position <= Math.min(7, total)) {
    return { className: 'league-row--champions', label: 'Copa Campeones' };
  }
  return null;
}

function LegacyLeagueView({ data, reload }: { data: LegacyResponse; reload: () => void }) {
  if (!data.season) {
    return <section className="card panel"><span className="eyebrow">LIGA</span><h1>Todavía no hay una temporada</h1><p>Cuando el administrador cree la Liga, la tabla va a aparecer acá.</p></section>;
  }

  const season = data.season;
  const mine = season.standings.find((entry) => entry.userId === season.currentUserId) ?? null;

  return (
    <div className="form-stack">
      <section className="card panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">LIGA ACTUAL · COMPATIBILIDAD</span>
            <h1>{season.name}</h1>
            <p>Esta vista se mantiene hasta que la Temporada 32 del motor nuevo quede activa.</p>
          </div>
          <button className="button button--ghost" onClick={reload}>Actualizar</button>
        </div>
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
    </div>
  );
}

export default function LeagueView() {
  const [engineData, setEngineData] = useState<EngineLeagueData | null>(null);
  const [legacyData, setLegacyData] = useState<LegacyResponse | null>(null);
  const [leagueCode, setLeagueCode] = useState<'LIGA_A' | 'LIGA_B'>('LIGA_A');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadLegacy() {
    const response = await fetch('/api/league');
    const next = await response.json() as LegacyResponse;
    if (!response.ok) throw new Error(next.error || `Error ${response.status}`);
    setLegacyData(next);
    setEngineData(null);
  }

  async function loadEngine(nextLeagueCode: 'LIGA_A' | 'LIGA_B') {
    const response = await fetch(`/api/competition-engine/leagues/${nextLeagueCode}/standings`);
    const next = await response.json() as EngineLeagueData & { error?: string };
    if (!response.ok) throw new Error(next.error || `Error ${response.status}`);
    setEngineData(next);
    setLegacyData(null);
    setLeagueCode(nextLeagueCode);
  }

  async function loadInitial() {
    setLoading(true);
    setError('');
    try {
      const contextResponse = await fetch('/api/competition-engine/current');
      if (contextResponse.ok) {
        const context = await contextResponse.json() as CurrentCompetitionContext;
        if (context.season) {
          const preferred = context.season.division?.code === 'B' ? 'LIGA_B' : 'LIGA_A';
          await loadEngine(preferred);
          return;
        }
      }
      await loadLegacy();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar la Liga');
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      if (engineData) await loadEngine(leagueCode);
      else await loadLegacy();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo actualizar la Liga');
    } finally {
      setLoading(false);
    }
  }

  async function changeLeague(nextLeagueCode: 'LIGA_A' | 'LIGA_B') {
    if (nextLeagueCode === leagueCode && engineData) return;
    setLoading(true);
    setError('');
    setExpandedUserId(null);
    try {
      await loadEngine(nextLeagueCode);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar esa división');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInitial();
    const timer = window.setInterval(() => { void refresh(); }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading && !engineData && !legacyData) return <section className="card panel"><p>Cargando Liga...</p></section>;
  if (error && !engineData && !legacyData) return <section className="card panel"><div className="alert alert--error">{error}</div></section>;
  if (legacyData) return <LegacyLeagueView data={legacyData} reload={() => void refresh()} />;
  if (!engineData) return <section className="card panel"><div className="alert alert--error">No se pudo determinar la Liga activa.</div></section>;

  const data = engineData;
  const mine = data.standings.find((entry) => entry.userId === data.currentUserId) ?? null;
  const totalParticipants = data.standings.length;

  return (
    <div className="form-stack">
      <section className="card panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">TEMPORADA {data.season.seasonNumber}</span>
            <h1>{data.competition.displayName}</h1>
            <p>La misma Fecha puede puntuar en Liga A y Liga B. Sólo cuentan pronósticos oficialmente enviados.</p>
          </div>
          <button className="button button--ghost" disabled={loading} onClick={() => void refresh()}>Actualizar</button>
        </div>

        <div className="league-switch" aria-label="División">
          <button className={`button ${leagueCode === 'LIGA_A' ? 'button--primary' : 'button--ghost'}`} onClick={() => void changeLeague('LIGA_A')}>Liga A</button>
          <button className={`button ${leagueCode === 'LIGA_B' ? 'button--primary' : 'button--ghost'}`} onClick={() => void changeLeague('LIGA_B')}>Liga B</button>
        </div>

        {error && <div className="alert alert--error">{error}</div>}
        {data.provisional && <div className="alert league-provisional">Tabla provisional: todavía hay resultados o Fechas sin cerrar.</div>}
      </section>

      <div className="grid-two">
        <div className="card stat-card"><span>Fechas vinculadas</span><strong>{data.linkedRounds.length}/5</strong></div>
        <div className="card stat-card"><span>Participantes</span><strong>{totalParticipants}</strong></div>
        {mine && <div className="card stat-card"><span>Tu posición</span><strong>#{mine.position}</strong></div>}
        {mine && <div className="card stat-card"><span>Tus puntos</span><strong>{mine.points}</strong></div>}
      </div>

      <section className="card panel panel--wide">
        <div className="panel-heading">
          <div>
            <h2>Tabla {data.division.name}</h2>
            <p>Tocá un participante para ver su desglose por Fecha. Desempate: puntos, plenos, parciales, menos errores y extras.</p>
          </div>
        </div>

        <div className="league-legend">
          {data.division.code === 'A' ? (
            <>
              <span className="league-legend__item league-legend__item--champion">Campeón</span>
              <span className="league-legend__item league-legend__item--champions">Copa Campeones</span>
              <span className="league-legend__item league-legend__item--playoff">Promoción</span>
              <span className="league-legend__item league-legend__item--relegation">Descenso</span>
            </>
          ) : (
            <>
              <span className="league-legend__item league-legend__item--promotion">Ascenso</span>
              <span className="league-legend__item league-legend__item--playoff">Promoción</span>
            </>
          )}
        </div>

        <div className="user-list">
          {data.standings.map((entry) => {
            const zone = zoneFor(entry.position, totalParticipants, data.division.code);
            const expanded = expandedUserId === entry.userId;
            return (
              <Fragment key={entry.userId}>
                <div
                  className={`user-row league-row ${zone?.className ?? ''} ${entry.userId === data.currentUserId ? 'league-row--mine' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expanded}
                  onClick={() => setExpandedUserId(expanded ? null : entry.userId)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setExpandedUserId(expanded ? null : entry.userId);
                    }
                  }}
                >
                  <div className="avatar">{entry.position}</div>
                  <div className="user-data">
                    <strong>{entry.fullName}{entry.userId === data.currentUserId ? ' · Vos' : ''}</strong>
                    <span>{entry.roundsPlayed}/5 fechas · {entry.fulls} plenos · {entry.partials} parciales · {entry.errors} errores · {entry.extras} extras{entry.provisional ? ' · Provisional' : ''}</span>
                  </div>
                  <div className="league-row__right">
                    {zone && <span className="league-zone-badge">{zone.label}</span>}
                    <span className="user-chip league-points">{entry.points} pts</span>
                  </div>
                </div>

                {expanded && (
                  <div className="league-breakdown">
                    {[1, 2, 3, 4, 5].map((sequence) => {
                      const round = entry.rounds.find((item) => item.sequence === sequence);
                      return (
                        <div className="league-breakdown__round" key={sequence}>
                          <div className="avatar">{sequence}</div>
                          <div className="user-data">
                            <strong>{round?.name ?? `Fecha ${sequence} sin vincular`}</strong>
                            <span>
                              {!round
                                ? 'Pendiente de configuración'
                                : !round.submitted
                                  ? 'Sin pronóstico oficial enviado'
                                  : `${round.points} pts · ${round.fulls} plenos · ${round.partials} parciales · ${round.errors} errores · ${round.extras} extras${round.provisional ? ' · Provisional' : ''}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </section>

      <section className="card panel panel--wide">
        <div className="panel-heading"><div><h2>Las 5 fechas</h2><p>Una Fecha vinculada puede ser compartida por ambas divisiones.</p></div></div>
        <div className="user-list">
          {[1, 2, 3, 4, 5].map((sequence) => {
            const round = data.linkedRounds.find((item) => item.sequence === sequence);
            return (
              <div className="user-row" key={sequence}>
                <div className="avatar">{sequence}</div>
                <div className="user-data">
                  <strong>{round?.name ?? `Fecha ${sequence} sin vincular`}</strong>
                  <span>{round ? `${round.status === 'finished' ? 'Cerrada' : 'En curso'} · ${round.category}` : 'Pendiente de configuración'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

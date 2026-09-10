import { FormEvent, useEffect, useMemo, useState } from 'react';
import RoundRanking from './RoundRanking';
import './admin-rounds.css';

type RoundSummary = { id: number; name: string; status: string; matchCount: number };
type TeamData = { id: string | null; name: string; logoUrl: string | null };
type StoredMatch = {
  id: number;
  providerFixtureId: string;
  competitionName: string | null;
  competitionLogoUrl: string | null;
  kickoffAt: string;
  status: string;
  matchType: 'NORMAL' | 'PENALTIES_ONLY';
  home: TeamData;
  away: TeamData;
  goals: { home: number | null; away: number | null };
};
type RoundDetail = RoundSummary & { matches: StoredMatch[] };
type Fixture = {
  providerFixtureId: string;
  kickoffAt: string;
  status: string;
  statusLong: string;
  elapsedMinutes: number | null;
  competition: { id: string; name: string; country: string; logoUrl: string | null; round: string | null };
  home: { id: string; name: string; logoUrl: string | null };
  away: { id: string; name: string; logoUrl: string | null };
  goals: { home: number | null; away: number | null };
};
type ApiError = { error?: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  const data = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

function localDateInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function addDaysToInput(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateInputValue(date);
}

function formatKickoff(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function Team({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <div className="fixture-team">
      {logoUrl ? <img src={logoUrl} alt="" /> : <span className="team-fallback">⚽</span>}
      <strong>{name}</strong>
    </div>
  );
}

export default function AdminRounds() {
  const today = localDateInputValue();
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [selected, setSelected] = useState<RoundDetail | null>(null);
  const [newRoundName, setNewRoundName] = useState('');
  const [searchFrom, setSearchFrom] = useState(today);
  const [searchTo, setSearchTo] = useState(addDaysToInput(today, 6));
  const [searchText, setSearchText] = useState('');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [rankingRefresh, setRankingRefresh] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadRound(id: number) {
    const data = await api<{ round: RoundDetail }>(`/api/admin/rounds/${id}`);
    setSelected({ ...data.round, matchCount: data.round.matches.length });
  }

  async function loadRounds(selectId?: number) {
    const data = await api<{ rounds: RoundSummary[] }>('/api/admin/rounds');
    setRounds(data.rounds);
    const id = selectId ?? selected?.id;
    if (id) await loadRound(id);
  }

  useEffect(() => {
    void loadRounds().catch((caught) => setError(caught instanceof Error ? caught.message : 'No se pudieron cargar las fechas'));
  }, []);

  async function createRound(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const data = await api<{ round: RoundSummary }>('/api/admin/rounds', {
        method: 'POST', body: JSON.stringify({ name: newRoundName }),
      });
      setNewRoundName('');
      setSuccess(`${data.round.name} creada.`);
      await loadRounds(data.round.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear la fecha');
    } finally { setLoading(false); }
  }

  async function publishRound() {
    if (!selected) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await api<{ ok: true }>(`/api/admin/publish-round/${selected.id}`, { method: 'PUT', body: '{}' });
      setSuccess(`${selected.name} publicada. Los participantes ya pueden pronosticar.`);
      await loadRounds(selected.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo publicar la fecha');
    } finally { setLoading(false); }
  }

  async function syncResults() {
    if (!selected) return;
    setSyncing(true); setError(''); setSuccess('');
    try {
      const data = await api<{ updated: number; finalized: number; calculated: number; requestCount: number }>(
        `/api/admin/sync-round/${selected.id}`,
        { method: 'POST', body: '{}' },
      );
      setSuccess(`Resultados actualizados: ${data.updated} partidos, ${data.finalized} finalizados y ${data.calculated} pronósticos recalculados. Se usaron ${data.requestCount} consulta${data.requestCount === 1 ? '' : 's'} a API-Football.`);
      setRankingRefresh((value) => value + 1);
      await loadRounds(selected.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron actualizar los resultados');
    } finally { setSyncing(false); }
  }

  async function finishRound() {
    if (!selected) return;
    setClosing(true); setError(''); setSuccess('');
    try {
      await api<{ ok: true }>(`/api/admin/finish-round/${selected.id}`, { method: 'PUT', body: '{}' });
      setSuccess(`${selected.name} cerrada. El ranking final ya está visible para los participantes.`);
      setRankingRefresh((value) => value + 1);
      await loadRounds(selected.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cerrar la fecha');
    } finally { setClosing(false); }
  }

  async function searchMatches(event: FormEvent) {
    event.preventDefault();
    setSearching(true); setError(''); setSuccess('');
    try {
      const query = new URLSearchParams({ from: searchFrom, to: searchTo });
      const data = await api<{ fixtures: Fixture[]; requestCount: number }>(`/api/admin/fixtures?${query.toString()}`);
      setFixtures(data.fixtures);
      setSuccess(data.fixtures.length
        ? `${data.fixtures.length} partidos encontrados. Se usaron ${data.requestCount} consultas a API-Football.`
        : `No se encontraron partidos en ese rango. Se usaron ${data.requestCount} consultas.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron buscar partidos');
    } finally { setSearching(false); }
  }

  function changeSearchFrom(value: string) {
    setSearchFrom(value);
    if (value) setSearchTo(addDaysToInput(value, 6));
  }

  async function addFixture(fixture: Fixture, matchType: 'NORMAL' | 'PENALTIES_ONLY') {
    if (!selected) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/rounds/${selected.id}/matches`, {
        method: 'POST', body: JSON.stringify({ fixture, matchType }),
      });
      setSuccess(`${fixture.home.name} - ${fixture.away.name} agregado.`);
      await loadRounds(selected.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo agregar el partido');
    } finally { setLoading(false); }
  }

  async function removeMatch(match: StoredMatch) {
    if (!selected) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/rounds/${selected.id}/matches/${match.id}`, { method: 'DELETE' });
      setSuccess('Partido quitado de la fecha.');
      await loadRounds(selected.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo quitar el partido');
    } finally { setLoading(false); }
  }

  const filteredFixtures = useMemo(() => {
    const needle = searchText.trim().toLocaleLowerCase('es');
    if (!needle) return fixtures;
    return fixtures.filter((fixture) =>
      [fixture.home.name, fixture.away.name, fixture.competition.name, fixture.competition.country]
        .join(' ').toLocaleLowerCase('es').includes(needle),
    );
  }, [fixtures, searchText]);

  const addedFixtureIds = new Set(selected?.matches.map((match) => match.providerFixtureId) ?? []);
  const isDraft = selected?.status === 'draft';
  const isOpen = selected?.status === 'open';
  const isFinished = selected?.status === 'finished';
  const statusLabel = isDraft ? 'Borrador' : isOpen ? 'Publicada' : 'Cerrada';

  return (
    <div className="rounds-layout">
      <aside className="card rounds-sidebar">
        <div className="rounds-title-row">
          <div><span className="eyebrow">FECHAS</span><h2>Fechas del Prode</h2></div>
          <span className="round-count">{rounds.length}</span>
        </div>
        <form className="round-create" onSubmit={createRound}>
          <input value={newRoundName} onChange={(event) => setNewRoundName(event.target.value)} placeholder="Ej: Fecha 1" required />
          <button className="button button--primary" disabled={loading}>Crear</button>
        </form>
        <div className="round-list">
          {rounds.map((round) => (
            <button type="button" className={`round-item ${selected?.id === round.id ? 'round-item--active' : ''}`} key={round.id} onClick={() => void loadRound(round.id)}>
              <span><strong>{round.name}</strong><small>{round.status === 'draft' ? 'Borrador' : round.status === 'open' ? 'Publicada' : 'Cerrada'}</small></span>
              <b>{round.matchCount}/12</b>
            </button>
          ))}
          {rounds.length === 0 && <p className="empty-copy">Todavía no creaste ninguna fecha.</p>}
        </div>
      </aside>

      <section className="round-main">
        {error && <div className="alert alert--error">{error}</div>}
        {success && <div className="alert alert--success">{success}</div>}

        {!selected ? (
          <section className="card empty-round"><span className="empty-icon">⚽</span><h2>Creá o elegí una fecha</h2><p>Después vas a poder buscar los partidos reales y agregarlos.</p></section>
        ) : (
          <>
            <section className="card round-header-card">
              <div>
                <span className="eyebrow">FECHA SELECCIONADA</span>
                <h1>{selected.name}</h1>
                <p>{selected.matches.length} de 12 partidos cargados · {statusLabel}.</p>
              </div>
              <div className="topbar-actions">
                {isDraft && selected.matches.length === 12 && (
                  <button className="button button--primary" disabled={loading} onClick={() => void publishRound()}>Publicar fecha</button>
                )}
                {!isDraft && (
                  <button className="button button--secondary" disabled={syncing} onClick={() => void syncResults()}>
                    {syncing ? 'Actualizando…' : 'Actualizar resultados'}
                  </button>
                )}
                {isOpen && (
                  <button className="button button--primary" disabled={closing || syncing} onClick={() => void finishRound()}>
                    {closing ? 'Cerrando…' : 'Cerrar fecha'}
                  </button>
                )}
                {isOpen && <span className="added-badge">✓ Visible para participantes</span>}
                {isFinished && <span className="added-badge">✓ Fecha cerrada</span>}
                <div className="round-progress"><strong>{selected.matches.length}</strong><span>/ 12</span></div>
              </div>
            </section>

            {selected.matches.length > 0 && (
              <section className="card selected-matches">
                <div className="section-heading"><h2>Partidos agregados</h2><span>{isDraft ? 'Se guardan en D1' : 'Resultados desde API-Football'}</span></div>
                <div className="stored-match-list">
                  {selected.matches.map((match) => (
                    <div className="stored-match" key={match.id}>
                      <div className="stored-match-main">
                        <small>{match.competitionName || 'Competencia'} · {formatKickoff(match.kickoffAt)} · {match.status}</small>
                        <div className="stored-teams"><Team name={match.home.name} logoUrl={match.home.logoUrl} /><span>vs</span><Team name={match.away.name} logoUrl={match.away.logoUrl} /></div>
                        {match.goals.home !== null && match.goals.away !== null && <span className="penalty-badge">Resultado {match.goals.home} - {match.goals.away}</span>}
                        {match.matchType === 'PENALTIES_ONLY' && <span className="penalty-badge">PENALES</span>}
                      </div>
                      {isDraft && <button className="button button--ghost button--danger" disabled={loading} onClick={() => void removeMatch(match)}>Quitar</button>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!isDraft && <RoundRanking roundId={selected.id} mode="admin" refreshToken={rankingRefresh} />}

            {isDraft && selected.matches.length < 12 && (
              <section className="card fixture-search-card">
                <div className="section-heading"><div><h2>Buscar partidos reales</h2><p>Buscá hasta 7 días. Usamos una consulta diaria y unimos los resultados.</p></div></div>
                <form className="fixture-search-form" onSubmit={searchMatches}>
                  <label><span>Desde</span><input type="date" value={searchFrom} onChange={(event) => changeSearchFrom(event.target.value)} required /></label>
                  <label><span>Hasta</span><input type="date" value={searchTo} onChange={(event) => setSearchTo(event.target.value)} required /></label>
                  <button className="button button--primary" disabled={searching}>{searching ? 'Buscando…' : 'Buscar semana'}</button>
                </form>
                {fixtures.length > 0 && (
                  <>
                    <input className="fixture-filter" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Filtrar por equipo, liga o país…" />
                    <p className="fixture-results-count">{filteredFixtures.length} de {fixtures.length} partidos · filtro local</p>
                    <div className="fixture-list">
                      {filteredFixtures.map((fixture) => {
                        const alreadyAdded = addedFixtureIds.has(fixture.providerFixtureId);
                        return (
                          <article className="fixture-card" key={fixture.providerFixtureId}>
                            <div className="fixture-meta">
                              {fixture.competition.logoUrl && <img src={fixture.competition.logoUrl} alt="" />}
                              <span><strong>{fixture.competition.name}</strong><small>{fixture.competition.country}{fixture.competition.round ? ` · ${fixture.competition.round}` : ''}</small></span>
                              <time>{formatKickoff(fixture.kickoffAt)}</time>
                            </div>
                            <div className="fixture-versus"><Team name={fixture.home.name} logoUrl={fixture.home.logoUrl} /><span>VS</span><Team name={fixture.away.name} logoUrl={fixture.away.logoUrl} /></div>
                            <div className="fixture-actions">
                              {alreadyAdded ? <span className="added-badge">✓ Ya agregado</span> : (
                                <><button className="button button--primary" disabled={loading} onClick={() => void addFixture(fixture, 'NORMAL')}>Agregar</button><button className="button button--secondary" disabled={loading} onClick={() => void addFixture(fixture, 'PENALTIES_ONLY')}>Agregar como PENALES</button></>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </section>
    </div>
  );
}

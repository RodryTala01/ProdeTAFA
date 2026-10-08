import {safeAdminError} from './safe-admin-error';
import {TeamShield,CompetitionImage} from './AssetImage';
import { Icon } from './ui';
import { AdminConfirm, AdminMenu } from './AdminUI';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import RoundRanking from './RoundRanking';
import AdminCorrections from './AdminCorrections';
import PredictionHistory from './PredictionHistory';
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
  if (!response.ok) throw new Error(safeAdminError(data?.error));
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
    timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function Team({ name, logoUrl, teamId }: { name: string; logoUrl: string | null; teamId?:string|null }) {
  return (
    <div className="fixture-team">
      <TeamShield name={name} teamId={teamId} logoUrl={logoUrl} size="sm" decorative/>
      <strong title={name}>{name}</strong>
    </div>
  );
}

export default function AdminRounds() {
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: string; run: () => Promise<void> } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const detailVersion = useRef(0);
  const searchStart = useRef<HTMLInputElement>(null);
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
    const version = ++detailVersion.current;
    setDetailLoading(true);
    try {
      const data = await api<{ round: RoundDetail }>(`/api/admin/rounds/${id}`);
      if (version === detailVersion.current) setSelected({ ...data.round, matches: [...data.round.matches].sort((a,b) => Date.parse(a.kickoffAt)-Date.parse(b.kickoffAt) || a.id-b.id), matchCount: data.round.matches.length });
    } finally { if (version === detailVersion.current) setDetailLoading(false); }
  }

  async function loadRounds(selectId?: number) {
    const data = await api<{ rounds: RoundSummary[] }>('/api/admin/rounds');
    const ordered = [...data.rounds].sort((a,b) => b.id-a.id);
    setRounds(ordered);
    const id = selectId ?? selected?.id ?? ordered.find(item => item.status === 'open')?.id ?? ordered[0]?.id;
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
      requestAnimationFrame(() => searchStart.current?.focus());
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
      setFixtures([...data.fixtures].sort((a,b) => Date.parse(a.kickoffAt)-Date.parse(b.kickoffAt)));
      setHasSearched(true);
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
  const statusLabel = isDraft ? 'Borrador' : isOpen ? 'Abierta' : 'Cerrada';

  const busy = loading || syncing || closing || detailLoading;
  return (
    <div className="rounds-layout">
      {confirm && <AdminConfirm title={confirm.title} action={confirm.action} busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => { const action = confirm.run; setConfirm(null); void action(); }}>{confirm.message}</AdminConfirm>}
      <aside className="card rounds-sidebar">
        <div className="rounds-title-row">
          <div><span className="eyebrow">FECHAS</span><h2>Fechas del Prode</h2></div>
          <span className="round-count">{rounds.length}</span>
        </div>
        <form className="round-create" onSubmit={createRound}>
          <input value={newRoundName} onChange={(event) => setNewRoundName(event.target.value)} placeholder="Ej: Fecha 1" aria-label="Nombre de la nueva Fecha" required />
          <button className="button button--primary" disabled={busy}>Crear Fecha</button>
        </form>
        <div className="round-list">
          {rounds.map((round) => (
            <button type="button" className={`round-item ${selected?.id === round.id ? 'round-item--active' : ''}`} key={round.id} aria-current={selected?.id === round.id ? 'true' : undefined} disabled={busy} onClick={() => { setError(''); setSuccess(''); void loadRound(round.id).catch(() => setError('No pudimos abrir la Fecha. Reintentá.')); }}>
              <span><strong>{round.name}</strong><small>{round.status === 'draft' ? 'Borrador' : round.status === 'open' ? 'Abierta' : 'Cerrada'}</small></span>
              <b>{round.matchCount}/12</b>
            </button>
          ))}
          {rounds.length === 0 && <p className="empty-copy">Todavía no creaste ninguna fecha.</p>}
        </div>
      </aside>

      <section className="round-main">
        {error && <div role="alert" className="alert alert--error">{error}</div>}
        {success && <div role="status" className="alert alert--success">{success}</div>}

        {detailLoading && <p role="status">Cargando Fecha…</p>}
        {!selected ? (
          <section className="card empty-round"><Icon name="calendar" /><h2>Creá o elegí una fecha</h2><p>Después vas a poder buscar los partidos reales y agregarlos.</p></section>
        ) : (
          <>
            <section className="card round-header-card">
              <div>
                <span className="eyebrow">FECHA SELECCIONADA</span>
                <h1>{selected.name}</h1>
                <p>{statusLabel} · Horarios de Argentina</p>{isDraft && selected.matches.length < 12 && <p>Faltan {12-selected.matches.length} partidos para completar la Fecha.</p>}
              </div>
              <div className="topbar-actions">
                {isDraft && (
                  <button className="button button--primary" disabled={busy || selected.matches.length !== 12 || rounds.some(round => round.status === 'open' && round.id !== selected.id)} onClick={() => setConfirm({ title: `¿Publicar ${selected.name}?`, message: 'Los participantes podrán pronosticar. Después de publicar no se pueden agregar ni quitar partidos.', action: 'Publicar', run: publishRound })}>Publicar</button>
                )}
                {!isDraft && (
                  <button className="button button--secondary" disabled={busy} onClick={() => void syncResults()}>
                    {syncing ? 'Actualizando…' : 'Actualizar resultados'}
                  </button>
                )}
                {isOpen && (
                  <button className="button button--primary" disabled={busy} onClick={() => setConfirm({ title: `¿Cerrar ${selected.name}?`, message: 'La Fecha quedará finalizada y sus pronósticos y ranking serán visibles para todos. Revisá los resultados antes de continuar.', action: 'Cerrar Fecha', run: finishRound })}>
                    {closing ? 'Cerrando…' : 'Cerrar Fecha'}
                  </button>
                )}
                {isOpen && <span className="added-badge">✓ Visible para participantes</span>}
                {isFinished && <span className="added-badge">✓ Fecha cerrada</span>}
                <div className={`round-progress ${selected.matches.length === 12 ? 'round-progress--complete' : ''}`} aria-label={`${selected.matches.length} de 12 partidos`}><small>PARTIDOS</small><strong>{selected.matches.length}</strong><span>/ 12</span></div>
              </div>
            </section>

            {isDraft && rounds.some(round => round.status === 'open' && round.id !== selected.id) && <p className="alert">Ya hay una Fecha abierta. Cerrala antes de publicar otra.</p>}
            {isDraft && selected.matches.length < 12 && (
              <section className="card fixture-search-card">
                <div className="section-heading"><div><h2>Buscar partidos reales</h2><p>Elegí hasta 7 días. Los próximos partidos aparecen primero.</p></div></div>
                <form className="fixture-search-form" onSubmit={searchMatches}>
                  <label><span>Desde</span><input ref={searchStart} type="date" value={searchFrom} onChange={(event) => changeSearchFrom(event.target.value)} required /></label>
                  <label><span>Hasta</span><input type="date" value={searchTo} onChange={(event) => setSearchTo(event.target.value)} required /></label>
                  <button className="button button--primary" disabled={searching}>{searching ? 'Buscando…' : 'Buscar semana'}</button>
                </form>
                {hasSearched && !fixtures.length && <p>No hay partidos en este rango. Probá otras fechas.</p>}
                {fixtures.length > 0 && (
                  <>
                    <input className="fixture-filter" value={searchText} onChange={(event) => setSearchText(event.target.value)} aria-label="Filtrar partidos" placeholder="Equipo, liga o país…" />
                    <p className="fixture-results-count">{filteredFixtures.length} de {fixtures.length} partidos</p>
                    <div className="fixture-list">
                      {filteredFixtures.map((fixture) => {
                        const alreadyAdded = addedFixtureIds.has(fixture.providerFixtureId);
                        return (
                          <article className="fixture-card" key={fixture.providerFixtureId}>
                            <div className="fixture-meta">
                              <CompetitionImage name={fixture.competition.name} logoUrl={fixture.competition.logoUrl} size="xs" decorative/>
                              <span><strong>{fixture.competition.name}</strong><small>{fixture.competition.country}{fixture.competition.round ? ` · ${fixture.competition.round}` : ''}</small></span>
                              <time dateTime={fixture.kickoffAt}>{formatKickoff(fixture.kickoffAt)}</time>
                            </div>
                            <div className="fixture-versus"><Team name={fixture.home.name} teamId={fixture.home.id} logoUrl={fixture.home.logoUrl} /><span>VS</span><Team name={fixture.away.name} teamId={fixture.away.id} logoUrl={fixture.away.logoUrl} /></div>
                            <div className="fixture-actions">
                              {alreadyAdded ? <span className="added-badge">✓ Ya agregado</span> : (
                                <><button className="button button--primary" disabled={busy} onClick={() => void addFixture(fixture, 'NORMAL')}>Agregar</button><AdminMenu label={`Opciones para agregar ${fixture.home.name} vs ${fixture.away.name}`}><button disabled={busy} onClick={() => void addFixture(fixture, 'PENALTIES_ONLY')}>Agregar con Penales</button></AdminMenu></>
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

            {selected.matches.length > 0 && (
              <section className="card selected-matches">
                <div className="section-heading"><h2>Partidos agregados</h2><span>{isDraft ? 'Ordenados por horario' : 'Resultados desde API-Football'}</span></div>
                <div className="stored-match-list">
                  {selected.matches.map((match, index) => (
                    <div className="stored-match" key={match.id}>
                      <div className="stored-match-main">
                        <small>{index + 1}. {match.competitionName || 'Competencia'} · {formatKickoff(match.kickoffAt)} · {match.status}</small>
                        <div className="stored-teams"><Team name={match.home.name} teamId={match.home.id} logoUrl={match.home.logoUrl} /><span>vs</span><Team name={match.away.name} teamId={match.away.id} logoUrl={match.away.logoUrl} /></div>
                        {match.goals.home !== null && match.goals.away !== null && <span className="penalty-badge">Resultado {match.goals.home} - {match.goals.away}</span>}
                        {match.matchType === 'PENALTIES_ONLY' && <span className="penalty-badge">PENALES</span>}
                      </div>
                      {isDraft && <AdminMenu label={`Acciones de ${match.home.name} vs ${match.away.name}`}><button className="admin-menu-danger" disabled={busy} onClick={() => setConfirm({ title: '¿Quitar partido?', message: `${match.home.name} vs ${match.away.name} se quitará del borrador. Podés volver a agregarlo desde la búsqueda.`, action: 'Quitar partido', run: () => removeMatch(match) })}>Quitar partido</button></AdminMenu>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!isDraft && <details className="card panel admin-disclosure"><summary>Ranking de la Fecha</summary><RoundRanking roundId={selected.id} mode="admin" refreshToken={rankingRefresh} /></details>}
            <PredictionHistory key={selected.id} roundId={selected.id} />

            {!isDraft && (
              <details className="card panel admin-disclosure"><summary>Corregir resultados y pronósticos</summary><AdminCorrections
                roundId={selected.id}
                refreshToken={rankingRefresh}
                onChanged={() => {
                  setRankingRefresh((value) => value + 1);
                  void loadRound(selected.id);
                }}
              /></details>
            )}


          </>
        )}
      </section>
    </div>
  );
}

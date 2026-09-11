import { FormEvent, useEffect, useMemo, useState } from 'react';

type Round = {
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
  rounds: Round[];
  standings: Standing[];
};

type AvailableRound = {
  id: number;
  name: string;
  status: string;
};

type AdminLeagueData = {
  seasons: Season[];
  availableRounds: AvailableRound[];
  error?: string;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

export default function AdminLeague() {
  const [data, setData] = useState<AdminLeagueData | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [roundId, setRoundId] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function load(preferredId?: number | null) {
    setError('');
    try {
      const next = await api<AdminLeagueData>('/api/admin/leagues');
      setData(next);
      const candidate = preferredId ?? selectedId;
      if (candidate && next.seasons.some((season) => season.id === candidate)) setSelectedId(candidate);
      else setSelectedId(next.seasons[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar la Liga');
    }
  }

  useEffect(() => { void load(null); }, []);

  const selected = useMemo(() => data?.seasons.find((season) => season.id === selectedId) ?? null, [data, selectedId]);

  async function createSeason(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const response = await api<{ season: Season }>('/api/admin/leagues', { method: 'POST', body: JSON.stringify({ name }) });
      setName('');
      setSuccess(`${response.season.name} fue creada.`);
      await load(response.season.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear la temporada');
    } finally { setLoading(false); }
  }

  async function linkRound() {
    if (!selected || roundId === '') return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/leagues/${selected.id}/rounds`, { method: 'POST', body: JSON.stringify({ roundId }) });
      setRoundId('');
      setSuccess('Fecha vinculada a la Liga.');
      await load(selected.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo vincular la fecha');
    } finally { setLoading(false); }
  }

  async function unlinkRound(targetRoundId: number) {
    if (!selected) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/leagues/${selected.id}/rounds/${targetRoundId}`, { method: 'DELETE' });
      setSuccess('Fecha desvinculada.');
      await load(selected.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo desvincular la fecha');
    } finally { setLoading(false); }
  }

  async function finishSeason() {
    if (!selected) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/leagues/${selected.id}/finish`, { method: 'PUT', body: '{}' });
      setSuccess('Liga finalizada correctamente.');
      await load(selected.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo finalizar la Liga');
    } finally { setLoading(false); }
  }

  return (
    <div className="form-stack">
      <section className="card panel">
        <div className="panel-heading">
          <div><span className="eyebrow">LIGA</span><h1>Temporadas</h1><p>Creá la temporada y vinculá exactamente 5 fechas del Prode.</p></div>
          <button className="button button--ghost" onClick={() => void load()}>Actualizar</button>
        </div>

        <form className="round-create" onSubmit={createSeason}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Liga TAFA 2026" />
          <button className="button button--primary" disabled={loading}>Crear temporada</button>
        </form>

        {error && <div className="alert alert--error">{error}</div>}
        {success && <div className="alert alert--success">{success}</div>}
      </section>

      {data && data.seasons.length > 0 && (
        <section className="card panel">
          <label className="field">
            <span>Temporada</span>
            <select value={selectedId ?? ''} onChange={(event) => setSelectedId(Number(event.target.value))}>
              {data.seasons.map((season) => <option key={season.id} value={season.id}>{season.name}{season.status === 'finished' ? ' - finalizada' : ''}</option>)}
            </select>
          </label>
        </section>
      )}

      {selected && (
        <>
          <div className="grid-two">
            <div className="card stat-card"><span>Fechas vinculadas</span><strong>{selected.roundCount}/5</strong></div>
            <div className="card stat-card"><span>Partidos definidos</span><strong>{selected.finalizedMatches}/{selected.totalMatches || 0}</strong></div>
          </div>

          <section className="card panel panel--wide">
            <div className="panel-heading"><div><h2>Fechas de {selected.name}</h2><p>Se numeran automáticamente del 1 al 5.</p></div></div>

            {selected.status === 'open' && selected.roundCount < 5 && (
              <div className="round-create">
                <select value={roundId} onChange={(event) => setRoundId(event.target.value ? Number(event.target.value) : '')}>
                  <option value="">Elegir fecha...</option>
                  {data?.availableRounds.map((round) => <option key={round.id} value={round.id}>{round.name} · {round.status}</option>)}
                </select>
                <button className="button button--primary" disabled={loading || roundId === ''} onClick={() => void linkRound()}>Vincular</button>
              </div>
            )}

            <div className="user-list">
              {[1, 2, 3, 4, 5].map((slot) => {
                const round = selected.rounds.find((item) => item.slot === slot);
                return (
                  <div className="user-row" key={slot}>
                    <div className="avatar">{slot}</div>
                    <div className="user-data">
                      <strong>{round?.name ?? `Fecha ${slot} sin vincular`}</strong>
                      <span>{round ? `${round.finalizedMatches}/${round.matchCount} partidos definidos · ${round.status}` : 'Pendiente'}</span>
                    </div>
                    {round && selected.status === 'open' && <button className="button button--ghost" disabled={loading} onClick={() => void unlinkRound(round.id)}>Desvincular</button>}
                  </div>
                );
              })}
            </div>

            {selected.status === 'open' && (
              <button className="button button--secondary" disabled={loading || selected.roundCount !== 5} onClick={() => void finishSeason()}>
                Finalizar Liga
              </button>
            )}
          </section>

          <section className="card panel panel--wide">
            <div className="panel-heading"><div><h2>Tabla de Liga</h2><p>Solo suma partidos con resultado definitivo.</p></div></div>
            <div className="user-list">
              {selected.standings.map((entry) => (
                <div className="user-row" key={entry.userId}>
                  <div className="avatar">{entry.position}</div>
                  <div className="user-data">
                    <strong>{entry.fullName}</strong>
                    <span>{entry.roundsPlayed}/5 fechas · {entry.fulls} plenos · {entry.partials} parciales · {entry.errors} errores · {entry.extras} extras</span>
                  </div>
                  <span className="user-chip">{entry.points} pts</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

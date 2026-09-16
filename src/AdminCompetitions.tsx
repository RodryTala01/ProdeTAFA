import { useEffect, useMemo, useState } from 'react';

type Division = {
  id: number;
  code: string;
  name: string;
  memberCount: number;
};

type SeasonMember = {
  userId: string;
  fullName: string;
  divisionId: number;
  divisionCode: string;
};

type Stage = {
  id: number;
  code: string;
  name: string;
  stageType: string;
  sequence: number;
  status: string;
};

type RoundLink = {
  id: number;
  stageId: number;
  roundId: number;
  sequence: number;
  purpose: string;
  label: string | null;
  roundName: string;
  roundStatus: string;
  category: string;
};

type Competition = {
  id: number;
  code: string;
  canonicalName: string;
  displayName: string;
  family: 'LEAGUE' | 'CUP' | 'PROMOTION';
  status: string;
  divisionCode: string | null;
  stages: Stage[];
  roundLinks: RoundLink[];
};

type Season = {
  id: number;
  seasonNumber: number;
  name: string;
  status: 'draft' | 'active' | 'finished' | 'archived';
  divisions: Division[];
  members: SeasonMember[];
  competitions: Competition[];
};

type Participant = {
  id: string;
  fullName: string;
  isActive: boolean;
};

type Round = {
  id: number;
  name: string;
  status: string;
  category: string;
};

type EngineData = {
  seasons: Season[];
  participants: Participant[];
  rounds: Round[];
};

type ApiError = { error?: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  const data = await response.json().catch(() => ({})) as T & ApiError;
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

function statusLabel(status: string) {
  if (status === 'draft') return 'Borrador';
  if (status === 'active') return 'Activa';
  if (status === 'finished') return 'Finalizada';
  if (status === 'archived') return 'Archivada';
  if (status === 'open') return 'Abierta';
  return status;
}

function familyLabel(family: Competition['family']) {
  if (family === 'LEAGUE') return 'Liga';
  if (family === 'PROMOTION') return 'Promoción';
  return 'Copa';
}

export default function AdminCompetitions() {
  const [data, setData] = useState<EngineData | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [roundByCompetition, setRoundByCompetition] = useState<Record<number, number | ''>>({});
  const [stageByCompetition, setStageByCompetition] = useState<Record<number, number | ''>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load(preferredSeasonId?: number | null) {
    setError('');
    try {
      const next = await api<EngineData>('/api/admin/competition-engine');
      setData(next);
      const candidate = preferredSeasonId ?? selectedSeasonId;
      if (candidate && next.seasons.some((season) => season.id === candidate)) setSelectedSeasonId(candidate);
      else setSelectedSeasonId(next.seasons[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar el motor de competiciones');
    }
  }

  useEffect(() => { void load(null); }, []);

  const selected = useMemo(
    () => data?.seasons.find((season) => season.id === selectedSeasonId) ?? null,
    [data, selectedSeasonId],
  );

  useEffect(() => {
    if (!selected) {
      setAssignments({});
      return;
    }
    const next: Record<string, string> = {};
    for (const member of selected.members) next[member.userId] = member.divisionCode;
    setAssignments(next);

    const initialStages: Record<number, number | ''> = {};
    for (const competition of selected.competitions) {
      initialStages[competition.id] = competition.stages[0]?.id ?? '';
    }
    setStageByCompetition(initialStages);
  }, [selectedSeasonId, data]);

  async function createT32() {
    setLoading(true); setError(''); setSuccess('');
    try {
      const response = await api<{ season: Season }>('/api/admin/competition-engine/seasons', {
        method: 'POST',
        body: JSON.stringify({ seasonNumber: 32, name: 'Temporada 32' }),
      });
      setSuccess('Temporada 32 creada con Liga A, Liga B y todas las competiciones habituales.');
      await load(response.season.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear T32');
    } finally { setLoading(false); }
  }

  async function saveAssignments() {
    if (!selected) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const payload = Object.entries(assignments)
        .filter(([, divisionCode]) => Boolean(divisionCode))
        .map(([userId, divisionCode]) => ({ userId, divisionCode }));
      await api(`/api/admin/competition-engine/seasons/${selected.id}/divisions`, {
        method: 'PUT',
        body: JSON.stringify({ assignments: payload }),
      });
      setSuccess('Divisiones guardadas. Cada participante quedó asignado una sola vez en T32.');
      await load(selected.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron guardar las divisiones');
    } finally { setLoading(false); }
  }

  async function changeSeasonStatus(status: 'draft' | 'active' | 'archived') {
    if (!selected) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/competition-engine/seasons/${selected.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setSuccess(status === 'active' ? `${selected.name} quedó activa.` : `Estado de ${selected.name} actualizado.`);
      await load(selected.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cambiar el estado');
    } finally { setLoading(false); }
  }

  async function linkRound(competition: Competition) {
    const stageId = stageByCompetition[competition.id];
    const roundId = roundByCompetition[competition.id];
    if (!stageId || !roundId) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/competition-engine/competitions/${competition.id}/rounds`, {
        method: 'POST',
        body: JSON.stringify({ stageId, roundId, purpose: 'NORMAL' }),
      });
      setRoundByCompetition((current) => ({ ...current, [competition.id]: '' }));
      setSuccess(`Fecha vinculada a ${competition.displayName}. La misma Fecha puede usarse en otra competición.`);
      await load(selected?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo vincular la fecha');
    } finally { setLoading(false); }
  }

  async function unlinkRound(competition: Competition, link: RoundLink) {
    setLoading(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/competition-engine/competitions/${competition.id}/rounds/${link.id}`, { method: 'DELETE' });
      setSuccess(`${link.roundName} fue desvinculada de ${competition.displayName}.`);
      await load(selected?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo desvincular la fecha');
    } finally { setLoading(false); }
  }

  const hasT32 = data?.seasons.some((season) => season.seasonNumber === 32) ?? false;
  const activeParticipants = data?.participants.filter((participant) => participant.isActive) ?? [];
  const availableRounds = data?.rounds ?? [];

  return (
    <div className="form-stack">
      <section className="card panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">TEMPORADA Y COMPETICIONES</span>
            <h1>Motor T32</h1>
            <p>Una sola Fecha del Prode puede alimentar Liga A, Liga B y varias Copas a la vez.</p>
          </div>
          <button className="button button--ghost" onClick={() => void load(selectedSeasonId)}>Actualizar</button>
        </div>
        {!hasT32 && (
          <button className="button button--primary" disabled={loading} onClick={() => void createT32()}>
            Crear Temporada 32
          </button>
        )}
        {error && <div className="alert alert--error">{error}</div>}
        {success && <div className="alert alert--success">{success}</div>}
      </section>

      {data && data.seasons.length > 0 && (
        <section className="card panel">
          <label className="field">
            <span>Temporada TAFA</span>
            <select value={selectedSeasonId ?? ''} onChange={(event) => setSelectedSeasonId(Number(event.target.value))}>
              {data.seasons.map((season) => (
                <option key={season.id} value={season.id}>T{season.seasonNumber} · {season.name} · {statusLabel(season.status)}</option>
              ))}
            </select>
          </label>
        </section>
      )}

      {selected && (
        <>
          <div className="grid-two">
            <div className="card stat-card"><span>Temporada</span><strong>T{selected.seasonNumber}</strong></div>
            <div className="card stat-card"><span>Estado</span><strong>{statusLabel(selected.status)}</strong></div>
            {selected.divisions.map((division) => (
              <div className="card stat-card" key={division.id}><span>{division.name}</span><strong>{division.memberCount}</strong></div>
            ))}
          </div>

          <section className="card panel panel--wide">
            <div className="panel-heading">
              <div><h2>Divisiones de {selected.name}</h2><p>La pertenencia a Liga A/B se guarda por temporada y no depende de la tabla vieja.</p></div>
              <div className="topbar-actions">
                {selected.status === 'draft' && <button className="button button--secondary" disabled={loading} onClick={() => void changeSeasonStatus('active')}>Activar T{selected.seasonNumber}</button>}
                {selected.status === 'active' && <button className="button button--ghost" disabled={loading} onClick={() => void changeSeasonStatus('draft')}>Volver a borrador</button>}
                <button className="button button--primary" disabled={loading} onClick={() => void saveAssignments()}>Guardar divisiones</button>
              </div>
            </div>

            <div className="user-list">
              {activeParticipants.map((participant) => (
                <div className="user-row" key={participant.id}>
                  <div className="avatar">{participant.fullName.slice(0, 1).toUpperCase()}</div>
                  <div className="user-data"><strong>{participant.fullName}</strong><span>T{selected.seasonNumber}</span></div>
                  <select
                    value={assignments[participant.id] ?? ''}
                    onChange={(event) => setAssignments((current) => ({ ...current, [participant.id]: event.target.value }))}
                  >
                    <option value="">Sin división</option>
                    {selected.divisions.map((division) => <option key={division.id} value={division.code}>{division.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </section>

          <section className="card panel panel--wide">
            <div className="panel-heading"><div><h2>Competiciones</h2><p>La plantilla de T32 deja creadas las competiciones; se configuran por etapas sin duplicar pronósticos.</p></div></div>
            <div className="user-list">
              {selected.competitions.map((competition) => (
                <div className="card panel" key={competition.id}>
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">{familyLabel(competition.family)}{competition.divisionCode ? ` · DIVISIÓN ${competition.divisionCode}` : ''}</span>
                      <h2>{competition.displayName}</h2>
                      <p>{competition.stages.length} etapa(s) configurada(s) · {competition.roundLinks.length} Fecha(s) vinculada(s).</p>
                    </div>
                    <span className="user-chip">{statusLabel(competition.status)}</span>
                  </div>

                  {competition.stages.length > 0 && (
                    <div className="round-create">
                      <select
                        value={stageByCompetition[competition.id] ?? ''}
                        onChange={(event) => setStageByCompetition((current) => ({ ...current, [competition.id]: Number(event.target.value) }))}
                      >
                        {competition.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name} · {stage.stageType}</option>)}
                      </select>
                      <select
                        value={roundByCompetition[competition.id] ?? ''}
                        onChange={(event) => setRoundByCompetition((current) => ({ ...current, [competition.id]: event.target.value ? Number(event.target.value) : '' }))}
                      >
                        <option value="">Elegir Fecha...</option>
                        {availableRounds.map((round) => <option key={round.id} value={round.id}>{round.name} · {statusLabel(round.status)} · {round.category}</option>)}
                      </select>
                      <button className="button button--secondary" disabled={loading || !roundByCompetition[competition.id]} onClick={() => void linkRound(competition)}>Vincular Fecha</button>
                    </div>
                  )}

                  {competition.roundLinks.length > 0 && (
                    <div className="user-list">
                      {competition.roundLinks.map((link) => (
                        <div className="user-row" key={link.id}>
                          <div className="avatar">{link.sequence}</div>
                          <div className="user-data"><strong>{link.roundName}</strong><span>{link.purpose} · {link.category} · {statusLabel(link.roundStatus)}</span></div>
                          <button className="button button--ghost" disabled={loading} onClick={() => void unlinkRound(competition, link)}>Desvincular</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

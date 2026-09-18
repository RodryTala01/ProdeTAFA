import { FormEvent, useEffect, useState } from 'react';
import { STAGE_OPTIONS, stageTypeLabel, statusLabel, type StageType } from './competition-presentation';

type Stage = {
  id: number;
  code: string;
  name: string;
  stageType: string;
  sequence: number;
  status: string;
};

type Competition = {
  id: number;
  code: string;
  canonicalName: string;
  displayName: string;
  status: string;
  stages: Stage[];
  roundLinks?: { id: number; stageId: number; roundName: string; sequence: number; roundStatus: string }[];
};

type Props = {
  competition: Competition;
  disabled?: boolean;
  onChanged: () => void | Promise<void>;
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

export default function CompetitionConfigPanel({ competition, disabled = false, onChanged }: Props) {
  const [displayName, setDisplayName] = useState(competition.displayName);
  const [status, setStatus] = useState(competition.status);
  const [stageName, setStageName] = useState('');
  const [stageType, setStageType] = useState<StageType>('KNOCKOUT');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Stage | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setDisplayName(competition.displayName);
    setStatus(competition.status);
  }, [competition.displayName, competition.status]);

  async function saveCompetition(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/competition-engine/competitions/${competition.id}`, {
        method: 'PUT',
        body: JSON.stringify({ displayName, status }),
      });
      setSuccess('Configuración de la competición guardada.');
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la competición');
    } finally { setBusy(false); }
  }

  async function createStage(event: FormEvent) {
    event.preventDefault();
    if (!stageName.trim()) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/competition-engine/competitions/${competition.id}/stages`, {
        method: 'POST',
        body: JSON.stringify({ name: stageName.trim(), stageType }),
      });
      setStageName('');
      setSuccess('Etapa creada.');
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear la etapa');
    } finally { setBusy(false); }
  }

  async function deleteStage(stage: Stage) {
    if (!window.confirm(`¿Eliminar la etapa "${stage.name}"? Sólo se permite si todavía no tiene Fechas, grupos, cruces ni desempates.`)) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/competition-engine/stages/${stage.id}`, { method: 'DELETE' });
      setSuccess('Etapa eliminada.');
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo eliminar la etapa');
    } finally { setBusy(false); }
  }

  async function saveStage(event: FormEvent) {
    event.preventDefault();
    if (!editing || !editing.name.trim()) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await api(`/api/admin/competition-engine/stages/${editing.id}`, {
        method: 'PUT', body: JSON.stringify({ name: editing.name.trim(), status: editing.status }),
      });
      setEditing(null);
      setSuccess('Etapa actualizada.');
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo editar la etapa');
    } finally { setBusy(false); }
  }

  const locked = disabled || busy;

  return (
    <div className="form-stack">
      <form className="round-create" onSubmit={saveCompetition}>
        <label className="field">
          <span>Nombre visible de esta edición</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={competition.canonicalName}
            disabled={locked}
          />
        </label>
        <label className="field">
          <span>Estado</span>
          <select aria-label="Estado de competición" value={status} onChange={(event) => setStatus(event.target.value)} disabled={locked}>
            <option value="draft" disabled={competition.status === 'finished'}>Borrador</option>
            <option value="active" disabled={competition.status === 'finished'}>Activa</option>
            <option value="finished">Finalizada</option>
            <option value="archived">Archivada</option>
          </select>
        </label>
        <button className="button button--secondary" disabled={locked || !displayName.trim()}>Guardar</button>
      </form>

        <form className="round-create" onSubmit={createStage}>
          <label className="field">
            <span>Nueva etapa</span>
            <input
              value={stageName}
              onChange={(event) => setStageName(event.target.value)}
              placeholder="Ej.: Fase de grupos, Octavos, Final"
              disabled={locked}
            />
          </label>
          <label className="field">
            <span>Formato</span>
            <select aria-label="Formato" value={stageType} onChange={(event) => setStageType(event.target.value as StageType)} disabled={locked}>
              {STAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button className="button button--secondary" disabled={locked || !stageName.trim()}>Crear etapa</button>
        </form>

      {competition.stages.length === 0 && <p>Todavía no hay etapas. Creá la primera con el formulario.</p>}
      {competition.stages.length > 0 && (
        <div className="user-list">
          {[...competition.stages].sort((a, b) => a.sequence - b.sequence).map((stage) => (
            <section className="competition-stage" key={stage.id}>
              <div className="avatar">{stage.sequence}</div>
              <div className="user-data">
                <strong>{stage.name}</strong>
                <span>{stageTypeLabel(stage.stageType)} · {statusLabel(stage.status)}</span>
              </div>
              {(competition.roundLinks ?? []).filter((link) => link.stageId === stage.id).length === 0
                ? <p>Sin Fechas vinculadas.</p>
                : <ul>{(competition.roundLinks ?? []).filter((link) => link.stageId === stage.id)
                  .sort((a, b) => a.sequence - b.sequence).map((link) => <li key={link.id}>{link.roundName} · {statusLabel(link.roundStatus)}</li>)}</ul>}
              <div className="topbar-actions">
                <button type="button" className="button button--secondary" disabled={locked} onClick={() => setEditing({ ...stage })}>Editar {stage.name}</button>
                <button type="button" className="button button--ghost" disabled={locked || (competition.roundLinks ?? []).some((link) => link.stageId === stage.id)} onClick={() => void deleteStage(stage)}>Eliminar {stage.name}</button>
              </div>
              {editing?.id === stage.id && <form className="form-stack" onSubmit={saveStage}>
                <label className="field"><span>Nombre de etapa</span><input required disabled={locked} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>
                <label className="field"><span>Estado de etapa</span><select aria-label="Estado de etapa" disabled={locked} value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })}>
                  {['draft', 'active', 'finished', 'archived'].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
                </select></label>
                <div className="topbar-actions"><button className="button button--primary" disabled={locked || !editing.name.trim()}>Guardar etapa</button><button type="button" className="button button--ghost" disabled={locked} onClick={() => setEditing(null)}>Cancelar</button></div>
              </form>}
            </section>
          ))}
        </div>
      )}

      {error && <div role="alert" className="alert alert--error">{error}</div>}
      {success && <div role="status" className="alert alert--success">{success}</div>}
    </div>
  );
}

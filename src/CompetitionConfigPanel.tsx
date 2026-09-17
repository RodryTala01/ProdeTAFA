import { FormEvent, useEffect, useState } from 'react';

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
};

type Props = {
  competition: Competition;
  disabled?: boolean;
  onChanged: () => void | Promise<void>;
};

type ApiError = { error?: string };

type StageType = 'ACCUMULATIVE_GROUPS' | 'ROUND_ROBIN_GROUPS' | 'SURVIVAL_TABLE' | 'KNOCKOUT';

const STAGE_OPTIONS: Array<{ value: StageType; label: string }> = [
  { value: 'ACCUMULATIVE_GROUPS', label: 'Grupos acumulativos · Copa A/B' },
  { value: 'ROUND_ROBIN_GROUPS', label: 'Grupos con enfrentamientos · Copa Total' },
  { value: 'SURVIVAL_TABLE', label: 'Tabla eliminatoria · Copa Dúos' },
  { value: 'KNOCKOUT', label: 'Llave / eliminación directa' },
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  const data = await response.json().catch(() => ({})) as T & ApiError;
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

function stageTypeLabel(stageType: string) {
  if (stageType === 'LEAGUE_TABLE') return 'Tabla de Liga';
  if (stageType === 'ACCUMULATIVE_GROUPS') return 'Grupos acumulativos';
  if (stageType === 'ROUND_ROBIN_GROUPS') return 'Grupos con enfrentamientos';
  if (stageType === 'SURVIVAL_TABLE') return 'Tabla eliminatoria';
  if (stageType === 'KNOCKOUT') return 'Llave';
  return stageType;
}

export default function CompetitionConfigPanel({ competition, disabled = false, onChanged }: Props) {
  const [displayName, setDisplayName] = useState(competition.displayName);
  const [status, setStatus] = useState(competition.status);
  const [stageName, setStageName] = useState('');
  const [stageType, setStageType] = useState<StageType>('KNOCKOUT');
  const [busy, setBusy] = useState(false);
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
          <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={locked}>
            <option value="draft">Borrador</option>
            <option value="active">Activa</option>
            <option value="finished">Finalizada</option>
            <option value="archived">Archivada</option>
          </select>
        </label>
        <button className="button button--secondary" disabled={locked || !displayName.trim()}>Guardar</button>
      </form>

      {competition.code !== 'LIGA_A' && competition.code !== 'LIGA_B' && (
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
            <select value={stageType} onChange={(event) => setStageType(event.target.value as StageType)} disabled={locked}>
              {STAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button className="button button--secondary" disabled={locked || !stageName.trim()}>Crear etapa</button>
        </form>
      )}

      {competition.stages.length > 0 && (
        <div className="user-list">
          {competition.stages.map((stage) => (
            <div className="user-row" key={stage.id}>
              <div className="avatar">{stage.sequence}</div>
              <div className="user-data">
                <strong>{stage.name}</strong>
                <span>{stageTypeLabel(stage.stageType)} · {stage.status}</span>
              </div>
              {stage.stageType !== 'LEAGUE_TABLE' && (
                <button type="button" className="button button--ghost" disabled={locked} onClick={() => void deleteStage(stage)}>
                  Eliminar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}
    </div>
  );
}

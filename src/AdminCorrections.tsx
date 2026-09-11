import { FormEvent, useEffect, useMemo, useState } from 'react';
import './admin-corrections.css';

type Team = { id: string | null; name: string };
type CorrectionMatch = {
  id: number;
  providerFixtureId: string;
  competitionName: string | null;
  kickoffAt: string;
  status: string;
  matchType: 'NORMAL' | 'PENALTIES_ONLY';
  manualResult: boolean;
  home: Team;
  away: Team;
  result: {
    homeScore: number | null;
    awayScore: number | null;
    winningTeamId: string | null;
    wentToPenalties: boolean;
    isVoid: boolean;
  };
};

type Prediction = {
  id: number;
  matchId: number;
  homeScore: number | null;
  awayScore: number | null;
  extraTeamId: string | null;
  adminOverride: boolean;
};

type Participant = {
  id: string;
  fullName: string;
  predictions: Prediction[];
};

type AuditEntry = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  actorName: string | null;
  createdAt: string;
};

type CorrectionData = {
  round: { id: number; name: string; status: string };
  matches: CorrectionMatch[];
  participants: Participant[];
  audit: AuditEntry[];
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

function formatDate(value: string) {
  const normalized = /(Z|[+-]\d{2}:\d{2})$/.test(value)
    ? value
    : `${value.replace(' ', 'T')}Z`;
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(normalized));
}

function teamName(match: CorrectionMatch, teamId: string | null) {
  if (teamId === match.home.id) return match.home.name;
  if (teamId === match.away.id) return match.away.name;
  return null;
}

function ResultEditor({
  match,
  onSaved,
}: {
  match: CorrectionMatch;
  onSaved: (message: string) => Promise<void>;
}) {
  const [homeScore, setHomeScore] = useState(match.result.homeScore === null ? '' : String(match.result.homeScore));
  const [awayScore, setAwayScore] = useState(match.result.awayScore === null ? '' : String(match.result.awayScore));
  const [wentToPenalties, setWentToPenalties] = useState(match.result.wentToPenalties);
  const [winningTeamId, setWinningTeamId] = useState(match.result.winningTeamId ?? '');
  const [isVoid, setIsVoid] = useState(match.result.isVoid);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const penaltyOnly = match.matchType === 'PENALTIES_ONLY';

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      await api(`/api/admin/matches/${match.id}/manual-result`, {
        method: 'PUT',
        body: JSON.stringify({
          homeScore: homeScore === '' ? null : Number(homeScore),
          awayScore: awayScore === '' ? null : Number(awayScore),
          wentToPenalties,
          winningTeamId: wentToPenalties ? winningTeamId || null : null,
          isVoid,
          reason,
        }),
      });
      await onSaved('Resultado corregido y puntajes recalculados.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo corregir el resultado');
    } finally { setSaving(false); }
  }

  async function resetToApi() {
    setSaving(true); setError('');
    try {
      await api(`/api/admin/matches/${match.id}/manual-result/reset`, {
        method: 'PUT', body: JSON.stringify({ reason }),
      });
      await onSaved('Corrección manual desactivada. La próxima actualización recuperará el resultado oficial.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo restaurar API-Football');
    } finally { setSaving(false); }
  }

  return (
    <form className="correction-editor" onSubmit={save}>
      <div className="correction-score-row">
        <label><span>{match.home.name}</span><input type="number" min="0" max="99" value={homeScore} disabled={isVoid} onChange={(event) => setHomeScore(event.target.value)} required={!isVoid} /></label>
        <strong>-</strong>
        <label><span>{match.away.name}</span><input type="number" min="0" max="99" value={awayScore} disabled={isVoid} onChange={(event) => setAwayScore(event.target.value)} required={!isVoid} /></label>
      </div>

      <div className="correction-checks">
        <label><input type="checkbox" checked={isVoid} onChange={(event) => setIsVoid(event.target.checked)} /> Partido anulado / sin puntos</label>
        {!isVoid && (
          <label><input type="checkbox" checked={wentToPenalties} onChange={(event) => setWentToPenalties(event.target.checked)} /> {penaltyOnly ? 'Llegó a penales' : 'Se definió por penales'}</label>
        )}
      </div>

      {!isVoid && wentToPenalties && (
        <label className="correction-wide-field">
          <span>Ganador de la tanda</span>
          <select value={winningTeamId} onChange={(event) => setWinningTeamId(event.target.value)} required>
            <option value="">Elegir equipo</option>
            <option value={match.home.id ?? ''}>{match.home.name}</option>
            <option value={match.away.id ?? ''}>{match.away.name}</option>
          </select>
        </label>
      )}

      {penaltyOnly && !isVoid && <small className="correction-muted">El marcador corregido es el de los 90 minutos. Marcá “Llegó a penales” sólo si efectivamente hubo tanda; el punto extra se aplica únicamente en ese caso.</small>}

      <label className="correction-wide-field">
        <span>Motivo de la corrección</span>
        <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej: API informó mal el resultado" required minLength={3} />
      </label>

      {error && <div className="alert alert--error correction-alert">{error}</div>}
      <div className="correction-actions">
        <button className="button button--primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar corrección'}</button>
        {match.manualResult && (
          <button type="button" className="button button--secondary" disabled={saving || reason.trim().length < 3} onClick={() => void resetToApi()}>
            Volver a API-Football
          </button>
        )}
      </div>
    </form>
  );
}

function PredictionEditor({
  roundId,
  participant,
  match,
  prediction,
  onSaved,
}: {
  roundId: number;
  participant: Participant;
  match: CorrectionMatch;
  prediction: Prediction | null;
  onSaved: (message: string) => Promise<void>;
}) {
  const [homeScore, setHomeScore] = useState(prediction?.homeScore === null || prediction?.homeScore === undefined ? '' : String(prediction.homeScore));
  const [awayScore, setAwayScore] = useState(prediction?.awayScore === null || prediction?.awayScore === undefined ? '' : String(prediction.awayScore));
  const [extraTeamId, setExtraTeamId] = useState(prediction?.extraTeamId ?? '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const penaltyOnly = match.matchType === 'PENALTIES_ONLY';

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      await api(`/api/admin/rounds/${roundId}/users/${encodeURIComponent(participant.id)}/matches/${match.id}/prediction`, {
        method: 'PUT',
        body: JSON.stringify({
          homeScore: homeScore === '' ? null : Number(homeScore),
          awayScore: awayScore === '' ? null : Number(awayScore),
          extraTeamId: extraTeamId || null,
          reason,
        }),
      });
      await onSaved(`Pronóstico de ${participant.fullName} corregido y auditado.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo corregir el pronóstico');
    } finally { setSaving(false); }
  }

  return (
    <form className="correction-editor prediction-override-editor" onSubmit={save}>
      <div className="correction-score-row">
        <label><span>{match.home.name}</span><input type="number" min="0" max="99" value={homeScore} onChange={(event) => setHomeScore(event.target.value)} required /></label>
        <strong>-</strong>
        <label><span>{match.away.name}</span><input type="number" min="0" max="99" value={awayScore} onChange={(event) => setAwayScore(event.target.value)} required /></label>
      </div>
      {penaltyOnly && (
        <label className="correction-wide-field">
          <span>Ganador por penales pronosticado</span>
          <select value={extraTeamId} onChange={(event) => setExtraTeamId(event.target.value)} required>
            <option value="">Elegir equipo</option>
            <option value={match.home.id ?? ''}>{match.home.name}</option>
            <option value={match.away.id ?? ''}>{match.away.name}</option>
          </select>
        </label>
      )}
      {penaltyOnly && <small className="correction-muted">El marcador es el pronóstico de los 90 minutos; la selección es el ganador de la tanda si el partido efectivamente llega a penales.</small>}
      <label className="correction-wide-field">
        <span>Motivo de la edición excepcional</span>
        <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej: corrección solicitada por el participante" required minLength={3} />
      </label>
      {error && <div className="alert alert--error correction-alert">{error}</div>}
      <button className="button button--primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar pronóstico'}</button>
    </form>
  );
}

export default function AdminCorrections({
  roundId,
  refreshToken,
  onChanged,
}: {
  roundId: number;
  refreshToken?: number;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<CorrectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resultMatchId, setResultMatchId] = useState<number | null>(null);
  const [predictionMatchId, setPredictionMatchId] = useState<number | null>(null);
  const [participantId, setParticipantId] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const next = await api<CorrectionData>(`/api/admin/rounds/${roundId}/corrections`);
      setData(next);
      setParticipantId((current) => current || next.participants[0]?.id || '');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar las herramientas de administración');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [roundId, refreshToken]);

  async function changed(message: string) {
    setSuccess(message);
    setResultMatchId(null);
    setPredictionMatchId(null);
    await load();
    onChanged?.();
  }

  const participant = useMemo(
    () => data?.participants.find((item) => item.id === participantId) ?? null,
    [data, participantId],
  );
  const predictions = useMemo(
    () => new Map((participant?.predictions ?? []).map((prediction) => [prediction.matchId, prediction])),
    [participant],
  );

  if (loading && !data) return <section className="card corrections-card"><p>Cargando herramientas de administración…</p></section>;
  if (error && !data) return <section className="card corrections-card"><div className="alert alert--error">{error}</div></section>;
  if (!data) return null;

  return (
    <section className="card corrections-card">
      <div className="section-heading">
        <div>
          <h2>Correcciones y auditoría</h2>
          <p>Uso excepcional. Cada cambio exige un motivo y queda registrado.</p>
        </div>
      </div>

      {success && <div className="alert alert--success correction-alert">{success}</div>}
      {error && <div className="alert alert--error correction-alert">{error}</div>}

      <details className="correction-section">
        <summary>Corregir resultados manualmente</summary>
        <div className="correction-list">
          {data.matches.map((match) => {
            const winner = teamName(match, match.result.winningTeamId);
            const hasScore = match.result.homeScore !== null && match.result.awayScore !== null;
            const resultLabel = match.result.isVoid
              ? 'Anulado'
              : hasScore
                ? `${match.result.homeScore} - ${match.result.awayScore}${match.result.wentToPenalties && winner ? ` · penales: ${winner}` : ''}`
                : 'Sin resultado definitivo';
            return (
              <div className="correction-match" key={match.id}>
                <div className="correction-match-summary">
                  <div>
                    <small>{match.competitionName || 'Competencia'} · {formatDate(match.kickoffAt)}</small>
                    <strong>{match.home.name} vs {match.away.name}</strong>
                    <span>{resultLabel}{match.manualResult ? ' · MANUAL' : ''}</span>
                  </div>
                  <button type="button" className="button button--secondary" onClick={() => setResultMatchId(resultMatchId === match.id ? null : match.id)}>
                    {resultMatchId === match.id ? 'Cerrar' : match.manualResult ? 'Editar corrección' : 'Corregir'}
                  </button>
                </div>
                {resultMatchId === match.id && <ResultEditor match={match} onSaved={changed} />}
              </div>
            );
          })}
        </div>
      </details>

      <details className="correction-section">
        <summary>Editar pronóstico de un participante</summary>
        {data.participants.length === 0 ? (
          <p className="correction-muted">No hay participantes activos.</p>
        ) : (
          <>
            <label className="correction-participant-select">
              <span>Participante</span>
              <select value={participantId} onChange={(event) => { setParticipantId(event.target.value); setPredictionMatchId(null); }}>
                {data.participants.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
              </select>
            </label>
            <div className="correction-list">
              {participant && data.matches.map((match) => {
                const prediction = predictions.get(match.id) ?? null;
                const penaltyPick = prediction ? teamName(match, prediction.extraTeamId) : null;
                const predictionLabel = !prediction
                  ? 'Sin pronóstico guardado'
                  : `${prediction.homeScore ?? '-'} - ${prediction.awayScore ?? '-'}${match.matchType === 'PENALTIES_ONLY' && penaltyPick ? ` · penales: ${penaltyPick}` : ''}`;
                return (
                  <div className="correction-match" key={match.id}>
                    <div className="correction-match-summary">
                      <div>
                        <small>{match.competitionName || 'Competencia'}</small>
                        <strong>{match.home.name} vs {match.away.name}</strong>
                        <span>{predictionLabel}{prediction?.adminOverride ? ' · EDITADO POR ADMIN' : ''}</span>
                      </div>
                      <button type="button" className="button button--secondary" onClick={() => setPredictionMatchId(predictionMatchId === match.id ? null : match.id)}>
                        {predictionMatchId === match.id ? 'Cerrar' : 'Editar'}
                      </button>
                    </div>
                    {predictionMatchId === match.id && (
                      <PredictionEditor
                        roundId={roundId}
                        participant={participant}
                        match={match}
                        prediction={prediction}
                        onSaved={changed}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </details>

      <details className="correction-section">
        <summary>Historial de intervenciones ({data.audit.length})</summary>
        <div className="audit-list">
          {data.audit.length === 0 && <p className="correction-muted">Todavía no hay correcciones registradas en esta fecha.</p>}
          {data.audit.map((entry) => {
            const reason = typeof entry.after?.reason === 'string' ? entry.after.reason : null;
            const participantName = typeof entry.after?.participantName === 'string' ? entry.after.participantName : null;
            const action = entry.action === 'match.result_override'
              ? 'Resultado corregido'
              : entry.action === 'match.result_override_reset'
                ? 'Resultado devuelto a API-Football'
                : entry.action === 'prediction.admin_override'
                  ? 'Pronóstico editado por admin'
                  : entry.action;
            return (
              <div className="audit-entry" key={entry.id}>
                <strong>{action}{participantName ? ` · ${participantName}` : ''}</strong>
                <span>{entry.actorName || 'Administrador'} · {formatDate(entry.createdAt)}</span>
                {reason && <small>Motivo: {reason}</small>}
              </div>
            );
          })}
        </div>
      </details>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import './participant-round.css';

type Match = {
  id: number;
  competitionName: string | null;
  competitionLogoUrl: string | null;
  kickoffAt: string;
  lockedAt: string;
  isLocked: boolean;
  status: string;
  matchType: 'NORMAL' | 'PENALTIES_ONLY';
  home: { id: string | null; name: string; logoUrl: string | null };
  away: { id: string | null; name: string; logoUrl: string | null };
  prediction: {
    homeScore: number | null;
    awayScore: number | null;
    extraTeamId: string | null;
  };
  score: null | {
    points: number;
    resultType: string | null;
    provisional: boolean;
  };
};

type Round = {
  id: number;
  name: string;
  status: string;
  submitted: boolean;
  lastSubmittedAt: string | null;
  submissionCount: number;
  serverNow: string;
  matches: Match[];
};

type Draft = {
  homeScore: string;
  awayScore: string;
  extraTeamId: string | null;
};

type ApiError = { error?: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

function formatKickoff(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  if (hours > 0) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function countdownLabel(match: Match, now: number) {
  const kickoff = new Date(match.kickoffAt).getTime();
  const lock = new Date(match.lockedAt).getTime();
  if (now >= lock) return 'Cerrado';
  if (now >= kickoff) return `Cierra en ${formatDuration(lock - now)}`;
  return `Empieza en ${formatDuration(kickoff - now)}`;
}

function Team({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <div className="prediction-team">
      {logoUrl ? <img src={logoUrl} alt="" /> : <span className="prediction-team-fallback">⚽</span>}
      <span>{name}</span>
    </div>
  );
}

export default function ParticipantRound() {
  const [round, setRound] = useState<Round | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [saveState, setSaveState] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [now, setNow] = useState(Date.now());
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const awayInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const serverOffset = useRef(0);

  async function loadRound() {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ round: Round | null }>('/api/participant/round');
      setRound(data.round);
      if (data.round) {
        serverOffset.current = new Date(data.round.serverNow).getTime() - Date.now();
        setNow(Date.now() + serverOffset.current);
        const next: Record<number, Draft> = {};
        for (const match of data.round.matches) {
          next[match.id] = {
            homeScore: match.prediction.homeScore === null ? '' : String(match.prediction.homeScore),
            awayScore: match.prediction.awayScore === null ? '' : String(match.prediction.awayScore),
            extraTeamId: match.prediction.extraTeamId,
          };
        }
        setDrafts(next);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar la fecha');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRound();
    const clock = setInterval(() => setNow(Date.now() + serverOffset.current), 1000);
    return () => {
      clearInterval(clock);
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  function locked(match: Match) {
    return now >= new Date(match.lockedAt).getTime();
  }

  async function saveMatch(match: Match, draft: Draft) {
    setSaveState((current) => ({ ...current, [match.id]: 'Guardando…' }));
    try {
      const homeScore = draft.homeScore === '' ? null : Number(draft.homeScore);
      const awayScore = draft.awayScore === '' ? null : Number(draft.awayScore);
      await api<{ ok: true }>(`/api/participant/predictions/${match.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          homeScore,
          awayScore,
          extraTeamId: draft.extraTeamId,
        }),
      });
      setSaveState((current) => ({ ...current, [match.id]: 'Guardado' }));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Error al guardar';
      setSaveState((current) => ({ ...current, [match.id]: message }));
    }
  }

  function updateDraft(match: Match, patch: Partial<Draft>) {
    const next = { ...drafts[match.id], ...patch };
    setDrafts((current) => ({ ...current, [match.id]: next }));
    if (timers.current[match.id]) clearTimeout(timers.current[match.id]);
    timers.current[match.id] = setTimeout(() => void saveMatch(match, next), 500);
  }

  function updateHomeScore(match: Match, value: string) {
    updateDraft(match, { homeScore: value });
    if (value !== '') {
      requestAnimationFrame(() => awayInputs.current[match.id]?.focus());
    }
  }

  async function submitRound() {
    if (!round) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      for (const timer of Object.values(timers.current)) clearTimeout(timer);
      for (const match of round.matches) {
        if (!locked(match)) await saveMatch(match, drafts[match.id]);
      }
      const data = await api<{ ok: true; lastSubmittedAt: string | null; submissionCount: number }>(
        `/api/participant/rounds/${round.id}/submit`,
        { method: 'POST', body: '{}' },
      );
      setRound((current) => current ? {
        ...current,
        submitted: true,
        lastSubmittedAt: data.lastSubmittedAt,
        submissionCount: data.submissionCount,
      } : current);
      setSuccess('Pronóstico enviado correctamente. Podés seguir editando los partidos que continúen abiertos.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo enviar el pronóstico');
    } finally {
      setSubmitting(false);
    }
  }

  const openMatches = useMemo(
    () => round?.matches.filter((match) => now < new Date(match.lockedAt).getTime()) ?? [],
    [round, now],
  );

  if (loading) {
    return <section className="card participant-empty"><p>Cargando fecha activa…</p></section>;
  }

  if (error && !round) {
    return <section className="card participant-empty"><div className="alert alert--error">{error}</div></section>;
  }

  if (!round) {
    return (
      <section className="card participant-empty">
        <span className="eyebrow">PRODE TAFA</span>
        <h1>No hay una fecha abierta todavía</h1>
        <p>Cuando el administrador publique la próxima fecha, los partidos van a aparecer acá.</p>
      </section>
    );
  }

  return (
    <div className="participant-round">
      <section className="card participant-round-header">
        <div>
          <span className="eyebrow">FECHA ABIERTA</span>
          <h1>{round.name}</h1>
          <p>{openMatches.length} partido{openMatches.length === 1 ? '' : 's'} todavía abierto{openMatches.length === 1 ? '' : 's'}.</p>
        </div>
        <div className={`submission-state ${round.submitted ? 'submission-state--ok' : ''}`}>
          <strong>{round.submitted ? 'Enviado' : 'Borrador'}</strong>
          <span>{round.submitted ? `Envíos: ${round.submissionCount}` : 'Todavía no presentado'}</span>
        </div>
      </section>

      <div className="prediction-list">
        {round.matches.map((match) => {
          const draft = drafts[match.id] ?? { homeScore: '', awayScore: '', extraTeamId: null };
          const isLocked = locked(match);

          const scoreInputs = (
            <div className="score-prediction">
              <div className="score-side">
                <Team name={match.home.name} logoUrl={match.home.logoUrl} />
                <input
                  type="number"
                  min="0"
                  max="99"
                  inputMode="numeric"
                  value={draft.homeScore}
                  disabled={isLocked}
                  onChange={(event) => updateHomeScore(match, event.target.value)}
                  aria-label={`Goles ${match.home.name}`}
                />
              </div>
              <span className="score-separator">-</span>
              <div className="score-side score-side--away">
                <input
                  ref={(element) => { awayInputs.current[match.id] = element; }}
                  type="number"
                  min="0"
                  max="99"
                  inputMode="numeric"
                  value={draft.awayScore}
                  disabled={isLocked}
                  onChange={(event) => updateDraft(match, { awayScore: event.target.value })}
                  aria-label={`Goles ${match.away.name}`}
                />
                <Team name={match.away.name} logoUrl={match.away.logoUrl} />
              </div>
            </div>
          );

          return (
            <article className={`card prediction-card ${isLocked ? 'prediction-card--locked' : ''}`} key={match.id}>
              <div className="prediction-meta">
                <span>{match.competitionName || 'Competencia'}</span>
                <time>{formatKickoff(match.kickoffAt)}</time>
                <b className={isLocked ? 'match-countdown match-countdown--closed' : 'match-countdown'}>
                  {countdownLabel(match, now)}
                </b>
              </div>

              {scoreInputs}

              {match.matchType === 'PENALTIES_ONLY' && (
                <div className="penalty-prediction">
                  <p><strong>Si se define por penales, ¿quién gana la tanda?</strong></p>
                  <div className="penalty-options">
                    <button
                      type="button"
                      disabled={isLocked}
                      className={`penalty-option ${draft.extraTeamId === match.home.id ? 'penalty-option--selected' : ''}`}
                      onClick={() => updateDraft(match, { extraTeamId: match.home.id })}
                    >
                      <Team name={match.home.name} logoUrl={match.home.logoUrl} />
                    </button>
                    <button
                      type="button"
                      disabled={isLocked}
                      className={`penalty-option ${draft.extraTeamId === match.away.id ? 'penalty-option--selected' : ''}`}
                      onClick={() => updateDraft(match, { extraTeamId: match.away.id })}
                    >
                      <Team name={match.away.name} logoUrl={match.away.logoUrl} />
                    </button>
                  </div>
                  <small>El resultado de arriba corresponde a los 90 minutos. La elección de abajo corresponde únicamente a los penales.</small>
                </div>
              )}

              <div className="prediction-footer">
                <small>{isLocked ? 'El pronóstico ya no puede modificarse.' : (saveState[match.id] || 'Se guarda automáticamente.')}</small>
                {match.score && <strong>{match.score.points} pt{match.score.points === 1 ? '' : 's'}</strong>}
              </div>
            </article>
          );
        })}
      </div>

      <section className="card submit-card">
        <div className="submit-copy">
          <strong>{round.submitted ? 'Actualizar envío' : 'Enviar pronóstico'}</strong>
          <p>Todos los partidos que todavía estén abiertos deben estar completos.</p>
          {error && <div className="alert alert--error submit-alert">{error}</div>}
          {success && <div className="alert alert--success submit-alert">{success}</div>}
        </div>
        <button className="button button--primary" disabled={submitting || openMatches.length === 0} onClick={() => void submitRound()}>
          {submitting ? 'Enviando…' : round.submitted ? 'Volver a enviar' : 'Enviar pronóstico'}
        </button>
      </section>
    </div>
  );
}

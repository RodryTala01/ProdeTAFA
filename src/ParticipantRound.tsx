import { useEffect, useMemo, useRef, useState } from 'react';
import RoundRanking from './RoundRanking';
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
  result: {
    homeCurrent: number | null;
    awayCurrent: number | null;
    homeRegulation: number | null;
    awayRegulation: number | null;
    winningTeamId: string | null;
    wentToPenalties: boolean;
    isVoid: boolean;
  };
  score: null | {
    points: number;
    basePoints: number;
    extraPoints: number;
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
  pointsTotal: number;
  serverNow: string;
  matches: Match[];
};

type RoundOption = {
  id: number;
  name: string;
  status: 'open' | 'finished';
  publishedAt: string | null;
  finishedAt: string | null;
  matchCount: number;
};

type Draft = {
  homeScore: string;
  awayScore: string;
  extraTeamId: string | null;
};

type ApiError = { error?: string };

const FINAL_STATUSES = new Set(['FT', 'AET', 'PEN']);
const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);

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

function scoreLabel(resultType: string | null) {
  if (resultType === 'FULL') return 'PLENO';
  if (resultType === 'PARTIAL') return 'PARCIAL';
  if (resultType === 'PENALTIES') return 'PENALES';
  if (resultType === 'VOID') return 'ANULADO';
  return 'ERROR';
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
  const [rounds, setRounds] = useState<RoundOption[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
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
  const selectedRoundIdRef = useRef<number | null>(null);

  async function loadRound(initial = false, roundId = selectedRoundIdRef.current) {
    if (initial) {
      setLoading(true);
      setError('');
    }
    try {
      const query = roundId === null ? '' : `?roundId=${roundId}`;
      const data = await api<{ round: Round | null }>(`/api/participant/round${query}`);
      setRound(data.round);
      if (data.round) {
        serverOffset.current = new Date(data.round.serverNow).getTime() - Date.now();
        setNow(Date.now() + serverOffset.current);
        setDrafts((current) => {
          const next = { ...current };
          for (const match of data.round!.matches) {
            if (!next[match.id]) {
              next[match.id] = {
                homeScore: match.prediction.homeScore === null ? '' : String(match.prediction.homeScore),
                awayScore: match.prediction.awayScore === null ? '' : String(match.prediction.awayScore),
                extraTeamId: match.prediction.extraTeamId,
              };
            }
          }
          return next;
        });
      }
    } catch (caught) {
      if (initial) setError(caught instanceof Error ? caught.message : 'No se pudo cargar la fecha');
    } finally {
      if (initial) setLoading(false);
    }
  }

  async function loadRoundList() {
    const data = await api<{ rounds: RoundOption[] }>('/api/participant/rounds');
    setRounds(data.rounds);
    return data.rounds;
  }

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError('');
      try {
        const available = await loadRoundList();
        const initialId = available[0]?.id ?? null;
        selectedRoundIdRef.current = initialId;
        setSelectedRoundId(initialId);
        await loadRound(false, initialId);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'No se pudo cargar la fecha');
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
    const clock = setInterval(() => setNow(Date.now() + serverOffset.current), 1000);
    const refresh = setInterval(() => void loadRound(false, selectedRoundIdRef.current), 60_000);
    return () => {
      clearInterval(clock);
      clearInterval(refresh);
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  async function chooseRound(roundId: number) {
    selectedRoundIdRef.current = roundId;
    setSelectedRoundId(roundId);
    setDrafts({});
    setSaveState({});
    setSuccess('');
    setError('');
    await loadRound(true, roundId);
  }

  function locked(match: Match) {
    return round?.status === 'finished' || now >= new Date(match.lockedAt).getTime();
  }

  async function saveMatch(match: Match, draft: Draft) {
    setSaveState((current) => ({ ...current, [match.id]: 'Guardando…' }));
    try {
      const homeScore = match.matchType === 'NORMAL' && draft.homeScore !== '' ? Number(draft.homeScore) : null;
      const awayScore = match.matchType === 'NORMAL' && draft.awayScore !== '' ? Number(draft.awayScore) : null;
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
    if (!round || round.status !== 'open') return;
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
    () => round?.status === 'open'
      ? round.matches.filter((match) => now < new Date(match.lockedAt).getTime())
      : [],
    [round, now],
  );

  if (loading) {
    return <section className="card participant-empty"><p>Cargando fecha…</p></section>;
  }

  if (error && !round) {
    return <section className="card participant-empty"><div className="alert alert--error">{error}</div></section>;
  }

  if (!round) {
    return (
      <section className="card participant-empty">
        <span className="eyebrow">PRODE TAFA</span>
        <h1>No hay una fecha disponible todavía</h1>
        <p>Cuando el administrador publique la próxima fecha, los partidos van a aparecer acá.</p>
      </section>
    );
  }

  const isFinished = round.status === 'finished';

  return (
    <div className="participant-round">
      {rounds.length > 1 && (
        <section className="card round-history-card">
          <div>
            <span className="eyebrow">HISTORIAL</span>
            <strong>Ver otra fecha</strong>
          </div>
          <select
            value={selectedRoundId ?? round.id}
            onChange={(event) => void chooseRound(Number(event.target.value))}
            aria-label="Elegir fecha del Prode"
          >
            {rounds.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}{item.status === 'open' ? ' · abierta' : ' · finalizada'}
              </option>
            ))}
          </select>
        </section>
      )}

      <section className="card participant-round-header">
        <div>
          <span className="eyebrow">{isFinished ? 'FECHA FINALIZADA' : 'FECHA ABIERTA'}</span>
          <h1>{round.name}</h1>
          <p>{isFinished
            ? 'La fecha está cerrada y los puntos son definitivos.'
            : `${openMatches.length} partido${openMatches.length === 1 ? '' : 's'} todavía abierto${openMatches.length === 1 ? '' : 's'}.`}</p>
        </div>
        <div className="participant-summary">
          <div className="points-total"><span>{isFinished ? 'Puntos finales' : 'Puntos actuales'}</span><strong>{round.pointsTotal}</strong></div>
          <div className={`submission-state ${round.submitted ? 'submission-state--ok' : ''}`}>
            <strong>{isFinished ? 'Finalizado' : round.submitted ? 'Enviado' : 'Borrador'}</strong>
            <span>{round.submitted ? `Envíos: ${round.submissionCount}` : 'Sin envío registrado'}</span>
          </div>
        </div>
      </section>

      {isFinished && <RoundRanking roundId={round.id} mode="participant" />}

      <div className="prediction-list">
        {round.matches.map((match) => {
          const draft = drafts[match.id] ?? { homeScore: '', awayScore: '', extraTeamId: null };
          const isLocked = locked(match);
          const isFinal = FINAL_STATUSES.has(match.status);
          const isLive = LIVE_STATUSES.has(match.status);
          const resultHome = isFinal ? (match.result.homeRegulation ?? match.result.homeCurrent) : match.result.homeCurrent;
          const resultAway = isFinal ? (match.result.awayRegulation ?? match.result.awayCurrent) : match.result.awayCurrent;
          const penaltyWinner = match.result.winningTeamId === match.home.id
            ? match.home.name
            : match.result.winningTeamId === match.away.id
              ? match.away.name
              : null;

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
                  {isFinished ? 'Finalizado' : countdownLabel(match, now)}
                </b>
              </div>

              {match.matchType === 'NORMAL' && scoreInputs}

              {match.matchType === 'PENALTIES_ONLY' && (
                <div className="penalty-prediction penalty-prediction--only">
                  <p><strong>¿Quién gana la tanda de penales?</strong></p>
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
                  <small>En este ítem no se pronostica marcador: acertar el ganador de la tanda vale 1 punto.</small>
                </div>
              )}

              {match.matchType === 'PENALTIES_ONLY' ? (
                (match.result.isVoid || (isFinal && penaltyWinner)) && (
                  <div className="match-result">
                    {match.result.isVoid
                      ? <strong>Partido anulado · no suma ni resta puntos</strong>
                      : <><span>Definición</span><strong>Ganó {penaltyWinner}</strong></>}
                  </div>
                )
              ) : (
                (match.result.isVoid || resultHome !== null || resultAway !== null) && (
                  <div className={`match-result ${isLive ? 'match-result--live' : ''}`}>
                    {match.result.isVoid ? (
                      <strong>Partido anulado · no suma ni resta puntos</strong>
                    ) : (
                      <>
                        <span>{isFinal ? 'Resultado 90′' : isLive ? 'Resultado actual' : 'Resultado'}</span>
                        <strong>{resultHome ?? '-'} - {resultAway ?? '-'}</strong>
                        {isFinal && match.result.wentToPenalties && penaltyWinner && <small>Ganó por penales: {penaltyWinner}</small>}
                      </>
                    )}
                  </div>
                )
              )}

              <div className="prediction-footer">
                <small>{isLocked ? 'El pronóstico ya no puede modificarse.' : (saveState[match.id] || 'Se guarda automáticamente.')}</small>
                {match.score && (
                  <div className="score-earned">
                    <strong>{match.score.points} pt{match.score.points === 1 ? '' : 's'} · {scoreLabel(match.score.resultType)}</strong>
                    {match.score.extraPoints > 0 && match.matchType === 'NORMAL' && <small>+{match.score.extraPoints} por definición</small>}
                    {match.score.provisional && <small>provisional</small>}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {!isFinished && (
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
      )}
    </div>
  );
}

import {argentinaDateTime} from './match-time';
import {CompetitionImage} from './AssetImage';
import { TeamIdentity as Team } from './ui';
import ParticipantCompetitionContexts from './ParticipantCompetitionContexts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { nextPredictionField, type PredictionField } from './prediction-focus';
import PredictionHistory from './PredictionHistory';
import FinishedPredictions from './FinishedPredictions';
import RoundRanking from './RoundRanking';
import PredictionChanges from './PredictionChanges';
import { changedPredictions, completionCount, completePrediction, globalSaveState, predictionChanged, officialDraft, penaltyName } from './prediction-presentation';
import './participant-round.css';
import './prediction-dashboard.css';

type Match = {
  provider?: string;
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
  officialPrediction: { homeScore: number | null; awayScore: number | null; extraTeamId: string | null };
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

function formatKickoff(value: string) { return argentinaDateTime(value, {weekday:'short', second:'2-digit'}); }

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function countdownLabel(match: Match, now: number) {
  const lock = new Date(match.lockedAt).getTime();
  if (now >= lock) return 'Cerrado';
  return `Cierra en ${formatDuration(lock - now)}`;
}

function submissionTime(value: string) {
  const utc = /(Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(utc));
}

function scoreLabel(resultType: string | null) {
  if (resultType === 'FULL') return 'PLENO';
  if (resultType === 'PARTIAL') return 'PARCIAL';
  if (resultType === 'PENALTIES') return 'PENALES';
  if (resultType === 'VOID') return 'ANULADO';
  return 'ERROR';
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
  const [reviewing, setReviewing] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [compact, setCompact] = useState(() => { try { return localStorage.getItem('tafa.predictions.compact') === 'true'; } catch { return false; } });
  const versions = useRef<Record<number, number>>({});
  const submitButton = useRef<HTMLButtonElement>(null);
  const reviewingRef = useRef(false);
  const returnFocus = useRef(false);
  useEffect(() => { if (!reviewing && returnFocus.current) { submitButton.current?.focus(); returnFocus.current = false; } }, [reviewing]);
  const [now, setNow] = useState(Date.now());
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const pendingSaves = useRef<Record<number, Promise<void>>>({});
  const awayInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const homeInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const penaltyInputs = useRef<Record<number, HTMLButtonElement | null>>({});
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
      if (roundId !== selectedRoundIdRef.current || reviewingRef.current) return;
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
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar la fecha');
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
    Object.values(timers.current).forEach(clearTimeout);
    selectedRoundIdRef.current = roundId;
    setSelectedRoundId(roundId);
    versions.current = {};
    setExpanded({});
    setDrafts({});
    setSaveState({});
    setSuccess('');
    setError('');
    await loadRound(true, roundId);
  }

  function locked(match: Match) {
    return round?.status !== 'open' || Date.now() + serverOffset.current >= new Date(match.lockedAt).getTime();
  }

  function saveMatch(match: Match, draft: Draft): Promise<void> {
    // Serialize each match so an older autosave cannot overwrite a newer edit
    // or arrive after the explicit submission snapshot.
    const version = versions.current[match.id] ?? 0;
    const previous = pendingSaves.current[match.id] ?? Promise.resolve();
    const next = previous.catch(() => {}).then(() => persistMatch(match, draft, version));
    pendingSaves.current[match.id] = next;
    return next;
  }

  async function persistMatch(match: Match, draft: Draft, version: number) {
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
      if ((versions.current[match.id] ?? 0) === version) setSaveState((current) => ({ ...current, [match.id]: 'Guardado' }));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Error al guardar';
      if ((versions.current[match.id] ?? 0) === version) setSaveState((current) => ({ ...current, [match.id]: message }));
      throw caught;
    }
  }

  function updateDraft(match: Match, patch: Partial<Draft>) {
    if (locked(match) || submitting || reviewing) return;
    versions.current[match.id] = (versions.current[match.id] ?? 0) + 1;
    setSaveState(current => ({ ...current, [match.id]: 'Guardando…' }));
    setSuccess('');
    const next = { ...drafts[match.id], ...patch };
    setDrafts((current) => ({ ...current, [match.id]: next }));
    if (timers.current[match.id]) clearTimeout(timers.current[match.id]);
    timers.current[match.id] = setTimeout(() => void saveMatch(match, next).catch(() => {}), 500);
  }

  function updateHomeScore(match: Match, value: string) {
    updateDraft(match, { homeScore: value });
    if (/^\d{1,2}$/.test(value)) advanceFocus(match, 'home');
  }

  function focusEditable(input: HTMLInputElement | HTMLButtonElement | null | undefined) {
    if (input && !input.disabled) {
      input.focus();
      if (window.matchMedia('(max-width: 700px)').matches) input.scrollIntoView({ block: 'nearest' });
      if (input instanceof HTMLInputElement) input.select();
    }
  }

  function advanceFocus(match: Match, completed: PredictionField) {
    if (!round) return;
    const inputs = { home: homeInputs.current, away: awayInputs.current, penalty: penaltyInputs.current };
    const target = nextPredictionField(round.matches, match.id, completed, Date.now() + serverOffset.current,
      round.status === 'open' && !submitting, (id, field) => Boolean(inputs[field][id] && !inputs[field][id]?.disabled));
    if (target) focusEditable(inputs[target.field][target.id]);
  }

  function updateAwayScore(match: Match, value: string) {
    updateDraft(match, { awayScore: value });
    if (!/^\d{1,2}$/.test(value) || locked(match)) return;
    advanceFocus(match, 'away');
  }

  function updatePenalty(match: Match, teamId: string | null) {
    updateDraft(match, { extraTeamId: teamId });
    if (teamId) advanceFocus(match, 'penalty');
  }

  async function submitRound() {
    if (!round || round.status !== 'open' || submitting) return;
    reviewingRef.current = false;
    setReviewing(false);
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      for (const timer of Object.values(timers.current)) clearTimeout(timer);
      await Promise.all(Object.values(pendingSaves.current).map((save) => save.catch(() => {})));
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
      await loadRound(false, round.id);
      setSuccess('Pronóstico enviado');
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
        <h1>Todavía no hay una Fecha disponible.</h1>
        <p>Cuando se publique la próxima, vas a poder cargar tus pronósticos acá.</p>
      </section>
    );
  }

  const isFinished = round.status === 'finished';
  const changes = changedPredictions(round.matches, drafts, now);
  const complete = completionCount(round.matches, drafts, now, !isFinished);
  const canSubmit = openMatches.length > 0 && openMatches.every(match => completePrediction(match, drafts[match.id]));
  const saving = globalSaveState(Object.values(saveState));
  function cancelReview() { reviewingRef.current = false; setReviewing(false); }
  function requestSubmit() {
    if (!canSubmit || submitting) return;
    if (round!.submitted && changes.length) { reviewingRef.current = true; returnFocus.current = true; setReviewing(true); }
    else void submitRound();
  }


  const percent = round.matches.length ? Math.round(complete / round.matches.length * 100) : 0;
  const nextKickoff = round.matches.map(m => Date.parse(m.kickoffAt)).filter(t => t > now).sort((a,b) => a-b)[0];
  const remaining = nextKickoff ? Math.max(0, Math.ceil((nextKickoff-now)/1000)) : 0;
  const resolved = round.matches.filter(m => FINAL_STATUSES.has(m.status) || m.result.isVoid);
  const stats = [['Puntos', round.pointsTotal], ['Plenos', round.matches.filter(m => m.score?.resultType === 'FULL').length], ['Parciales', round.matches.filter(m => m.score?.resultType === 'PARTIAL').length], ['Errores', round.matches.filter(m => m.score?.resultType === 'ERROR' || (FINAL_STATUSES.has(m.status) && !m.result.isVoid && m.officialPrediction.homeScore === null && !m.score)).length]];
  const progress = <><strong>{complete} DE {round.matches.length} COMPLETOS</strong><progress value={complete} max={round.matches.length || 1} aria-label="Partidos completos"/><span>{percent}%</span></>;
  return (
    <div className={`participant-round prediction-dashboard ${compact ? 'participant-round--compact' : ''}`}>
      {rounds.length > 1 && (
        <section className="card round-history-card">
          <div>
            <span className="eyebrow">HISTORIAL</span>
            <strong>Ver otra fecha</strong>
          </div>
          <select
            disabled={submitting || reviewing || Object.values(saveState).includes('Guardando…')}
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

      <section className="participant-round-header">
        <div><span className="eyebrow">{isFinished ? 'FECHA FINALIZADA' : 'FECHA ABIERTA'}</span><h1>PRONÓSTICOS <em>{round.name}</em></h1></div>
        {nextKickoff && !isFinished && <div className="prediction-next"><span>PRÓXIMO PARTIDO</span><div>{[Math.floor(remaining/86400),Math.floor(remaining%86400/3600),Math.floor(remaining%3600/60),remaining%60].map((v,i)=><span key={i}><strong>{String(v).padStart(2,'0')}</strong><small>{['DÍAS','HORAS','MINUTOS','SEGUNDOS'][i]}</small></span>)}</div></div>}
        <div className="prediction-progress"><h2>TU AVANCE</h2>{progress}</div>
      </section>
      {round.matches.some(m => m.provider === 'promiedos') && <small>Datos de partidos: <a href="https://www.promiedos.com.ar/">Promiedos</a></small>}
      <div className="prediction-toolbar">
        <div><strong>{complete}/{round.matches.length} completados</strong>{!isFinished && <span role="status" aria-live="polite"> · {saving}</span>}
          {round.submitted && <p className="submission-state--ok">Pronóstico enviado{round.lastSubmittedAt ? ` · ${submissionTime(round.lastSubmittedAt)}` : ''}</p>}
          {round.submitted && changes.length > 0 && <p>Cambiaste {changes.length} partido{changes.length === 1 ? '' : 's'} desde tu último envío.</p>}
        </div>
        <label className="compact-switch"><input type="checkbox" checked={compact} onChange={event => { setCompact(event.target.checked); try { localStorage.setItem('tafa.predictions.compact', String(event.target.checked)); } catch { /* Optional preference. */ } }}/>Vista compacta</label>
      </div>
      <div className="prediction-layout"><section className="prediction-fixtures"><h2>PARTIDOS · {round.name}</h2><div className="prediction-columns" aria-hidden="true"><span># / FECHA Y HORA</span><span>COMPETICIÓN</span><span>LOCAL / VISITANTE</span><span>MI PRONÓSTICO</span><span>RESULTADO REAL</span><span>ESTADO</span></div>
      <div className="prediction-list">
        {round.matches.map((match, index) => {
          const isLocked = locked(match);
          const draft = isLocked ? {
            homeScore: match.officialPrediction.homeScore === null ? '' : String(match.officialPrediction.homeScore),
            awayScore: match.officialPrediction.awayScore === null ? '' : String(match.officialPrediction.awayScore),
            extraTeamId: match.officialPrediction.extraTeamId,
          } : drafts[match.id] ?? { homeScore: '', awayScore: '', extraTeamId: null };
          const isFinal = FINAL_STATUSES.has(match.status) || match.result.isVoid;
          const collapsed = (isFinal || isFinished) && !expanded[match.id];
          const saveError = saveState[match.id] && !['Guardado', 'Guardando…'].includes(saveState[match.id]);
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
                <input
                  ref={(element) => { homeInputs.current[match.id] = element; }}
                  type="number"
                  min="0"
                  max="99"
                  inputMode="numeric"
                  value={draft.homeScore}
                  disabled={isLocked || submitting || reviewing}
                  onChange={(event) => updateHomeScore(match, event.target.value)}
                  aria-label={`Goles ${match.home.name}`}
                />
              </div>
              <span className="score-separator" aria-hidden="true">—</span>
              <div className="score-side score-side--away">
                <input
                  ref={(element) => { awayInputs.current[match.id] = element; }}
                  type="number"
                  min="0"
                  max="99"
                  inputMode="numeric"
                  value={draft.awayScore}
                  disabled={isLocked || submitting || reviewing}
                  onChange={(event) => updateAwayScore(match, event.target.value)}
                  aria-label={`Goles ${match.away.name}`}
                />
              </div>
            </div>
          );

          return (
            <article className={`prediction-card ${isLive ? 'prediction-card--live' : ''} ${collapsed ? 'prediction-card--collapsed' : ''}`} key={match.id}>
              <div className="prediction-date"><b>{index+1}</b><time dateTime={match.kickoffAt}>{formatKickoff(match.kickoffAt)}</time><details className="prediction-lock-time"><summary>Hora de cierre</summary>{formatKickoff(match.lockedAt)}</details></div>
              <span className="prediction-competition"><CompetitionImage name={match.competitionName||'Competencia'} logoUrl={match.competitionLogoUrl} size="xs" decorative/>{match.competitionName || 'Competencia'}</span>
              <div className="prediction-teams"><Team name={match.home.name} teamId={match.home.id} logoUrl={match.home.logoUrl}/><Team name={match.away.name} teamId={match.away.id} logoUrl={match.away.logoUrl}/></div>
              <div className="prediction-value"><small>MI PRONÓSTICO</small>{isLocked ? <div className="prediction-readonly" aria-label="Tu pronóstico"><strong>{draft.homeScore || '—'} – {draft.awayScore || '—'}</strong><small aria-label="Bloqueado"><svg width="12" height="14" viewBox="0 0 16 18" fill="none" stroke="currentColor" aria-hidden="true"><rect x="2" y="8" width="12" height="8" rx="1"/><path d="M5 8V5a3 3 0 016 0v3"/></svg> Cerrado</small></div> : scoreInputs}</div>
              {!collapsed && match.matchType === 'PENALTIES_ONLY' && (
                <div className="penalty-prediction">
                  <p><strong>SI HAY PENALES</strong></p>
                  <div className="penalty-options" hidden={isLocked}>
                    <button
                      ref={(element) => { penaltyInputs.current[match.id] = element; }}
                      type="button"
                      disabled={isLocked || submitting || reviewing}
                      aria-pressed={draft.extraTeamId === match.home.id}
                      className={`penalty-option ${draft.extraTeamId === match.home.id ? 'penalty-option--selected' : ''}`}
                      onClick={() => updatePenalty(match, match.home.id)}
                    >
                      <Team name={match.home.name} teamId={match.home.id} logoUrl={match.home.logoUrl} />
                    </button>
                    <button
                      type="button"
                      disabled={isLocked || submitting || reviewing}
                      aria-pressed={draft.extraTeamId === match.away.id}
                      className={`penalty-option ${draft.extraTeamId === match.away.id ? 'penalty-option--selected' : ''}`}
                      onClick={() => updatePenalty(match, match.away.id)}
                    >
                      <Team name={match.away.name} teamId={match.away.id} logoUrl={match.away.logoUrl} />
                    </button>
                  </div>
                  {isLocked && <span>Tu elección: {penaltyName(match, draft.extraTeamId)}</span>}
                  <small className="prediction-secondary">El marcador es de los 90′. Acertar el ganador por penales suma +1.</small>
                </div>
              )}

              {(
                <div className={`match-result ${isLive ? 'match-result--live' : ''}`}>
                  {match.result.isVoid ? (
                    <strong>Partido anulado · no suma ni resta puntos</strong>
                  ) : (
                    <>
                      <span>RESULTADO REAL{isFinal ? ' · 90′' : ''}</span>
                      <strong>{resultHome ?? '-'} - {resultAway ?? '-'}</strong>
                      {isFinal && match.result.wentToPenalties && penaltyWinner && <small>Ganó por penales: {penaltyWinner}</small>}
                    </>
                  )}
                </div>
              )}

              <div className={`prediction-footer prediction-state--${isLive ? 'live' : match.result.isVoid ? 'void' : match.score?.resultType?.toLowerCase() ?? (isFinal && match.officialPrediction.homeScore === null ? 'error' : 'pending')}`}>
                {isLive && <strong>EN VIVO</strong>}
                {!isLive && !isFinal && <strong>PENDIENTE</strong>}
                {isFinal && !match.result.isVoid && !match.score && match.officialPrediction.homeScore === null && <strong>ERROR · 0 pts</strong>}
                <small>{isFinal || isFinished ? 'Finalizado' : isLocked ? 'Cerrado' : round.submitted && predictionChanged(match, draft) ? 'Modificado · pendiente de reenvío' : round.submitted && completePrediction(match, officialDraft(match.officialPrediction)) ? 'Enviado' : !completePrediction(match, draft) ? 'Incompleto' : saveState[match.id] === 'Guardado' ? 'Completado · guardado' : 'Completado'}</small>
                {!isLocked && saveError && <div className="prediction-save-error" role="alert">{match.home.name} — {match.away.name}: {saveState[match.id]} <button type="button" className="button button--ghost" disabled={submitting || reviewing} onClick={() => void saveMatch(match, draft).catch(() => {})}>Reintentar guardado</button></div>}
                {match.score && (
                  <div className="score-earned">
                    <strong>{match.score.points > 0 ? '+' : ''}{match.score.points} pts · {scoreLabel(match.score.resultType)}</strong>
                    {match.score.extraPoints > 0 && <small>+{match.score.extraPoints} por penales</small>}
                    {match.score.provisional && <small>provisional</small>}
                  </div>
                )}
              </div>
              {!isLocked && <small className="prediction-close">{countdownLabel(match, now)}</small>}
              {(isFinal || isFinished) && <button type="button" className="prediction-expand" aria-expanded={!collapsed} aria-controls={`match-detail-${match.id}`} onClick={() => setExpanded(current => ({ ...current, [match.id]: !current[match.id] }))}>{collapsed ? 'Ver detalle' : 'Ocultar detalle'}</button>}
              {(isFinal || isFinished) && <div id={`match-detail-${match.id}`} hidden={collapsed} className="prediction-detail">{match.score ? `${match.score.basePoints} puntos por marcador · ${match.score.extraPoints} por penales` : 'Sin puntaje registrado'}</div>}
            </article>
          );
        })}
      </div>

      </section><aside className="prediction-sidebar">
        <section className="prediction-summary prediction-progress"><h2>MI PRONÓSTICO</h2>{progress}</section>
        <ParticipantCompetitionContexts key={`contexts-${round.id}`} roundId={round.id}/>
        <section className="prediction-summary"><h2>PUNTAJE DE LA FECHA</h2><dl>{stats.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>Partidos resueltos <strong>{resolved.length} / {round.matches.length}</strong></p><progress value={resolved.length} max={round.matches.length || 1} aria-label="Partidos resueltos"/>{round.matches.some(m=>m.score?.provisional) && <small>Incluye puntos provisionales</small>}</section>
      {!isFinished && <section className="card submit-card">
        <div className="submit-copy"><p>{complete} de {round.matches.length} partidos completados</p>
          <p>{openMatches.length === 0 ? 'Los pronósticos ya cerraron.' : !canSubmit ? 'Completá los partidos abiertos para enviar.' : round.submitted && changes.length ? 'Tus cambios todavía no están enviados.' : 'Todo listo para enviar.'}</p>
          {error && <div role="alert" className="alert alert--error submit-alert">{error}</div>}
          {success && <div role="status" className="alert alert--success submit-alert">{success}</div>}
        </div>
        {openMatches.length > 0 && <button ref={submitButton} className="button button--primary" disabled={submitting || !canSubmit || reviewing} onClick={requestSubmit}>{submitting ? 'Enviando…' : round.submitted ? 'Reenviar' : 'Enviar pronóstico'}</button>}
      </section>}
      </aside></div>
      {reviewing && <PredictionChanges changes={changes} busy={submitting} onCancel={cancelReview} onConfirm={() => void submitRound()}/>}
      {isFinished && <RoundRanking roundId={round.id} mode="participant" />}
      {isFinished && <FinishedPredictions roundId={round.id} />}
      <PredictionHistory key={`history-${round.id}`} roundId={round.id} own />
    </div>
  );
}

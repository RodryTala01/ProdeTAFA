import { useEffect, useState } from 'react';
import './prediction-history.css';

type Value = { matchId: number; homeName: string; awayName: string; matchType: string; homeScore: number | null; awayScore: number | null; extraTeam: string | null };
type Event = { id: number; type: string; actor: string; at: string; before: Value | null; after: Value | Value[] };
type Data = {
  round: { name: string }; participants: { id: string; name: string; active: number; lastAt: string | null; count: number }[];
  events: Event[]; nextCursor: number | null;
  submission: { firstAt: string; lastAt: string; count: number } | null;
};
function date(value: string) {
  const utc = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hourCycle: 'h23',
  }).format(new Date(utc));
}
function score(value: Value | null) { return `${value?.homeScore ?? '—'}–${value?.awayScore ?? '—'}`; }
function Snapshot({ value }: { value: Value }) {
  return <li>{value.homeName} vs {value.awayName}: <strong>{score(value)}</strong>
    {value.matchType === 'PENALTIES_ONLY' && <> · Ganador de penales: {value.extraTeam ?? 'Sin elegir'}</>}
  </li>;
}
export default function PredictionHistory({ roundId, participantId = '', own = false, initiallyOpen = false }: { roundId: number; participantId?: string; own?: boolean; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [userId, setUserId] = useState(participantId);
  const [type, setType] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    const query = new URLSearchParams({ type });
    if (!own) query.set('userId', userId);
    if (cursor) query.set('before', String(cursor));
    fetch(`/api/${own ? 'participant' : 'admin'}/rounds/${roundId}/prediction-history?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo cargar el historial');
        if (!controller.signal.aborted) setData(result);
      }).catch((caught) => { if (!controller.signal.aborted) setError(caught.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, roundId, userId, cursor, revision, type, own]);
  const participant = own ? data?.participants[0] : data?.participants.find((item) => item.id === userId);
  return <section className="card prediction-history">
    <button className="button button--secondary" aria-expanded={open} onClick={() => setOpen(!open)}>Historial de pronóstico</button>
    {open && <>
      <h2>Historial de pronóstico · {data?.round.name}</h2>
      <p>Hora de Argentina (UTC−3). Más recientes primero. Sólo envíos oficiales y correcciones administrativas.</p>
      {!own && <label>Participante
        <select value={userId} onChange={(event) => { setUserId(event.target.value); setCursor(null); }}>
          <option value="">Elegir participante</option>
          {data?.participants.map((user) => <option key={user.id} value={user.id}>{user.name}{user.active ? '' : ' · inactivo'} · {user.lastAt ? `Enviado ${date(user.lastAt)}` : 'Sin envío'}</option>)}
        </select>
      </label>}
      <label>Tipo de evento
        <select value={type} onChange={(event) => { setType(event.target.value); setCursor(null); }}>
          <option value="">Todos</option><option value="FIRST_SUBMISSION">Primer envío</option>
          <option value="PREDICTION_CHANGE">Modificación</option><option value="RESUBMISSION">Reenvío</option>
        </select>
      </label>
      <button className="button button--ghost" disabled={loading} onClick={() => { setCursor(null); setRevision(revision + 1); }}>Actualizar historial</button>
      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">Cargando historial…</p> : !error && (own || userId) && data && <>
        <h3>{participant?.name}</h3>
        {data.submission ? <p>Primer envío: {date(data.submission.firstAt)} · Último envío: {date(data.submission.lastAt)} · Envíos: {data.submission.count}</p> : <p>Todavía no envió esta fecha. Los borradores no generan eventos.</p>}
        {data.events.length === 0 && <p>No hay eventos oficiales para este filtro. Los cambios de borrador no aparecen hasta Reenviar. Los envíos antiguos sin snapshot conservan sólo las fechas conocidas.</p>}
        <ol className="prediction-timeline">
          {data.events.map((event) => {
            const after = event.after as Value;
            return <li key={event.id}>
              <strong>{event.type === 'FIRST_SUBMISSION' ? 'Primer envío' : event.type === 'RESUBMISSION' ? 'Reenvío' : 'Modificación'}</strong>
              {event.actor === 'admin' && <span> · Corrección administrativa</span>}
              <time dateTime={event.at}>{date(event.at)}</time>
              <small>{participant?.name} · {data.round.name}</small>
              {event.type === 'PREDICTION_CHANGE' ? <>
                <p>{after.homeName} vs {after.awayName}</p>
                {(event.before?.homeScore !== after.homeScore || event.before?.awayScore !== after.awayScore) && <p>Marcador: {score(event.before)} → {score(after)}</p>}
                {after.matchType === 'PENALTIES_ONLY' && event.before?.extraTeam !== after.extraTeam && <p>Ganador de penales: {event.before?.extraTeam ?? 'Sin elegir'} → {after.extraTeam ?? 'Sin elegir'}</p>}
              </> : <details><summary>Ver pronóstico enviado</summary><ul>{(event.after as Value[]).map((value) => <Snapshot key={value.matchId} value={value} />)}</ul></details>}
            </li>;
          })}
        </ol>
        {data.nextCursor && <button className="button button--secondary" onClick={() => setCursor(data.nextCursor)}>Ver anteriores</button>}
        {cursor && <button className="button button--ghost" onClick={() => setCursor(null)}>Volver a recientes</button>}
      </>}
    </>}
  </section>;
}

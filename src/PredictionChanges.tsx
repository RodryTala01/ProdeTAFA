import { useEffect, useRef } from 'react';
import { penaltyName, type changedPredictions } from './prediction-presentation';
type Changes = ReturnType<typeof changedPredictions>;
export function ChangesList({ changes }: { changes: Changes }) {
  return <ul className="prediction-changes">{changes.map(({ match, before, after }) => <li key={match.id}>
    <strong>{match.home.name} — {match.away.name}</strong>
    <div><span>Antes: {before.homeScore || '—'}–{before.awayScore || '—'}</span><strong>Ahora: {after.homeScore || '—'}–{after.awayScore || '—'}</strong></div>
    {match.matchType === 'PENALTIES_ONLY' && before.extraTeamId !== after.extraTeamId && <p>Penales · Antes: {penaltyName(match, before.extraTeamId)} → Ahora: {penaltyName(match, after.extraTeamId)}</p>}
  </li>)}</ul>;
}
export default function PredictionChanges({ changes, onCancel, onConfirm, busy }: { changes: Changes; onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="resubmit-dialog" aria-labelledby="resubmit-title" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="resubmit-title">Cambios desde tu último envío</h2>
    <ChangesList changes={changes} />
    {!changes.length && <p>No quedan cambios editables. Revisá los horarios de cierre.</p>}
    <div className="modal-actions"><button className="button button--ghost" disabled={busy} onClick={onCancel}>Cancelar</button><button className="button button--primary" disabled={busy || !changes.length} onClick={onConfirm}>{busy ? 'Enviando…' : 'Confirmar cambios'}</button></div>
  </dialog>;
}

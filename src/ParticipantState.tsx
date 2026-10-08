import { useEffect, useState } from 'react';
import { readCompetition } from './participant-competitions';

export function ParticipantState({ loading = false, error, retry, empty }: { loading?: boolean; error?: string; retry?: () => void; empty?: string }) {
  if (loading) return <p className="participant-state" role="status">Cargando…</p>;
  if (error) return <div className="participant-state"><p role="alert">{error}</p><button className="button button--secondary" onClick={retry}>Reintentar</button></div>;
  return empty ? <p className="participant-state">{empty}</p> : null;
}

export function useParticipantRead<T>(url: string | null, message: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(url));
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(''); setLoading(Boolean(url));
    if (url) readCompetition<T>(url, controller.signal)
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(() => { if (!controller.signal.aborted) setError(message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [url, message, revision]);
  return { data, error, loading, retry: () => setRevision(n => n + 1) };
}

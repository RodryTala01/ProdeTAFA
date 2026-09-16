type Match = { id: number; lockedAt: string; matchType: string };
export type PredictionField = 'home' | 'away' | 'penalty';

export function nextPredictionField(
  matches: Match[], currentId: number, completed: PredictionField, now: number,
  canEditRound: boolean, available: (id: number, field: PredictionField) => boolean,
): { id: number; field: PredictionField } | null {
  const index = matches.findIndex((match) => match.id === currentId);
  const match = matches[index];
  if (!canEditRound || !match || now >= new Date(match.lockedAt).getTime()) return null;
  const field = completed === 'home' ? 'away'
    : completed === 'away' && match.matchType === 'PENALTIES_ONLY' ? 'penalty' : null;
  if (field) return available(match.id, field) ? { id: match.id, field } : null;
  const next = matches.slice(index + 1).find((item) => now < new Date(item.lockedAt).getTime() && available(item.id, 'home'));
  return next ? { id: next.id, field: 'home' } : null;
}

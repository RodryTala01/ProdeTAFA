export type Draft = { homeScore: string; awayScore: string; extraTeamId: string | null };
export type Official = { homeScore: number | null; awayScore: number | null; extraTeamId: string | null };
export type PredictionMatch = {
  id: number; lockedAt: string; matchType: string;
  home: { id: string | null; name: string }; away: { id: string | null; name: string };
  officialPrediction: Official;
};
export function officialDraft(value: Official): Draft {
  return { homeScore: value.homeScore === null ? '' : String(value.homeScore), awayScore: value.awayScore === null ? '' : String(value.awayScore), extraTeamId: value.extraTeamId };
}
export function completePrediction(match: PredictionMatch, draft?: Draft) {
  const score = (value?: string) => value !== undefined && value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 99;
  return !!draft && score(draft.homeScore) && score(draft.awayScore)
    && (match.matchType !== 'PENALTIES_ONLY' || !!draft.extraTeamId && [match.home.id, match.away.id].includes(draft.extraTeamId));
}
export function predictionChanged(match: PredictionMatch, draft?: Draft) {
  if (!draft) return false;
  const before = match.officialPrediction;
  return (draft.homeScore === '' ? null : Number(draft.homeScore)) !== before.homeScore
    || (draft.awayScore === '' ? null : Number(draft.awayScore)) !== before.awayScore
    || (match.matchType === 'PENALTIES_ONLY' && draft.extraTeamId !== before.extraTeamId);
}
export function changedPredictions(matches: PredictionMatch[], drafts: Record<number, Draft>, now: number) {
  return matches.filter(m => now < Date.parse(m.lockedAt) && predictionChanged(m, drafts[m.id])).map(m => ({ match: m, before: officialDraft(m.officialPrediction), after: { ...drafts[m.id] } }));
}
export function completionCount(matches: PredictionMatch[], drafts: Record<number, Draft>, now: number, open: boolean) {
  return matches.filter(m => completePrediction(m, open && now < Date.parse(m.lockedAt) ? drafts[m.id] : officialDraft(m.officialPrediction))).length;
}
export function globalSaveState(states: string[]) {
  if (states.some(s => !['Guardado', 'Guardando…'].includes(s))) return 'Error al guardar';
  return states.includes('Guardando…') ? 'Guardando…' : 'Guardado';
}
export function penaltyName(match: PredictionMatch, id: string | null) {
  return id && id === match.home.id ? match.home.name : id && id === match.away.id ? match.away.name : 'Sin selección';
}

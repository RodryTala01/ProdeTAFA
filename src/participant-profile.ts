export type HistoryRound = {
  id:number; name:string; finishedAt:string|null; lastSubmittedAt:string;
  submissionCount:number; points:number; fulls:number; partials:number; errors:number; extras:number;
};
export type PublicProfile = {participant:{id:string;fullName:string;logoUrl?:string;shieldUrl?:string};rounds:HistoryRound[]};
export type HistoricalPrediction = {
  matchId:number;homeScore:number|null;awayScore:number|null;extraTeamId:string|null;points:number;
  score:{basePoints:number|null;extraPoints:number|null;resultType:string|null}|null;
};
export type HistoricalMatch = {
  id:number;matchType:string;home:{id:string|null;name:string};away:{id:string|null;name:string};
  result:{home:number|null;away:number|null;penalties:boolean;winnerId:string|null;isVoid:boolean};
};
export type Reveal = {
  round:{id:number;name:string;finishedAt:string|null};matches:HistoricalMatch[];
  participants:{id:string;fullName:string;points:number;predictions:HistoricalPrediction[]}[];
};
export function profileHref(id:string, season?:number) {
  return `#/club/participante/${encodeURIComponent(id)}${season?`?season=${season}`:''}`;
}
export function historyHref(roundId?:number, userId?:string) {
  return `#/club/historial${roundId?`/${roundId}`:''}${userId?`?user=${encodeURIComponent(userId)}`:''}`;
}
export function historicalScoreLabel(prediction:HistoricalPrediction|undefined, match:HistoricalMatch) {
  if (match.result.isVoid) return 'ANULADO';
  if (!prediction || prediction.homeScore===null || prediction.awayScore===null) return 'SIN PRONÓSTICO';
  return ({FULL:'PLENO',PARTIAL:'PARCIAL',MISS:'ERROR',ERROR:'ERROR',VOID:'ANULADO',PENALTIES:'PENALES'}[prediction.score?.resultType??''] ?? 'PUNTAJE NO DISPONIBLE');
}
export function argentinaDate(value:string|null) {
  if (!value) return '';
  const utc=/(Z|[+-]\d{2}:\d{2})$/.test(value)?value:value.replace(' ','T')+'Z';
  return new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'short',year:'numeric'}).format(new Date(utc));
}

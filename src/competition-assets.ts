export const competitionCodes = ['LIGA_A','LIGA_B','COPA_A','COPA_B','COPA_TOTAL','COPA_DUOS','COPA_CAMPEONES','COPA_PAPA','PROMOCION'] as const;
export type CompetitionAsset = { logo?:string; trophy?:string; accent?:`--${string}` };
// Only register supplied assets. No speculative URLs or requests for missing files.
export const competitionAssets: Record<string,CompetitionAsset> = Object.fromEntries(competitionCodes.map(code=>[code,{}]));
// Optional historical overrides: season -> competition code -> original asset.
export const historicalCompetitionAssets: Record<number,Record<string,CompetitionAsset>> = {};
export function competitionAsset(code:string,season?:number):CompetitionAsset {
  return {...competitionAssets[code],...(season?historicalCompetitionAssets[season]?.[code]:{})};
}
export const participantAssets: Record<string,string> = {};
export const historicalParticipantAssets: Record<number,Record<string,string>> = {};
export const teamAssets: Record<string,string> = {};
export function participantAsset(id?:string,season?:number) {
  return id ? (season?historicalParticipantAssets[season]?.[id]:undefined)??participantAssets[id] : undefined;
}

export const competitionCodes = ['LIGA_A','LIGA_B','COPA_A','COPA_B','COPA_TOTAL','COPA_DUOS','COPA_CAMPEONES','COPA_PAPA','PROMOCION'] as const;
export type CompetitionAsset = { logo?:string; trophy?:string; accent?:`--${string}` };
// Only register supplied assets. No speculative URLs or requests for missing files.
export const competitionAssets: Record<string,CompetitionAsset> = Object.fromEntries(competitionCodes.map(code=>[code,{trophy:`/competitions/${code.toLowerCase()}.png`}]));
// Optional historical overrides: season -> competition code -> original asset.
export const historicalCompetitionAssets: Record<number,Record<string,CompetitionAsset>> = {};
export function competitionAsset(code:string,season?:number):CompetitionAsset {
  return {...competitionAssets[code],...(season?historicalCompetitionAssets[season]?.[code]:{})};
}
export const participantAssets: Record<string,string> = {
  "c9c1e740-47c0-4190-8fb3-43d736bf38e3": "/participants/c9c1e740-47c0-4190-8fb3-43d736bf38e3.png",
  "7e446fd7-15f2-4105-8612-7127491c5543": "/participants/7e446fd7-15f2-4105-8612-7127491c5543.png",
  "22721af7-775d-4b10-8a72-66a13014ad19": "/participants/22721af7-775d-4b10-8a72-66a13014ad19.png",
  "7be9fb39-8a8f-4b68-bb09-4d15e7ae505f": "/participants/7be9fb39-8a8f-4b68-bb09-4d15e7ae505f.png",
  "6b779363-e353-4067-9db2-2c6e7005a05c": "/participants/6b779363-e353-4067-9db2-2c6e7005a05c.png",
  "3ba5f8ad-592a-46f2-8cfd-f80dda308384": "/participants/3ba5f8ad-592a-46f2-8cfd-f80dda308384.png",
  "9b0365d5-4b40-4ae1-9953-5b61b1b33fff": "/participants/9b0365d5-4b40-4ae1-9953-5b61b1b33fff.png",
  "a00b13ac-b366-4d90-b1b9-bc9b9dc6b18f": "/participants/a00b13ac-b366-4d90-b1b9-bc9b9dc6b18f.png",
  "d2a2a001-8214-41a4-9cdd-4bdeb9722477": "/participants/d2a2a001-8214-41a4-9cdd-4bdeb9722477.png",
  "9f149f8d-a923-4b4c-8b9a-bd053f1f134b": "/participants/9f149f8d-a923-4b4c-8b9a-bd053f1f134b.png",
  "816314d2-d124-4ba1-a3b2-f4facd580533": "/participants/816314d2-d124-4ba1-a3b2-f4facd580533.png"
};
export const historicalParticipantAssets: Record<number,Record<string,string>> = {};
export const teamAssets: Record<string,string> = {};
export function participantAsset(id?:string,season?:number) {
  return id ? (season?historicalParticipantAssets[season]?.[id]:undefined)??participantAssets[id] : undefined;
}

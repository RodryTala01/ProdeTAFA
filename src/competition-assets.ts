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
// Original supplied PNGs; no atlas, conversion or guessed participant IDs.
export const participantNameAssets: Record<string,string> = {
  "alexis segovia": "/participants/originals/alexis-segovia.png",
  "anto": "/participants/originals/anto.png",
  "anubis": "/participants/originals/anubis.png",
  "axel": "/participants/originals/axel.png",
  "azul quispe": "/participants/originals/azul-quispe.png",
  "bautista coria": "/participants/originals/bautista-coria.png",
  "benja": "/participants/originals/benja.png",
  "bruno alonso": "/participants/originals/bruno-alonso.png",
  "cami": "/participants/originals/cami.png",
  "ciro guarch": "/participants/originals/ciro-guarch.png",
  "cristian hantis": "/participants/originals/cristian-hantis.png",
  "cristian serpico": "/participants/originals/cristian-serpico.png",
  "cundo": "/participants/originals/cundo.png",
  "dani bazan": "/participants/originals/dani-bazan.png",
  "eze": "/participants/originals/eze.png",
  "fabrizio escolano": "/participants/originals/fabrizio-escolano.png",
  "facundo marchese": "/participants/originals/facundo-marchese.png",
  "federico moreno": "/participants/originals/federico-moreno.png",
  "felipe galante": "/participants/originals/felipe-galante.png",
  "gabriel talarico": "/participants/originals/gabriel-talarico.png",
  "gonzalo nunez": "/participants/originals/gonzalo-nunez.png",
  "ian gangai": "/participants/originals/ian-gangai.png",
  "ignacio cejas": "/participants/originals/ignacio-cejas.png",
  "jhose": "/participants/originals/jhose.png",
  "joaco fernandez": "/participants/originals/joaco-fernandez.png",
  "joaquin sampadaro": "/participants/originals/joaquin-sampadaro.png",
  "joe": "/participants/originals/joe.png",
  "joel alcalde": "/participants/originals/joel-alcalde.png",
  "kevin sivori": "/participants/originals/kevin-sivori.png",
  "kraiizer": "/participants/originals/kraiizer.png",
  "lautaro scocier": "/participants/originals/lautaro-scocier.png",
  "leandro montes": "/participants/originals/leandro-montes.png",
  "lucas aguilera": "/participants/originals/lucas-aguilera.png",
  "lucas insua": "/participants/originals/lucas-insua.png",
  "luciano hufschmid": "/participants/originals/luciano-hufschmid.png",
  "manu solbes": "/participants/originals/manu-solbes.png",
  "mario talarico": "/participants/originals/mario-talarico.png",
  "marto": "/participants/originals/marto.png",
  "martin bustos": "/participants/originals/martin-bustos.png",
  "matheo olivera": "/participants/originals/matheo-olivera.png",
  "matias diaz": "/participants/originals/matias-diaz.png",
  "matias varela": "/participants/originals/matias-varela.png",
  "morena poletti": "/participants/originals/morena-poletti.png",
  "moreno perez": "/participants/originals/moreno-perez.png",
  "nacho soto": "/participants/originals/nacho-soto.png",
  "nahuel gonzalez": "/participants/originals/nahuel-gonzalez.png",
  "nahuel scocier": "/participants/originals/nahuel-scocier.png",
  "nata": "/participants/originals/nata.png",
  "nico avalos": "/participants/originals/nico-avalos.png",
  "nico luchetti": "/participants/originals/nico-luchetti.png",
  "pancho muzzio": "/participants/originals/pancho-muzzio.png",
  "pollo": "/participants/originals/pollo.png",
  "ramiro ebel": "/participants/originals/ramiro-ebel.png",
  "ramiro vita": "/participants/originals/ramiro-vita.png",
  "renzo badano": "/participants/originals/renzo-badano.png",
  "rodri sebastian": "/participants/originals/rodri-sebastian.png",
  "rodrigo soca": "/participants/originals/rodrigo-soca.png",
  "rodrigo talarico": "/participants/originals/rodrigo-talarico.png",
  "santi": "/participants/originals/santi.png",
  "tomas delgado": "/participants/originals/tomas-delgado.png",
  "tomas gonzalez": "/participants/originals/tomas-gonzalez.png",
  "tomas torcasio": "/participants/originals/tomas-torcasio.png",
  "veronica lucchesi": "/participants/originals/veronica-lucchesi.png",
  "yago": "/participants/originals/yago.png"
};
// Production IDs verified read-only on 2026-10-29. Display-name changes do not change shields.
export const participantShieldKeys: Record<string,string> = {
  "4ba8b09f-fc1e-46a3-804f-e155ab002845": "benja",
  "c9c1e740-47c0-4190-8fb3-43d736bf38e3": "bruno alonso",
  "5314e128-f42f-47d8-90f3-5271d5d08901": "cami",
  "a51e0e3e-73c8-4473-bf6a-9d1128c3a520": "cristian hantis",
  "9d05efd3-9a19-49b2-a806-c09f139ca4a6": "cristian serpico",
  "7e446fd7-15f2-4105-8612-7127491c5543": "cundo",
  "22721af7-775d-4b10-8a72-66a13014ad19": "eze",
  "f2394401-1f21-41e0-a2b8-07acd55a7538": "fabrizio escolano",
  "abd819c2-72db-4cb2-a896-57c549af61e5": "felipe galante",
  "7be9fb39-8a8f-4b68-bb09-4d15e7ae505f": "gabriel talarico",
  "29ac10a1-15ae-434e-810c-6ea64ad900c0": "ignacio cejas",
  "6b779363-e353-4067-9db2-2c6e7005a05c": "jhose",
  "3ba5f8ad-592a-46f2-8cfd-f80dda308384": "kevin sivori",
  "d418fff2-7228-40a0-a37a-26abb575efac": "kraiizer",
  "558122fc-cbc3-4158-907a-5bc096cf27ca": "lucas aguilera",
  "9b0365d5-4b40-4ae1-9953-5b61b1b33fff": "lucas insua",
  "70bc5de0-ec97-4478-8840-0224a1e70b04": "luciano hufschmid",
  "85921264-0c92-444f-b985-862f005929ba": "mario talarico",
  "30305eca-6ac1-45a7-b7a0-4e5a5b7b55d1": "moreno perez",
  "a00b13ac-b366-4d90-b1b9-bc9b9dc6b18f": "nahuel gonzalez",
  "83c11079-99e1-48d1-9b47-9aed28e2bc8b": "nico avalos",
  "8d9fd64b-bb74-4ad4-9c67-7e752c722ee3": "pancho muzzio",
  "d2a2a001-8214-41a4-9cdd-4bdeb9722477": "renzo badano",
  "77eccd27-8234-48ed-9477-4a1e63f9dda8": "rodrigo soca",
  "9f149f8d-a923-4b4c-8b9a-bd053f1f134b": "rodrigo talarico",
  "816314d2-d124-4ba1-a3b2-f4facd580533": "santi",
  "a1118167-f961-4ecd-ba79-7174c3d4bc00": "veronica lucchesi",
  "d25c893a-744d-46f7-ad4b-a96005832a2e": "yago"
};
export function participantNameKey(name:string) {
 return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
}
export function participantNamedAsset(name?:string) {
 return name?participantNameAssets[participantNameKey(name)]:undefined;
}
export const historicalParticipantAssets: Record<number,Record<string,string>> = {};
export const teamAssets: Record<string,string> = {};
export function participantAsset(id?:string,season?:number) {
  return id ? (season?historicalParticipantAssets[season]?.[id]:undefined)??participantAssets[id]??participantNameAssets[participantShieldKeys[id]] : undefined;
}

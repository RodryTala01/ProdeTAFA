/** Curated real-world football competition marks, only for exact verified aliases.
 * Original images are served from Wikimedia Commons; sources/licences are in ASSETS.md.
 * We do not guess a badge from a generic name such as "Primera División".
 */
type LeagueLogoEntry = { file: string; names: string[] };

export const leagueLogoEntries: LeagueLogoEntry[] = [
  {file:'Pl-logo-light.svg', names:['Premier League','English Premier League','Premier League Inglaterra','Inglaterra Premier League']},
  {file:'Logo LPF AFA.svg', names:['Liga Profesional Argentina','Liga Profesional de Fútbol','Liga Profesional de Futbol Argentina','Liga Profesional','Primera División Argentina','Argentina Primera División','Liga Profesional de Argentina']},
  {file:'LaLiga EA Sports 2023 Vertical Logo.svg', names:['LaLiga','La Liga','La Liga EA Sports','LaLiga EA Sports','Primera División España','Primera División de España','España La Liga']},
  {file:'LaLiga Hypermotion 2023 Vertical Logo.svg', names:['LaLiga Hypermotion','La Liga 2','LaLiga 2','Segunda División España','Segunda División de España']},
  {file:'Serie A.svg', names:['Serie A','Serie A Italia','Serie A Italy','Italia Serie A','Lega Serie A']},
  {file:'Campeonato Brasileiro Série A logo (2026).svg', names:['Brasileirão','Brasileirao','Brasileirao Serie A','Brasileirão Série A','Brasileiro Série A','Brasil Serie A','Serie A Brasil','Campeonato Brasileiro Série A','Campeonato Brasileiro Serie A']},
  {file:'BetPlay-Dimayor logo.svg', names:['Primera A Colombia','Categoría Primera A','Categoria Primera A','Liga BetPlay','Liga BetPlay Dimayor','Colombia Primera A','Primera División Colombia']},
  {file:'Liga AUF Uruguaya - logo azul.png', names:['Primera División Uruguay','Campeonato Uruguayo','Liga AUF Uruguaya','Uruguay Primera División','Primera División de Uruguay']},
  {file:"Ligue 1 McDonald's logo.svg", names:['Ligue 1','Ligue 1 McDonalds',"Ligue 1 McDonald's",'Francia Ligue 1']},
  {file:'Bundesliga logo.svg', names:['Bundesliga','Bundesliga Alemania','Alemania Bundesliga','German Bundesliga']},
  {file:'Eredivisie nieuw logo 2017-.svg', names:['Eredivisie','Eredivisie Holanda','Eredivisie Países Bajos','Netherlands Eredivisie']},
  {file:'Liga Portugal Betclic logo.svg', names:['Primeira Liga','Liga Portugal','Liga Portugal Betclic','Portugal Primeira Liga']},
  {file:'Major League Soccer logo.svg', names:['MLS','Major League Soccer','Estados Unidos MLS']},
  {file:'Saudi Pro League Logo.svg', names:['Saudi Pro League','Saudi Professional League','Liga Profesional Saudí','Roshn Saudi League']},
  {file:'UEFA Champions League logo no text.svg', names:['UEFA Champions League','Champions League','Liga de Campeones UEFA']},
  {file:'UEFA Europa league logo.svg', names:['UEFA Europa League','Europa League','Liga Europa']},
  {file:'UEFA Conference League logo (2024 version).svg', names:['UEFA Conference League','Conference League','Europa Conference League']},
  {file:'Primera B Nacional logo.png', names:['Primera B Nacional Argentina','Primera B Nacional']},
];

export function normalizeLeagueName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
const leagueLogoFiles = new Map<string,string>();
for(const entry of leagueLogoEntries)for(const alias of entry.names){
  const key=normalizeLeagueName(alias);
  const previous=leagueLogoFiles.get(key);
  // Accented and unaccented aliases may normalize to the same competition.
  // Only reject conflicting assignments to DIFFERENT real-world leagues.
  if(previous && previous!==entry.file)throw new Error('Liga ambigua: '+alias);
  leagueLogoFiles.set(key,entry.file);
}
export function externalLeagueLogo(name?:string|null):string|undefined {
  if(!name)return undefined;
  const file=leagueLogoFiles.get(normalizeLeagueName(name));
  // Wikimedia's stable file resolver redirects to the image itself.
  return file?'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(file):undefined;
}

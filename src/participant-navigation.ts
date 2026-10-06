export const participantSections = [
 {id:'inicio',label:'Inicio',icon:'home'},{id:'pronosticos',label:'Pronósticos',icon:'list'},
 {id:'competiciones',label:'Competiciones',icon:'trophy'},{id:'club',label:'Mi Club',icon:'user'},
] as const;
export type ParticipantRoute = string;
export function participantRoute(hash:string):ParticipantRoute {
 const path=hash.replace(/^#\/?/,'');
 return /^(inicio|pronosticos|club|club\/historial|club\/participante\/[^/?]+|competiciones(?:\/(?:liga|liga-a|liga-b|copa-a|copa-b|copa-total|duos|campeones|papa|promocion))?)(\?season=\d+)?$/.test(path)?path:'inicio';
}

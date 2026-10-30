export const participantSections = [
 {id:'inicio',label:'Inicio',icon:'home'},{id:'pronosticos',label:'Pronósticos',icon:'list'},
 {id:'competiciones',label:'Competiciones',icon:'trophy'},{id:'club',label:'Mi Club',icon:'user'},{id:'historia',label:'Historia',icon:'book'},
] as const;
export type ParticipantRoute = string;
export function participantRoute(hash:string):ParticipantRoute {
 const path=hash.replace(/^#\/?/,'');
 const [base,query='']=path.split('?');
 if(base==='equipo')return 'club';
 if(base.startsWith('equipo/')&&!query&&base.slice('equipo/'.length))return 'club/participante/'+base.slice('equipo/'.length);
 if (!/^(historia(?:\/\d+(?:\/[A-Z0-9_]+)?)?|inicio|pronosticos|club|club\/historicos|club\/historial(?:\/\d+)?|club\/enfrentamientos|club\/envios|club\/participante\/[^/?]+|competiciones(?:\/(?:liga|liga-a|liga-b|copa-a|copa-b|copa-total|duos|campeones|papa|promocion))?)$/.test(base)) return 'inicio';
 const params=new URLSearchParams(query);
 if ([...params].some(([key,value])=>key==='view'?(!/^historia\/\d+(?:\/[A-Z0-9_]+)?$/.test(base)||!['resumen','competiciones','iffhs'].includes(value)):key==='season'?!/^\d+$/.test(value):key!=='user'||!base.startsWith('club/')||!value)) return 'inicio';
 return path;
}

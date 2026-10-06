// Presentation zones retained from the previous LeagueView; no qualification decisions.
export function leagueZone(position:number,total:number,division:string):{code:string;label:string}|null {
 if(division==='B'){if(position===1)return {code:'promotion',label:'Ascenso'};if(position===2||position===3)return {code:'playoff',label:'Promoción'};return null;}
 if(division!=='A')return null;
 if(position===1)return {code:'champion',label:'Campeón'};
 if(position>=Math.max(1,total-1))return {code:'relegation',label:'Descenso'};
 if(position>=Math.max(1,total-3)&&position<=Math.max(1,total-2))return {code:'playoff',label:'Promoción'};
 if(position>=2&&position<=Math.min(7,total))return {code:'champions',label:'Copa Campeones'};
 return null;
}

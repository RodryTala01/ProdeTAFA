export const worldCupZones = {
 MUNDIAL_ORO: 'Oro',
 MUNDIAL_PLATA: 'Plata',
 MUNDIAL_BRONCE: 'Bronce',
} as const;

export const isHistoricalFriendly=(code:string)=>code==='COPA_CLASICO';

export function isWorldCupOverall(code:string){
 return code==='MUNDIAL_QATAR_2022';
}

export const competitionFamily=(code:string)=>{
 const zone=/^(?:MUNDIAL|QATAR|ZONA)_/.test(code)?code.match(/(?:^|_)(ORO|PLATA|BRONCE)(?:_|$)/):null;
 if(zone)return 'MUNDIAL_'+zone[1];
 const base=code.replace(/_(?:19|20)\d{2}$/,'');
 switch(base){
  case 'COPA_AMERICA': case 'EUROCOPA': case 'MUNDIAL': return base;
  case 'MUNDIAL_CLUBES': case 'MUNDIAL_DE_CLUBES': case 'COPA_MUNDIAL_DE_CLUBES': return 'MUNDIAL_DE_CLUBES';
  case 'EUROAMERICA': case 'COPA_EUROAMERICA': return 'COPA_EUROAMERICA';
  default:return code;
 }
};

export function worldCupZone(code:string){
 const family=competitionFamily(code);
 if(family==='MUNDIAL')return 'Oro';
 return worldCupZones[family as keyof typeof worldCupZones];
}

export const worldCupZones = {
 MUNDIAL_ORO: 'Oro',
 MUNDIAL_PLATA: 'Plata',
 MUNDIAL_BRONCE: 'Bronce',
} as const;

export const isHistoricalFriendly=(code:string)=>code==='COPA_CLASICO';

export function isHistoryOnlyCompetition(code:string,name=code){
 const pattern=/^(AMISTOSO_NO_OFICIAL|DESAFIO_DE_CAMPEONES|DESAFIO_CAMPEONES)(?:_|$)/;
 const normalize=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,'_');
 return isHistoricalFriendly(code)||pattern.test(normalize(code))||pattern.test(normalize(name));
}
export const historicalCompetitionName=(name:string)=>name.replace(/^(Prode Pago)\s*\(no oficial\)$/i,'$1');

export function isWorldCupOverall(code:string){
 return code==='MUNDIAL_QATAR_2022';
}

export const competitionFamily=(code:string)=>{
 const clubWorld=/^(?:COPA_)?MUNDIAL_(?:DE_)?CLUBES(?:_|$)/.test(code);
 if(clubWorld)return /(?:^|_)PLATA(?:_|$)/.test(code)?'MUNDIAL_DE_CLUBES_PLATA':/(?:^|_)ORO(?:_|$)/.test(code)?'MUNDIAL_DE_CLUBES_ORO':'MUNDIAL_DE_CLUBES';
 const zone=/^(?:MUNDIAL|QATAR|ZONA)_/.test(code)?code.match(/(?:^|_)(ORO|PLATA|BRONCE)(?:_|$)/):null;
 if(zone)return 'MUNDIAL_'+zone[1];
 const base=code.replace(/_(?:19|20)\d{2}$/,'');
 switch(base){
  case 'COPA_AMERICA': case 'EUROCOPA': case 'MUNDIAL': return base;
  case 'MUNDIAL_CLUBES': case 'MUNDIAL_DE_CLUBES': case 'COPA_MUNDIAL_DE_CLUBES': return 'MUNDIAL_DE_CLUBES';
  case 'COPA_DE_CAMPEONES': case 'COPA_CAMPEONES': return 'COPA_CAMPEONES';
  case 'SUPERCOPA_EUROCOPA': case 'SUPERCOPA_EUROAMERICA': case 'SUPERCOPA_EURO_AMERICA': return 'SUPERCOPA_EUROAMERICA';
  case 'EUROAMERICA': case 'COPA_EUROAMERICA': return 'COPA_EUROAMERICA';
  default:return code;
 }
};

export function worldCupZone(code:string){
 const family=competitionFamily(code);
 if(family==='MUNDIAL')return 'Oro';
 return worldCupZones[family as keyof typeof worldCupZones];
}

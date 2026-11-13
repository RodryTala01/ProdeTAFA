export const competitionFamily=(code:string)=>{
 const base=code.replace(/_(?:19|20)\d{2}$/,'');
 switch(base){
  case 'COPA_AMERICA': case 'EUROCOPA': case 'MUNDIAL': return base;
  case 'MUNDIAL_CLUBES': case 'MUNDIAL_DE_CLUBES': case 'COPA_MUNDIAL_DE_CLUBES': return 'MUNDIAL_DE_CLUBES';
  case 'EUROAMERICA': case 'COPA_EUROAMERICA': return 'COPA_EUROAMERICA';
  default:return code;
 }
};

import {homeCompetitions,type HomeData} from './participant-home';
import {competitionHref,phaseName,entryMembers} from './participant-competitions';

const order=['LIGA_A','LIGA_B','COPA_A','COPA_B','COPA_TOTAL','COPA_DUOS','COPA_PAPA','COPA_CAMPEONES','PROMOCION'];
export function homeCompetitionName(code:string, fallback:string):string {
 const labels:Record<string,string>={LIGA_A:'Liga A',LIGA_B:'Liga B',COPA_A:'Copa A',COPA_B:'Copa B',
  COPA_TOTAL:'Total',COPA_DUOS:'Dúos',COPA_PAPA:'Papa',COPA_CAMPEONES:'Campeones',PROMOCION:'Promoción'};
 return labels[code]??fallback;
}
export function homeCompetitionDirectory(data:HomeData,user:string){
 const candidates=data.overview?.season?.competitions??data.season?.competitionCatalog??data.season?.competitions??[];
 const current=new Set(homeCompetitions(data,user).map(c=>c.competition.code));
 return candidates.filter(c=>c.code!=='PROMOCION'||data.overview?.season?.competitions.some(x=>x.code==='PROMOCION'))
  .map(c=>({code:c.code,name:homeCompetitionName(c.code,c.displayName),
    href:competitionHref(c.code,data.season?.seasonNumber),current:current.has(c.code)}))
  .sort((a,b)=>{
    const ia=order.indexOf(a.code),ib=order.indexOf(b.code);
    return (ia<0?999:ia)-(ib<0?999:ib);
  });
}
export function homeCompetitionStatuses(data:HomeData,user:string){
 const season=data.overview?.season;
 return homeCompetitions(data,user).map(card=>{
  const {competition:c,status,phase,context,sides,encounter}=card;
  const mine=data.league?.standings.find(row=>row.userId===user);
  const league=c.code===data.league?.competition.code;
  let primary=status;
  let detail:string|null=null;
  if(league){
    primary=mine?`${mine.position}° · ${mine.points} pts`:'Posición pendiente';
    detail=mine?.zone?.label??(data.league?.provisional?'Tabla provisional':status);
  }else{
    const isActive=status==='Participando'||status==='Clasificado'||status.startsWith('Participación registrada');
    if(isActive && phase)primary=phaseName(phase);
    if(context?.kind==='ACCUMULATIVE_GROUP'||context?.kind==='TOTAL_GROUP'){
      primary=context.group.name;
      detail=phase?phaseName(phase):status;
    }
    const opponent=context?.kind==='KNOCKOUT'?context.encounter.opponentName:null;
    const oppositeSide=sides.find(side=>!side.some(m=>m.userId===user));
    const oppositeNames=oppositeSide?.map(m=>m.fullName).join(' + ');
    if(opponent||oppositeNames)detail='vs. '+(opponent||oppositeNames);
    else if(encounter && status!=='Eliminado')detail='Rival por definir';
    else if(!detail && phase && primary!==phaseName(phase))detail=phaseName(phase);
    if(c.code==='COPA_DUOS'){
      const contextPartner=context?.kind==='DUO_SURVIVAL'?context.partner?.fullName
        :context?.kind==='KNOCKOUT'?context.partner?.fullName:null;
      const myEntry=season?.members.find(m=>m.competitionId===c.id&&m.userId===user&&m.validTo===null);
      const currentPartner=season&&myEntry?entryMembers(season,myEntry.entryId,null)
        .find(m=>m.userId!==user)?.fullName:undefined;
      const teammate=contextPartner??currentPartner;
      if(teammate)detail=detail?[detail,'Con '+teammate].join(' · '):'Con '+teammate;
    }
    if(status==='Eliminado'||status==='Campeón'||status==='Subcampeón') {
      primary=status;
      if(phase)detail=phaseName(phase);
    }
  }
  const tone=status==='Eliminado'?'danger':status==='Campeón'?'gold':league?'lime':
    c.code==='COPA_PAPA'?'gold':c.code==='COPA_DUOS'?'blue':'violet';
  return {code:c.code,name:homeCompetitionName(c.code,c.displayName),href:competitionHref(c.code,data.season?.seasonNumber),
    primary,detail,status,tone};
 }).sort((a,b)=>{
   const ia=order.indexOf(a.code),ib=order.indexOf(b.code);
   return (ia<0?999:ia)-(ib<0?999:ib);
 });
}

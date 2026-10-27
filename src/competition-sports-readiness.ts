import type {SetupCompetition,SetupSeason} from './AdminSeasonCenter';
export type SportPreparation={state:'confirmed'|'pending'|'error';label:string;detail:string};
export type SportsProgress=Record<string,SportPreparation>;
type ReadJson=(url:string)=>Promise<unknown>;
export const readSportJson:ReadJson=async url=>{
 const response=await fetch(url,{credentials:'same-origin'});
 if(!response.ok)throw new Error('No se pudo consultar el estado deportivo ('+response.status+')');
 return response.json();
};
const stageOf=(c:SetupCompetition,kind:string)=>c.stages.find(s=>s.stageType===kind);
const confirmed=(label:string,detail:string):SportPreparation=>({state:'confirmed',label,detail});
const pending=(detail:string):SportPreparation=>({state:'pending',label:'Pendiente',detail});
async function inspect(c:SetupCompetition,read:ReadJson):Promise<SportPreparation>{
 if(c.family==='LEAGUE')return confirmed('No requiere sorteo','Revisá divisiones, tabla y Fechas de Liga.');
 if(['COPA_A','COPA_B'].includes(c.code)){
  const st=stageOf(c,'ACCUMULATIVE_GROUPS');
  if(!st)return pending('Falta crear la etapa de grupos.');
  const data=await read('/api/admin/competition-engine/stages/'+st.id+'/groups') as {eligible?:unknown[];assignments?:unknown[]};
  const eligible=data.eligible?.length??0,assigned=data.assignments?.length??0;
  return eligible>0&&assigned===eligible?confirmed('Grupos confirmados',assigned+' participantes distribuidos en grupos.'):pending('Grupos pendientes · '+assigned+' de '+eligible+' participantes asignados.');
 }
 if(c.code==='COPA_TOTAL'){
  const st=stageOf(c,'ROUND_ROBIN_GROUPS');
  if(!st)return pending('Falta crear la etapa de grupos.');
  const data=await read('/api/admin/competition-engine/stages/'+st.id+'/total/groups') as {eligible?:unknown[];assignments?:unknown[];fixtureCount?:number};
  const eligible=data.eligible?.length??0,assigned=data.assignments?.length??0;
  return eligible>0&&assigned===eligible?confirmed('Grupos confirmados',assigned+' participantes · '+(data.fixtureCount??0)+' cruces generados.'):pending('Grupos pendientes · '+assigned+' de '+eligible+' participantes.');
 }
 if(c.code==='COPA_DUOS'){
  const data=await read('/api/admin/competition-engine/competitions/'+c.id+'/duos') as {eligible?:Array<{userId:string}>;pairs?:Array<{members?:Array<{userId:string;validUntilBeforeRoundId:number|null}>}>};
  const eligible=data.eligible?.map(p=>p.userId)??[];
  const members=(data.pairs??[]).flatMap(p=>(p.members??[]).filter(m=>m.validUntilBeforeRoundId==null).map(m=>m.userId));
  const valid=eligible.length>0&&eligible.length%2===0&&members.length===eligible.length&&new Set(members).size===eligible.length&&members.every(id=>eligible.includes(id));
  return valid?confirmed('Parejas confirmadas',(data.pairs?.length??0)+' dúos creados.'):pending('Parejas pendientes · '+(data.pairs?.length??0)+' dúos configurados.');
 }
 if(c.code==='COPA_CAMPEONES'){
  const [s,b]=await Promise.all([
   read('/api/competition-engine/competitions/'+c.id+'/champions/slots') as Promise<{slots:Array<{confirmedEntryId:number|null;status:string}>}>,
   read('/api/competition-engine/competitions/'+c.id+'/champions/bracket') as Promise<{bracket:unknown[]}>
  ]);
  const slots=s.slots??[];
  const valid=slots.length===14&&slots.every(x=>!!x.confirmedEntryId&&['confirmed','replaced'].includes(x.status));
  return valid&&(b.bracket?.length??0)>0?confirmed('Cupos y llave confirmados','14 cupos validados; llave fija inicializada.')
   :pending('Cupos confirmados: '+slots.filter(x=>!!x.confirmedEntryId).length+'/14 · '+((b.bracket?.length??0)>0?'Llave creada':'Llave pendiente')+'.');
 }
 if(c.code==='COPA_PAPA'){
  const d=await read('/api/competition-engine/competitions/'+c.id+'/papa/seeding-proposal') as {initial?:{hasEncounters:boolean;pairs?:unknown[]}};
  return d.initial?.hasEncounters?confirmed('Llave inicial confirmada',(d.initial.pairs?.length??0)+' cruces o pases libres registrados.'):pending('Llave inicial pendiente de confirmación.');
 }
 return pending('Configuración deportiva pendiente de revisión.');
}
export async function loadSportsProgress(season:SetupSeason,read:ReadJson=readSportJson):Promise<SportsProgress>{
 const cup=season.competitions.filter(c=>c.family!=='LEAGUE'&&c.code!=='PROMOCION');
 const resolved=await Promise.all(cup.map(async c=>{
  try{return [c.code,await inspect(c,read)] as const;}
  catch{return [c.code,{state:'error',label:'No verificado',detail:'No pudimos consultar el estado real; reintentá.'} as SportPreparation] as const;}
 }));
 return Object.fromEntries(resolved);
}

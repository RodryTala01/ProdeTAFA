import type {ReactNode} from 'react';
import {useState} from 'react';
import {CompetitionImage} from './AssetImage';
import {competitionHref,entryMembers,entryName,participation,phaseName,type Overview,type Season,type Competition,type Encounter} from './participant-competitions';

const families=[['LIGA_A','LIGA_B'],['COPA_A','COPA_B'],['COPA_TOTAL'],['COPA_DUOS'],['COPA_CAMPEONES'],['COPA_PAPA']];
const labels:Record<string,string>={LIGA_A:'Liga',LIGA_B:'Liga',COPA_A:'Copa A',COPA_B:'Copa B',COPA_TOTAL:'Copa Total',COPA_DUOS:'Copa Dúos',COPA_CAMPEONES:'Copa Campeones',COPA_PAPA:'Copa Papa'};
const tones:Record<string,string>={LIGA_A:'league',LIGA_B:'league',COPA_A:'division',COPA_B:'division',COPA_TOTAL:'total',COPA_DUOS:'duos',COPA_CAMPEONES:'champions',COPA_PAPA:'papa'};

export function visibleCompetitions(s:Season,user:string):Competition[] {
 const person=s.people.find(p=>p.userId===user);
 return families.flatMap(family=>{
  const all=family.map(code=>s.competitions.find(c=>c.code===code)).filter((c):c is Competition=>Boolean(c));
  if(all.length<=1)return all;
  const participating=all.find(c=>s.members.some(m=>m.competitionId===c.id&&m.userId===user));
  const byDivision=all.find(c=>person?.division&&c.code.endsWith('_'+person.division));
  const byId=all.find(c=>person?.divisionId&&c.divisionId===person.divisionId);
  return [participating??byDivision??byId??all[0]];
 });
}
function latestEncounter(s:Season,c:Competition,user:string):Encounter|null {
 const ids=new Set(s.stages.filter(st=>st.competitionId===c.id).map(st=>st.id));
 return s.encounters.filter(e=>ids.has(e.stageId)&&[e.entryAId,e.entryBId].some(id=>entryMembers(s,id,e.roundId).some(m=>m.userId===user))).at(-1)??null;
}
function currentPhase(s:Season,c:Competition) {
 const stages=s.stages.filter(st=>st.competitionId===c.id);
 const active=stages.find(st=>st.status==='active')??[...stages].reverse().find(st=>st.status==='finished')??stages[0];
 return active?phaseName(active.name):({draft:'Por comenzar',active:'En curso',finished:'Finalizada',archived:'Histórica'}[c.status]??'Sin configurar');
}
export function CompetitionDirectoryView({data,league}:{data:Overview;league?:{code:string;position:number;points:number}|null}) {
 const [filter,setFilter]=useState<'all'|'mine'>('all');const s=data.season;
 if(!s)return <section className="reference-section cx-empty"><h1>Competiciones</h1><p>Todavía no hay una temporada activa. Las competiciones aparecerán cuando comience.</p></section>;
 const all=visibleCompetitions(s,data.currentUserId);
 const selected=filter==='all'?all:all.filter(c=>participation(s,c,data.currentUserId)!=='No participás');
 return <section className="cx-directory" aria-labelledby="cx-directory-title">
   <header className="cx-directory-head"><div><div className="cx-heading-line"><h1 id="cx-directory-title">COMPETENCIAS</h1><span>T{s.seasonNumber} · {s.name}</span></div><p>Seguí las competencias de esta temporada.</p></div>
     <div className="cx-filters" role="group" aria-label="Filtrar competiciones">
       <button type="button" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Todas ({all.length})</button>
       <button type="button" aria-pressed={filter==='mine'} onClick={()=>setFilter('mine')}>Mis competencias</button>
     </div></header>
   {selected.length?<div className="cx-grid">{selected.map(c=>{
    const state=participation(s,c,data.currentUserId),encounter=latestEncounter(s,c,data.currentUserId);
    const isLeague=c.family==='LEAGUE',isCupDivision=c.code==='COPA_A'||c.code==='COPA_B';
    const description=isLeague||isCupDivision?'División '+c.code.slice(-1):c.code==='COPA_DUOS'?'Competencia por parejas':c.code==='COPA_TOTAL'?'Todos los participantes':c.code==='COPA_CAMPEONES'?'Los campeones se enfrentan':'Eliminación directa';
    const phase=currentPhase(s,c);
    return <a key={c.id} href={competitionHref(c.code,s.seasonNumber)} className={'cx-card cx-card--'+(tones[c.code]??'total')+(state==='Eliminado'?' cx-card--eliminated':'')} aria-label={'Ver '+(labels[c.code]??c.displayName)+' · '+description}>
      <div className="cx-card-top"><div className="cx-trophy"><CompetitionImage code={c.code} name={c.displayName} size="lg" season={s.seasonNumber} decorative/></div><div className="cx-card-name"><h2>{labels[c.code]??c.displayName}</h2><span>{description}</span></div><span className="cx-arrow" aria-hidden="true">↗</span></div>
      <div className="cx-card-body"><div className="cx-card-tags"><span className="cx-phase">{phase}</span>{state==='Eliminado'?<span className="cx-status cx-status--out">Eliminado</span>:state==='Campeón'?<span className="cx-status cx-status--won">Campeón</span>:state==='No participás'?<span className="cx-status cx-status--neutral">No participás</span>:state==='Clasificado'?<span className="cx-status cx-status--won">Clasificado</span>:null}</div>
      {isLeague&&league?.code===c.code?<div className="cx-card-metric"><span>Tu posición</span><strong>{league.position}.º</strong><span className="cx-metric-side">{league.points} PTS</span></div>
      :encounter?<div className="cx-card-fixture"><span className="cx-fixture-label">Tu cruce · {phaseName(s.stages.find(st=>st.id===encounter.stageId)?.name)}</span><div><span>{entryName(s,encounter.entryAId,encounter.roundId)}</span><strong>{encounter.scoreA??'–'} : {encounter.scoreB??'–'}</strong><span>{entryName(s,encounter.entryBId,encounter.roundId)}</span></div></div>
      :<div className="cx-card-note">{isLeague?'Consultá la tabla de posiciones':c.code==='COPA_DUOS'?'Consultá los dúos y sus integrantes':state==='No participás'?'Podés seguir los resultados y la llave':'Ver grupos, cruces y resultados'}</div>}</div>
      <div className="cx-card-footer">Ver competencia <span aria-hidden="true">→</span></div>
    </a>;
   })}</div>:<div className="cx-empty-filter">No participás en las competencias disponibles de esta edición. <button type="button" onClick={()=>setFilter('all')}>Ver todas</button></div>}
 </section>;
}
export function CompetitionFrame({s,c,user,children}:{s:Season;c:Competition;user:string;children:ReactNode}) {
 const shown=visibleCompetitions(s,user);
 return <div className="cx-layout"><aside className="cx-sidebar" aria-label="Elegir competencia">
   <div className="cx-sidebar-title">COMPETENCIAS <small>T{s.seasonNumber}</small></div>
   <a className="cx-sidebar-back" href="#/competiciones">← Todas las competencias</a>
   <div className="cx-nav-scroller"><div className="cx-sidebar-group"><span className="cx-sidebar-label">LIGA</span>{shown.filter(item=>item.family==='LEAGUE').map(item=><CompetitionNavItem key={item.id} s={s} c={item} active={c.id===item.id}/>)}</div>
   <div className="cx-sidebar-group"><span className="cx-sidebar-label">COPAS</span>{shown.filter(item=>item.family!=='LEAGUE').map(item=><CompetitionNavItem key={item.id} s={s} c={item} active={c.id===item.id}/>)}</div></div>
 </aside><main className="cx-detail"><div className="cx-breadcrumb"><a href="#/competiciones">Competencias</a><span aria-hidden="true">/</span><span>{labels[c.code]??c.displayName}</span></div>{children}</main></div>;
}
function CompetitionNavItem({s,c,active}:{s:Season;c:Competition;active:boolean}) {
 return <a className={'cx-nav-item'+(active?' cx-nav-item--active':'')} aria-current={active?'page':undefined} href={competitionHref(c.code,s.seasonNumber)}>
   <CompetitionImage code={c.code} name={c.displayName} size="sm" season={s.seasonNumber} decorative/><span>{labels[c.code]??c.displayName}{c.family==='LEAGUE'&&<small>División {c.code.slice(-1)}</small>}</span><span aria-hidden="true">›</span>
 </a>;
}

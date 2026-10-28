import {useEffect,useState} from 'react';
import {loadSportsProgress,type SportsProgress} from './competition-sports-readiness';
import {CompetitionImage} from './AssetImage';
import {ParticipantShield} from './AssetImage';
import './admin-season-center.css';

export type SetupStage={id:number;name:string;stageType:string;status:string;sequence:number};
export type SetupCompetition={id:number;code:string;displayName:string;status:string;family:string;divisionCode:string|null;stages:SetupStage[];roundLinks:{id:number;stageId:number;roundId:number;roundName:string;roundStatus:string}[]};
export type SetupSeason={id:number;seasonNumber:number;name:string;status:string;divisions:{id:number;code:string;name:string;memberCount:number}[];members:{userId:string;fullName:string;divisionCode:string;divisionId:number}[];competitions:SetupCompetition[]};
export type SetupFamily={key:string;title:string;description:string;codes:string[];primary:string;optional?:string[]};

export const setupFamilies:SetupFamily[]=[
 {key:'liga',title:'Liga',description:'Divisiones A y B · Promoción al final',codes:['LIGA_A','LIGA_B','PROMOCION'],primary:'LIGA_A',optional:['PROMOCION']},
 {key:'ab',title:'Copa A/B',description:'Una copa por división',codes:['COPA_A','COPA_B'],primary:'COPA_A'},
 {key:'total',title:'Copa Total',description:'Grupos, clasificación y llave',codes:['COPA_TOTAL'],primary:'COPA_TOTAL'},
 {key:'duos',title:'Copa Dúos',description:'Parejas, supervivencia y final',codes:['COPA_DUOS'],primary:'COPA_DUOS'},
 {key:'campeones',title:'Copa Campeones',description:'Cupos de campeones y llave fija',codes:['COPA_CAMPEONES'],primary:'COPA_CAMPEONES'},
 {key:'papa',title:'Copa Papa',description:'Propuesta histórica y pases libres',codes:['COPA_PAPA'],primary:'COPA_PAPA'},
];

export function familyCompetitions(season:SetupSeason,family:SetupFamily){
 return family.codes.map(code=>season.competitions.find(c=>c.code===code)).filter((c):c is SetupCompetition=>Boolean(c));
}
export function competitionTasks(c:SetupCompetition){
 const structure=c.stages.length>0;
 const dates=c.roundLinks.some(l=>l.roundStatus!=='cancelled');
 return {structure,dates};
}
export function familyReadiness(season:SetupSeason,f:SetupFamily) {
 const required=f.codes.filter(code=>!f.optional?.includes(code));
 const items=required.map(code=>season.competitions.find(c=>c.code===code));
 const created=items.filter(Boolean).length;
 const stages=items.filter(c=>c?.stages.length).length;
 const dates=items.filter(c=>c?.roundLinks.length).length;
 // Stages and linked dates do NOT prove that groups, seeding, entrants, or
 // qualifiers were confirmed. Avoid displaying a false "ready to activate".
 const structurallyPrepared=created===required.length&&stages===required.length&&dates===required.length;
 return {created,stages,dates,required:required.length,structurallyPrepared,
  label:created<required.length?'Sin crear':stages<required.length?'Faltan etapas':dates<required.length?'Faltan Fechas':'Revisar sorteo y cupos'};
}
export function firstPendingFamily(season:SetupSeason) {
 return setupFamilies.find(f=>!familyReadiness(season,f).structurallyPrepared)??setupFamilies[0];
}
export function AdminSeasonCenter({season,onSelectFamily,onSelectCompetition,onManageSeason}:{season:SetupSeason;onSelectFamily:(key:string)=>void;onSelectCompetition:(c:SetupCompetition)=>void;onManageSeason:()=>void}) {
 const [sport,setSport]=useState<SportsProgress>({});
 const [checking,setChecking]=useState(true);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
   let current=true;
   setChecking(true);
   setSport({});
   loadSportsProgress(season).then(data=>{if(current)setSport(data);}).finally(()=>{if(current)setChecking(false);});
   return ()=>{current=false;};
 },[season,revision]);
 const familySport=(f:SetupFamily)=>{
   if(f.key==='liga')return {ok:true,label:'Liga sin sorteo inicial',detail:'Las divisiones y las Fechas se revisan por separado.'};
   const codes=f.codes.filter(code=>code!=='PROMOCION');
   const states=codes.map(code=>sport[code]);
   if(checking||states.some(s=>!s))return {ok:false,label:'Consultando estado deportivo',detail:'Leyendo datos confirmados del servidor.'};
   if(states.some(s=>s.state==='error'))return {ok:false,label:'Estado sin verificar',detail:'No se pudieron consultar todas las competencias.'};
   return {ok:states.every(s=>s.state==='confirmed'),label:states.every(s=>s.state==='confirmed')?'Armado confirmado':'Armado pendiente',detail:states.map((s,i)=>codes[i].replace('COPA_','Copa ')+': '+s.detail).join(' · ')};
 };
 const count=setupFamilies.filter(f=>familyReadiness(season,f).structurallyPrepared&&familySport(f).ok).length;
 const next=setupFamilies.find(f=>!familyReadiness(season,f).structurallyPrepared||!familySport(f).ok)??setupFamilies[0];
 return <section className="asc-center" aria-label="Preparación de la temporada">
   <div className="asc-topline"><div><span className="eyebrow">CENTRO DE TEMPORADA</span><h2>T{season.seasonNumber} · Preparación</h2><p>Revisá las seis competencias y completá cada paso sin perderte entre formularios.</p></div><span className="asc-season-state">{season.status==='active'?'Temporada activa':season.status==='draft'?'En borrador':'Edición histórica'}</span></div>
   <div className="asc-progress"><div className="asc-progress-label"><strong>Estructura de competiciones</strong><span>{count} de 6 con estructura y armado verificados</span></div><progress max={6} value={count} aria-label="Estructuras de competencias preparadas"/><p>El progreso combina estructura y confirmaciones deportivas; los resultados y la activación se revisan por separado.</p><div className="topbar-actions"><button className="button button--primary" type="button" onClick={()=>onSelectFamily(next.key)}>Continuar preparación →</button><button className="button button--secondary" type="button" disabled={checking} onClick={()=>setRevision(x=>x+1)}>Actualizar estados</button></div></div>
   <div className="asc-cards">{setupFamilies.map(f=>{
     const info=familyReadiness(season,f),sportInfo=familySport(f),competition=season.competitions.find(c=>c.code===f.primary),available=familyCompetitions(season,f);
     const people=f.key==='liga'||f.key==='ab'?season.members.length:undefined;
     return <article className={'asc-card asc-card--'+f.key} key={f.key}>
       <div className="asc-card-header"><div className="asc-card-icon"><CompetitionImage code={competition?.code??f.primary} name={f.title} size="lg" season={season.seasonNumber} decorative/></div><div><h3>{f.title}</h3><p>{f.description}</p></div></div>
       <span className={'asc-state'+(info.structurallyPrepared&&sportInfo.ok?' asc-state--progress':'')}>{info.structurallyPrepared?sportInfo.label:info.label}</span>
       <ul className="asc-steps">
         <li className={info.created===info.required?'asc-done':''}>{info.created===info.required?'✓':'○'} Competiciones creadas ({info.created}/{info.required})</li>
         <li className={info.stages===info.required?'asc-done':''}>{info.stages===info.required?'✓':'○'} Etapas configuradas ({info.stages}/{info.required})</li>
         <li className={info.dates===info.required?'asc-done':''}>{info.dates===info.required?'✓':'○'} Fechas vinculadas ({info.dates}/{info.required})</li>
         <li className={sportInfo.ok?'asc-done':''}>{sportInfo.ok?'✓':'○'} {sportInfo.label}</li>
       </ul>
       <small>{sportInfo.detail}</small>
       {typeof people==='number'&&<small>{people} asignaciones a divisiones en la temporada</small>}
       {f.key==='liga'&&available.some(c=>c.code==='PROMOCION')&&<small>Promoción se administrará en la fase final de Liga.</small>}
       <button className="button button--secondary" type="button" onClick={()=>onSelectFamily(f.key)}>Revisar y configurar →</button>
     </article>;
   })}</div>
   <div className="asc-bottom"><p><strong>¿Necesitás modificar las divisiones?</strong> Podés revisarlas antes de preparar los sorteos. La asignación automática de ascensos y descensos se realiza mediante la transición auditada.</p><button type="button" className="button button--ghost" onClick={onManageSeason}>Administrar participantes y divisiones</button></div>
 </section>;
}

export function AdminFamilyOverview({season,family,onBack,onSelectCompetition}:{season:SetupSeason;family:SetupFamily;onBack:()=>void;onSelectCompetition:(c:SetupCompetition)=>void}) {
 const competitions=familyCompetitions(season,family);
 return <section className="asc-family"><button className="button button--ghost" type="button" onClick={onBack}>← Centro de temporada</button><header><span className="eyebrow">T{season.seasonNumber} · PREPARACIÓN GUIADA</span><h2>{family.title}</h2><p>{family.description}</p></header>
 <p>Elegí qué edición querés completar. El asistente conserva la configuración deportiva y las validaciones existentes.</p>{family.key==='liga'&&<p><strong>Fecha 6 · Promoción:</strong> se administra desde la etapa «Sorteo y fases» de Liga A o B, no como competencia aparte.</p>}
 <div className="asc-family-list">{family.codes.filter(code=>code!=='PROMOCION').map(code=>{
   const c=season.competitions.find(item=>item.code===code);const optional=family.optional?.includes(code);
   return <article key={code} className="asc-family-row"><div className="asc-family-icon"><CompetitionImage code={code} name={c?.displayName??code} size="md" season={season.seasonNumber} decorative/></div><div><h3>{c?.displayName??code.replaceAll('_',' ')}</h3><p>{optional?'Fase final de Liga · se prepara cuando correspondan las posiciones definitivas':c?'Etapas: '+c.stages.length+' · Fechas vinculadas: '+c.roundLinks.length:'No se encontró la edición; revisar la plantilla de temporada.'}</p></div>{c?<button className="button button--secondary" type="button" onClick={()=>onSelectCompetition(c)}>Configurar →</button>:<span className="asc-state">Sin crear</span>}</article>;
 })}</div>
 </section>;
}

export const setupSteps=[{key:'resumen',label:'Resumen'},{key:'participantes',label:'Participantes'},{key:'armado',label:'Sorteo y fases'},{key:'fechas',label:'Fechas y ajustes'},{key:'revision',label:'Revisión'}] as const;
export type SetupStep=typeof setupSteps[number]['key'];

export function CompetitionSetupHeader({season,competition,step,onStep,onBack}:{season:SetupSeason;competition:SetupCompetition;step:SetupStep;onStep:(step:SetupStep)=>void;onBack:()=>void}){
 const idx=setupSteps.findIndex(s=>s.key===step);
 return <div className="asc-guide">
   <div className="asc-guide-top"><button className="button button--ghost" type="button" onClick={onBack}>← Volver a las competencias</button><span className="eyebrow">T{season.seasonNumber} · Configuración guiada</span></div>
   <nav aria-label="Pasos de preparación" className="asc-step-nav">{setupSteps.map((s,i)=><button type="button" key={s.key} aria-current={step===s.key?'step':undefined} className={step===s.key?'asc-step-current':''} onClick={()=>onStep(s.key)}><b>{i+1}</b><span>{s.label}</span></button>)}</nav>
   <div className="asc-guide-title"><div><span className="eyebrow">PASO {idx+1} DE 5</span><h3>{setupSteps[idx].label}</h3></div><span className="asc-state">{competition.stages.length} etapas · {competition.roundLinks.length} Fechas</span></div>
 </div>;
}
export function AdminSetupParticipants({season,competition,onEditDivisions}:{season:SetupSeason;competition:SetupCompetition;onEditDivisions:()=>void}) {
 const code=competition.divisionCode;
 const people=season.members.filter(m=>!code||m.divisionCode===code);
 const unique=[...new Map(people.map(m=>[m.userId,m])).values()].sort((a,b)=>a.fullName.localeCompare(b.fullName));
 return <section className="asc-wizard-content"><h3>Participantes de {competition.displayName}</h3><p>{code?'Asignados a División '+code:'Asignados a las divisiones de esta temporada'}. Esta lista indica elegibilidad general; los cupos especiales y las parejas se confirman desde el paso de Sorteo y fases.</p><div className="asc-participant-grid">{unique.map(p=><div key={p.userId} className="asc-person"><ParticipantShield userId={p.userId} name={p.fullName} size="sm" decorative/><span>{p.fullName}</span><small>{p.divisionCode}</small></div>)}</div>{!unique.length&&<p role="status">Todavía no hay participantes con división asignada.</p>}<button className="button button--secondary" type="button" onClick={onEditDivisions}>Revisar asignaciones de la temporada</button></section>;
}
export function AdminSetupReview({season,competition,onStep}:{season:SetupSeason;competition:SetupCompetition;onStep:(s:SetupStep)=>void}) {
 const tasks=competitionTasks(competition);const division=competition.divisionCode;const persons=season.members.filter(m=>!division||m.divisionCode===division);
 return <section className="asc-wizard-content"><h3>Revisión antes de activar</h3><p>Esta lista revisa la estructura que podemos verificar. La confirmación de sorteos, cupos y ganadores debe hacerse dentro de cada herramienta deportiva; no se infiere a partir de Fechas vinculadas.</p>
 <div className="asc-review-row"><span>{persons.length?'✓':'!'} Participantes en la temporada: {persons.length}</span><button type="button" onClick={()=>onStep('participantes')}>Revisar</button></div>
 <div className="asc-review-row"><span>{tasks.structure?'✓':'!'} Etapas: {competition.stages.length}</span><button type="button" onClick={()=>onStep('fechas')}>Configurar</button></div>
 <div className="asc-review-row"><span>{tasks.dates?'✓':'!'} Fechas vinculadas: {competition.roundLinks.length}</span><button type="button" onClick={()=>onStep('fechas')}>Vincular</button></div>
 <div className="asc-review-row"><span>◇ Sorteos y cupos: verificar manualmente</span><button type="button" onClick={()=>onStep('armado')}>Revisar</button></div>
 <p className="asc-review-warning">No se activa automáticamente ninguna competición ni se ejecuta un sorteo desde este resumen.</p></section>;
}

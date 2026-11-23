import {useEffect,useState} from 'react';
import {cupApi} from './cup-ab-api';
type Stage={code:string;segmentCount:number;id:number;competitionId:number;name:string;type:string;competitionName:string;seasonNumber:number};
type Link={id:number;competitionId:number;stageId:number;purpose:string;competitionName:string;stageName:string;sequence:number};
type Encounter={id:number;stageId:number;slot:string;roundLinkId:number|null;roundId:number|null;nameA:string|null;nameB:string|null};
type Data={stages:Stage[];links:Link[];encounters:Encounter[];lockedReason:string|null};
type Round={id:number;name:string;status:string};
const base='/api/admin/competition-engine';
async function readLinks(roundId:number):Promise<Data>{
 const data=await cupApi<Data>(`${base}/scheduling/rounds/${roundId}`);
 if(!data||!Array.isArray(data.stages)||!Array.isArray(data.links)||!Array.isArray(data.encounters))throw new Error('No pudimos cargar las vinculaciones de competencias. Reintentá.');
 return data;
}
export default function RoundCompetitionLinks({roundId,rounds}:{roundId:number;rounds:Round[]}){
 const [data,setData]=useState<Data|null>(null),[stage,setStage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=async()=>setData(await readLinks(roundId));
 useEffect(()=>{let live=true;readLinks(roundId).then(d=>{if(live)setData(d);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[roundId]);
 async function run(action:()=>Promise<unknown>){setBusy(true);setError('');try{await action();await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const locked=busy||Boolean(data?.lockedReason);
 return <section className="card form-stack" aria-label="Competencias vinculadas a la Fecha">
  <h2>Competencias vinculadas</h2>
  <p>Elegí las fases que se juegan en esta Fecha. En eliminatorias podés asignar todos los cruces o sólo algunos.</p>
  {error&&<p role="alert">{error}</p>}
  {!data&&!error&&<p role="status">Cargando competencias…</p>}
  {data?.lockedReason&&<p role="status">{data.lockedReason}</p>}
  {data&&<>
   <label className="field">Competencia y fase
    <select value={stage} disabled={locked} onChange={e=>setStage(e.target.value)}>
     <option value="">Elegir fase</option>
     {data.stages.map(s=><option key={s.id} value={s.id}>T{s.seasonNumber} · {s.competitionName} · {s.name}</option>)}
    </select>
   </label>
   <button type="button" className="button button--secondary" disabled={locked||!stage||data.links.some(l=>l.stageId===Number(stage)&&l.purpose==='NORMAL')} onClick={()=>void run(async()=>{
    const chosen=data.stages.find(s=>s.id===Number(stage));if(!chosen)return;
    await cupApi(`${base}/competitions/${chosen.competitionId}/rounds`,'POST',{stageId:chosen.id,roundId});
   })}>Vincular fase</button>
   {!data.stages.length&&<p>No hay fases disponibles. Crealas desde Admin → Competiciones; no necesitan una Fecha.</p>}
   {!data.links.length&&<p>Esta Fecha todavía no tiene competencias vinculadas.</p>}
   {data.links.map(link=><LinkEditor key={link.id} link={link} encounters={data.encounters.filter(e=>e.stageId===link.stageId)} totalGroups={data.stages.some(s=>s.id===link.stageId&&s.code==='COPA_TOTAL'&&s.type==='ROUND_ROBIN_GROUPS')} segmentsReady={data.stages.some(s=>s.id===link.stageId&&s.segmentCount===6)} knockout={data.stages.some(s=>s.id===link.stageId&&s.type==='KNOCKOUT')} rounds={rounds.filter(r=>r.id!==roundId&&r.status==='draft')} locked={locked||link.purpose!=='NORMAL'} run={run}/>)}
  </>}
 </section>;
}
function LinkEditor({link,encounters,totalGroups,segmentsReady,knockout,rounds,locked,run}:{link:Link;encounters:Encounter[];totalGroups:boolean;segmentsReady:boolean;knockout:boolean;rounds:Round[];locked:boolean;run:(action:()=>Promise<unknown>)=>Promise<void>}){
 const [chosen,setChosen]=useState<number[]>(()=>encounters.filter(e=>e.roundLinkId===link.id).map(e=>e.id));
 const [destination,setDestination]=useState(''),[confirm,setConfirm]=useState(false);
 const assigned=encounters.filter(e=>e.roundLinkId===link.id).map(e=>e.id).join(',');
 useEffect(()=>setChosen(assigned?assigned.split(',').map(Number):[]),[assigned]);
 return <section className="form-stack" style={{borderTop:'1px solid var(--border)',paddingTop:'var(--space-3)'}}>
  <h3>{link.competitionName} · {link.stageName}</h3>
  <small>Fecha de fase {link.sequence}{link.purpose!=='NORMAL'?' · Desempate':''}</small>
  {totalGroups&&<div><p>Copa Total usa dos Fechas de 12 partidos. Al estar ambas listas, asigná sus partidos a las seis mini-fechas del fixture.</p><button type="button" className="button button--secondary" disabled={locked||segmentsReady} onClick={()=>void run(()=>cupApi(`${base}/stages/${link.stageId}/total/segments`,'POST',{}))}>{segmentsReady?'Partidos asignados a las mini-fechas':'Asignar partidos a las mini-fechas'}</button></div>}
  {knockout&&<>
   {!encounters.length&&<p>La fase está vinculada. Los cruces se pueden configurar sin Fecha desde Competiciones y asignar aquí después.</p>}
   {encounters.map(e=><label className="checkbox-row" key={e.id}>
    <input type="checkbox" checked={chosen.includes(e.id)} disabled={locked||(e.roundLinkId!==null&&e.roundLinkId!==link.id)} onChange={event=>setChosen(ids=>event.target.checked?[...ids,e.id]:ids.filter(id=>id!==e.id))}/>
    {e.slot} · {e.nameA??'Por definir'} vs {e.nameB??'Pase directo / por definir'}{e.roundLinkId!==null&&e.roundLinkId!==link.id?' · Asignado a otra Fecha':''}
   </label>)}
   {encounters.length>0&&<button type="button" className="button button--secondary" disabled={locked} onClick={()=>void run(()=>cupApi(`${base}/scheduling/links/${link.id}`,'PUT',{encounterIds:chosen}))}>Guardar enfrentamientos vinculados</button>}
  </>}
  {!locked&&<details><summary>Editar vinculación</summary>
   <label className="field">Mover la fase y sus cruces a otra Fecha
    <select value={destination} onChange={e=>setDestination(e.target.value)}><option value="">Elegir Fecha borrador</option>{rounds.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}</select>
   </label>
   <button type="button" className="button button--secondary" disabled={!destination} onClick={()=>void run(()=>cupApi(`${base}/scheduling/links/${link.id}`,'PATCH',{roundId:Number(destination)}))}>Mover vinculación</button>
   {!confirm?<button type="button" className="button button--ghost" onClick={()=>setConfirm(true)}>Desvincular fase</button>:<div><p>Se conservarán los cruces y el sorteo, sin Fecha asignada.</p><button type="button" className="button button--secondary" onClick={()=>void run(()=>cupApi(`${base}/scheduling/links/${link.id}`,'DELETE'))}>Confirmar desvinculación</button><button type="button" className="button button--ghost" onClick={()=>setConfirm(false)}>Cancelar</button></div>}
  </details>}
 </section>;
}

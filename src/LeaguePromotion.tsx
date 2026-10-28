import {useEffect,useState} from 'react';
import {entryMembers,entryName,phaseName,type Season} from './participant-competitions';

export default function LeaguePromotion({season,user}:{season:Season;user:string}){
 const promotion=season.competitions.find(c=>c.code==='PROMOCION');
 const [phase,setPhase]=useState<null|{ready:boolean;reason:string;rounds:Array<{roundId:number;name:string;status:string}>;encounters:number;movements:number}>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!promotion)return;
  const controller=new AbortController();setPhase(null);setError('');
  fetch('/api/competition-engine/competitions/'+promotion.id+'/promotion/slots',{signal:controller.signal})
    .then(async response=>{if(!response.ok)throw Error('Sin datos');return response.json();})
    .then(data=>{if(!controller.signal.aborted)setPhase(data.leaguePhase);})
    .catch(()=>{if(!controller.signal.aborted)setError('No pudimos verificar la preparación de la Fecha 6.');});
  return ()=>controller.abort();
 },[promotion?.id,season.seasonNumber]);
 if(!promotion)return null;
 const stages=season.stages.filter(st=>st.competitionId===promotion.id);
 const games=season.encounters.filter(e=>stages.some(st=>st.id===e.stageId));
 const mine=season.members.some(m=>m.competitionId===promotion.id&&m.userId===user);
 return <section className="reference-section league-promotion" aria-label="Fecha 6: Promoción">
  <div className="section-heading"><div><span className="eyebrow">LIGA · ETAPA FINAL</span><h2>Fecha 6 · Promoción</h2><p>Los cruces definen ascensos y permanencias entre las dos divisiones. No es una copa independiente.</p></div></div>
  {error&&<p role="status">{error}</p>}
  {!phase&&!error&&<p role="status">Verificando la Fecha 6…</p>}
  {phase&&!phase.ready&&games.length===0&&<p>{phase.reason}</p>}
  {phase?.ready&&games.length===0&&<p>Las dos Ligas completaron las cinco Fechas y sus posiciones oficiales. Falta confirmar los cupos y cruces de Promoción.</p>}
  {phase?.rounds?.length===1&&<p><strong>Fecha 6:</strong> {phase.rounds[0].name} · {phase.rounds[0].status==='finished'?'Finalizada':phase.rounds[0].status==='open'?'Abierta':'Programada'}</p>}
  {phase&&phase.movements>0&&<p>Movimientos de ascenso y permanencia propuestos: {phase.movements}. Su aplicación corresponde a la transición de temporada.</p>}
  {games.length>0&&<div className="cx-knockout">
   <div className="cx-knockout-head"><h3>Llave de Promoción</h3><small>{mine?'Seguí tu cruce':'Resultados y definiciones'}</small></div>
   <div className="cx-knockout-columns"><div className="cx-knockout-column"><h3>{phaseName(stages[0]?.name)}</h3>
   {games.map(e=><article className={'sport-encounter'+([e.entryAId,e.entryBId].some(id=>entryMembers(season,id,e.roundId).some(m=>m.userId===user))?' sport-encounter--mine':'')} key={e.id}>
    <small>{season.links.find(l=>l.roundId===e.roundId)?.name??'Fecha 6'}</small>
    {[e.entryAId,e.entryBId].map((id,index)=><div key={index} className={e.confirmedAt&&e.winnerEntryId===id?'sport-winner':''}><span>{id?entryName(season,id,e.roundId):'Por definir'}</span><strong>{(index===0?e.scoreA:e.scoreB)??'—'}</strong></div>)}
    <small>{e.confirmedAt?'Resultado confirmado':'Pendiente de confirmación'}</small>
   </article>)}</div></div>
  </div>}
 </section>;
}
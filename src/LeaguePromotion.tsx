import {entryMembers,entryName,phaseName,type Season} from './participant-competitions';

export default function LeaguePromotion({season,user}:{season:Season;user:string}){
 const promotion=season.competitions.find(c=>c.code==='PROMOCION');
 if(!promotion)return null;
 const league=season.competitions.filter(c=>c.family==='LEAGUE');
 const finished=league.length===2&&league.every(c=>{
   const linked=season.links.filter(link=>link.competitionId===c.id).sort((a,b)=>a.sequence-b.sequence);
   return linked.length>=5&&linked.slice(0,5).every(l=>l.status==='finished');
 });
 const stages=season.stages.filter(st=>st.competitionId===promotion.id);
 const games=season.encounters.filter(e=>stages.some(st=>st.id===e.stageId));
 const mine=season.members.some(m=>m.competitionId===promotion.id&&m.userId===user);
 return <section className="reference-section league-promotion" aria-label="Fecha 6: Promoción">
  <div className="section-heading"><div><span className="eyebrow">LIGA · ETAPA FINAL</span><h2>Fecha 6 · Promoción</h2><p>Los cruces definen ascensos y permanencias entre las dos divisiones. No es una copa independiente.</p></div></div>
  {!finished&&<p>Esta fase se disputa cuando hayan terminado las cinco Fechas de Liga y estén definidos los cupos.</p>}
  {finished&&games.length===0&&<p>Las cinco Fechas terminaron. Los cruces de Promoción todavía están por confirmar.</p>}
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
import {downloadRankingPng} from './export-ranking-png';
import {competitionHref,competitionSlugs} from './participant-competitions';
import {competitionFamily,worldCupZone} from './historical-competition-family';
import {historicalTrophies} from './historical-trophies';
import {useState} from 'react';
import {AssetImage,CompetitionImage,ParticipantShield} from './AssetImage';
import {useParticipantRead,ParticipantState} from './ParticipantState';
import type {PalmarTotal,GeneralTotal,IffhsTotal,TotalsData,PalmarAward,EditionPodium,RelegationTotal} from './historical-totals-types';
import type {HistoricalFinal} from './historical-finals';
import {Icon} from './ui';
import './historical-totals.css';

type Tab='palmares'|'competencia'|'oficial'|'iffhs'|'general'|'descensos';
const tabs:Array<{id:Tab;name:string}>=[
 {id:'palmares',name:'Palmarés'},{id:'competencia',name:'Por competencia'},
 {id:'oficial',name:'IFFHS Oficial'},{id:'iffhs',name:'IFFHS Total'},
 {id:'general',name:'Tabla general'},{id:'descensos',name:'Descensos totales'},
];
const fmt=(value:number)=>value.toLocaleString('es-AR',{maximumFractionDigits:2});
const decimal=(value:number|null)=>value===null?'—':value.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
function Player({userId,name}:{userId:string;name:string}){
 return <span className="totals-person">
  <ParticipantShield userId={userId.startsWith('hist:')?undefined:userId} name={name} size="sm" decorative/>
  <a href={'#/club/participante/'+encodeURIComponent(userId)}>{name}</a>
 </span>;
}
function CompetitionTrophy({code,name}:{code:string;name:string}){
 const family=competitionFamily(code),trophy=historicalTrophies[family];
 return trophy
  ?<AssetImage name={name} src={trophy?.image} size="sm" decorative fallback={<Icon name="trophy"/>}/>
  :<CompetitionImage code={code} name={name} variant="trophy" size="sm" decorative/>;
}
function Awards({count,kind,awards=[]}:{count:number;kind:'gold'|'silver';awards?:PalmarAward[]}){
 return <div className={'totals-awards totals-'+kind}>
  <strong aria-label={count+' '+(kind==='gold'?'campeonatos':'subcampeonatos')}>{count}</strong>
  {awards.length>0&&<ul>{awards.map(award=><li key={award.code+':'+award.seasonNumber} title={award.name+' · T'+award.seasonNumber} aria-label={award.name+' · T'+award.seasonNumber}>
   <CompetitionTrophy code={award.code} name={award.name}/>
   <small aria-hidden="true">T{award.seasonNumber}</small>
  </li>)}</ul>}
 </div>;
}
function leader<T extends {fullName:string}>(rows:T[],metric:(r:T)=>number|null,format=fmt){
 const valid=rows.filter(r=>metric(r)!=null);
 if(!valid.length)return '—';
 const max=Math.max(...valid.map(r=>metric(r)!));
 return valid.filter(r=>metric(r)===max).map(r=>r.fullName).join(' · ')+' — '+format(max);
}
function Indicators({items}:{items:Array<[string,string|number]>}){
 return <dl className="totals-indicators">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
export function HonourCards({rows,overall,latest}:{rows:PalmarTotal[];overall:boolean;latest?:{name:string;seasonNumber:number}}){
 const card=(label:string,metric:(r:PalmarTotal)=>number,icon:'trophy'|'user',tone:string)=>{
  const value=Math.max(0,...rows.map(metric));
  const winners=value>0?rows.filter(r=>metric(r)===value):[];
  const isParticipation=label==='Más participaciones';
  const displayed=isParticipation?winners.slice(0,2):winners;
  const rest=isParticipation?winners.slice(2):[];
  return <div className={'totals-card '+tone+(isParticipation?' totals-card--participations':'')} key={label}>
   <dt><Icon name={icon}/>{label}</dt><dd><strong>{value||'—'}</strong>
    {displayed.length>0&&<ul>{displayed.map(r=><li key={r.userId}><Player userId={r.userId} name={r.fullName}/></li>)}</ul>}
    {rest.length>0&&<details className="totals-card-more">
      <summary>Ver más · {rest.length} {rest.length===1?'participante':'participantes'}</summary>
      <ul>{rest.map(r=><li key={r.userId}><Player userId={r.userId} name={r.fullName}/></li>)}</ul>
    </details>}
   </dd>
  </div>;
 };
 return <dl className="totals-indicators totals-honour-cards">
  {card('Máximo campeón',r=>r.championships,'trophy','totals-gold')}
  {overall&&card('Más subcampeonatos',r=>r.runnerUps,'trophy','totals-silver')}
  {card('Más participaciones',r=>r.participations,'user','')}
  {overall?<div className="totals-card totals-registered"><dt><img src="/brand/tafa.png" alt=""/>Campeonatos registrados</dt><dd><strong>{rows.reduce((sum,r)=>sum+r.championships,0)}</strong></dd></div>:latest&&<div className="totals-card totals-gold"><dt><Icon name="trophy"/>Último campeón</dt><dd><strong>T{latest.seasonNumber}</strong><ul>{latest.name.split(' · ').map((name,i)=><li key={i}>{name}</li>)}</ul></dd></div>}
 </dl>;
}
function FinalContender({side,winner,season}:{side:HistoricalFinal['a'];winner:boolean;season:number}){
 return <div className="totals-final-contender" data-winner={winner||undefined}>
  {(side.members?.length?side.members:[side]).map(person=><div className="totals-final-person" key={person.userId??person.name}>
   <ParticipantShield userId={person.userId??undefined} name={person.name} season={season} size={side.members?.length?'sm':'md'} decorative/>
   <span>{person.name}</span>
  </div>)}
  {winner&&<span className="totals-final-winner">Campeón</span>}
 </div>;
}
export function FinalsCalendar({finals}:{finals:HistoricalFinal[]}){
 return <section className="totals-finals" aria-label="Calendario de finales por temporada">
  <div className="totals-finals-heading"><div><h3>Finales por temporada</h3><p>De la temporada más reciente a la primera · seleccioná una final para ver su historial</p></div><span>{finals.length} {finals.length===1?'final registrada':'finales registradas'}</span></div>
  {finals.length?<div className="totals-finals-grid">{finals.map(final=><a
    className="totals-final-card" key={final.id}
    href={final.id.startsWith('official:')&&competitionSlugs[final.competitionCode]?competitionHref(final.competitionCode,final.seasonNumber):'#/historia/'+final.seasonNumber+'/'+final.competitionCode}
    aria-label={'Final T'+final.seasonNumber+': '+final.a.name+' contra '+final.b.name+(final.winner?' · Campeón: '+final[final.winner].name:'')}
   >
    <div className="totals-final-entries">
     <FinalContender side={final.a} winner={final.winner==='a'} season={final.seasonNumber}/>
     {final.legs?.length?<div className="totals-final-score">{final.legs.map((leg,index)=><div key={index}><small>{leg.label}</small><div><strong>{leg.pointsA}–{leg.pointsB}</strong></div></div>)}</div>:<span className="totals-final-score" aria-label={final.pointsA===null||final.pointsB===null?'versus':final.pointsA+' a '+final.pointsB+' puntos'+(final.tieA!==undefined?' · Desempate '+final.tieA+' a '+final.tieB:'')}>
      {final.pointsA!==null&&final.pointsB!==null?<><strong>{final.pointsA}</strong>{final.tieA!==undefined&&<small>({final.tieA})</small>}<span>–</span>{final.tieB!==undefined&&<small>({final.tieB})</small>}<strong>{final.pointsB}</strong></>:<strong>vs.</strong>}
     </span>}
     <FinalContender side={final.b} winner={final.winner==='b'} season={final.seasonNumber}/>
    </div>
    <div className="totals-final-caption"><strong>T{final.seasonNumber}</strong><small>{final.encounters>1?final.encounters+' encuentros':'Final'}</small></div>
   </a>)}</div>:<p className="totals-finals-empty">Todavía no hay enfrentamientos de final registrados para esta competencia.</p>}
 </section>;
}
function EditionPodiums({editions,showPoints=true}:{editions:EditionPodium[];showPoints?:boolean}){
 if(!editions.length)return null;
 return <section className="totals-finals" aria-label="Resultados por temporada">
  <div className="totals-finals-heading"><h3>Resultados por temporada</h3></div>
  <div className="totals-podiums-grid">{editions.map(edition=><article className="totals-edition" key={edition.seasonNumber}>
   <ul>{edition.entrants.map(person=><li key={person.userId}>
    <span>{person.champion?'Campeón':'Subcampeón'}</span>
    <Player userId={person.userId} name={person.name}/>
    {showPoints&&person.points!==null&&<strong>{fmt(person.points)} PTS</strong>}
   </li>)}</ul>
   <div className="totals-final-caption"><strong>Temporada {edition.seasonNumber}</strong></div>
  </article>)}</div>
 </section>;
}
function Rows({rows}:{rows:PalmarTotal[]}){
 return <div className="totals-table-wrap" tabIndex={0} role="region" aria-label="Palmarés de participantes">
  <table className="totals-table totals-table--honours">
   <thead><tr><th>Pos.</th><th>Participante</th><th>Campeonatos</th><th>Subcampeonatos</th><th>Participaciones</th></tr></thead>
   <tbody>{rows.map(r=><tr key={r.userId} data-podium={r.position<=3?r.position:undefined}><td>{r.position}°</td><th scope="row"><Player userId={r.userId} name={r.fullName}/></th><td data-label="Campeonatos"><Awards count={r.championships} kind="gold" awards={r.awards?.filter(a=>a.champion)}/></td><td data-label="Subcampeonatos"><Awards count={r.runnerUps} kind="silver" awards={r.awards?.filter(a=>!a.champion)}/></td><td data-label="Participaciones">{r.participations}</td></tr>)}</tbody>
  </table>
 </div>;
}
function IffhsRows({rows,seasons,official}:{rows:IffhsTotal[];seasons:number[];official:boolean}){
 return <div className="totals-table-wrap" tabIndex={0} role="region" aria-label={official?'IFFHS Oficial':'IFFHS Total'}>
  <table className="totals-table">
   <thead><tr><th>Pos.</th><th>Participante</th>{official?seasons.map(n=><th key={n}>T{n}</th>):null}<th>PTS IFFHS</th>{!official&&<><th>Temporadas</th><th>Prom. / temp.</th><th>Detalle</th></>}</tr></thead>
   <tbody>{rows.map(r=><tr key={r.userId}><td>{r.position}°</td><th scope="row"><Player userId={r.userId} name={r.fullName}/></th>
    {official&&seasons.map(n=><td key={n} data-label={"T"+n}>{r.breakdown.find(b=>b.seasonNumber===n)?.points==null?'—':decimal(r.breakdown.find(b=>b.seasonNumber===n)?.points??null)}</td>)}
    <td className="totals-highlight" data-label="PTS IFFHS">{decimal(r.totalPoints)}</td>{!official&&<><td data-label="Temporadas">{r.seasons}</td><td data-label="Prom. / temp.">{decimal(r.average)}</td><td data-label="Detalle"><details className="totals-breakdown"><summary aria-label={'Temporadas de '+r.fullName}>Ver</summary><dl>{r.breakdown.map(b=><div key={b.seasonNumber}><dt>T{b.seasonNumber}</dt><dd>{decimal(b.points)}</dd></div>)}</dl></details></td></>}
   </tr>)}</tbody>
  </table>
 </div>;
}
function RelegationRows({rows}:{rows:RelegationTotal[]}){
 return <div className="totals-table-wrap" role="region" aria-label="Descensos totales" tabIndex={0}>
  <table className="totals-table totals-table--relegations">
   <thead><tr><th scope="col">Pos.</th><th scope="col">Participante</th><th scope="col">Descensos</th></tr></thead>
   <tbody>{rows.map(row=><tr key={row.userId}>
    <td>{row.position}°</td>
    <th scope="row"><Player userId={row.userId} name={row.fullName}/></th>
    <td data-label="Descensos">{row.relegations}</td>
   </tr>)}</tbody>
  </table>
 </div>;
}
function GeneralRows({rows}:{rows:GeneralTotal[]}){
 return <div className="totals-table-wrap" role="region" aria-label="Tabla general histórica" tabIndex={0}>
  <table className="totals-table totals-table--general">
   <thead><tr><th>#</th><th>Participante</th><th>PTS</th><th>Plenos</th><th>Parciales</th><th>Errores</th><th>Extras</th><th>Promedio por partido</th></tr></thead>
   <tbody>{rows.map(r=><tr key={r.userId}><td>{r.position}°</td><th scope="row"><Player userId={r.userId} name={r.fullName}/></th>
    <td className="totals-highlight" data-label="PTS">{fmt(r.points)}</td><td data-label="Plenos">{r.fulls===null?'—':fmt(r.fulls)}</td><td data-label="Parciales">{r.partials===null?'—':fmt(r.partials)}</td>
    <td data-label="Errores">{r.errors===null?'—':fmt(r.errors)}</td><td data-label="Extras">{r.extras===null?'—':fmt(r.extras)}</td>
    <td data-label="Prom. / partido">{decimal(r.averagePoints)}</td>
   </tr>)}</tbody>
  </table>
 </div>;
}
const regularCodes=['LIGA_A','LIGA_B','COPA_TOTAL','COPA_A','COPA_B','COPA_CAMPEONES','COPA_DUOS','COPA_PAPA'];

export function HistoricalTotalsView({data}:{data:TotalsData}){
 const [tab,setTab]=useState<Tab>('palmares');
 const [exporting,setExporting]=useState(false);
 const [exportError,setExportError]=useState(false);
 const [official,setOfficial]=useState(true);
 const regular=regularCodes.flatMap(code=>data.competitions.filter(c=>competitionFamily(c.code)===code));
 const other=data.competitions.filter(c=>!regularCodes.includes(competitionFamily(c.code)));
 const [code,setCode]=useState(regular[0]?.code??other[0]?.code??'');
 const selected=data.competitions.some(c=>c.code===code)?code:data.competitions[0]?.code??'';
 const worlds=data.competitions.filter(c=>worldCupZone(c.code));
 const activeWorld=Boolean(worldCupZone(selected));
 const preferredWorld=worlds.find(c=>competitionFamily(c.code)==='MUNDIAL_ORO')??worlds[0];
 const inOther=other.some(c=>c.code===selected);
 const rows=data.perCompetition[selected]??[];
 const honours=tab==='competencia'?rows:official?data.palmaresOfficial:data.palmares;
 const iffhs=tab==='oficial'?data.iffhsOfficial.ranking:data.iffhsTotal;
 const relegations=data.relegations??[];
 const family=competitionFamily(selected);
 const latest=data.latestChampions[family];
 const finals=family.startsWith('LIGA_')?[]:data.finalsByCompetition?.[family]??[];
 const finalsSeasons=new Set(finals.map(f=>f.seasonNumber));
 const podiums=(data.podiumsByCompetition?.[family]??[]).filter(edition=>!finalsSeasons.has(edition.seasonNumber));
 const titled=honours.filter(row=>row.championships>0||row.runnerUps>0);
 const title=tab==='palmares'?(official?'Palmarés Oficial':'Palmarés Total')
  :tab==='competencia'?(activeWorld?'Mundial · Zona '+worldCupZone(selected):data.competitions.find(c=>c.code===selected)?.name??'Por competencia')
  :tab==='oficial'?'IFFHS Oficial':tab==='iffhs'?'IFFHS Total':tab==='descensos'?'Descensos totales':'Tabla General Total';
 const identity=(row:{position:number;fullName:string})=>[String(row.position),row.fullName];
 const exportRows=tab==='general'
  ?data.general.map(r=>[...identity(r),fmt(r.points),...[r.fulls,r.partials,r.errors,r.extras].map(n=>n==null?'—':fmt(n)),decimal(r.averagePoints)])
  :tab==='iffhs'||tab==='oficial'
   ?iffhs.map(r=>[...identity(r),...(tab==='oficial'?data.iffhsOfficial.seasons.map(n=>decimal(r.breakdown.find(b=>b.seasonNumber===n)?.points??null)):[]),decimal(r.totalPoints),...(tab==='iffhs'?[String(r.seasons),decimal(r.average)]:[])])
   :tab==='descensos'?relegations.map(r=>[...identity(r),fmt(r.relegations)])
   :titled.map(r=>[...identity(r),fmt(r.championships),fmt(r.runnerUps),fmt(r.participations)]);
 const metrics=tab==='general'?['PTS','Plenos','Parciales','Errores','Extras','Prom. / partido']
  :tab==='oficial'?[...data.iffhsOfficial.seasons.map(n=>'T'+n),'PTS IFFHS']
  :tab==='iffhs'?['PTS IFFHS','Temporadas','Prom. / temp.']
  :tab==='descensos'?['Descensos']:['Campeonatos','Subcampeonatos','Participaciones'];
 async function exportPng(){
  setExporting(true);
  setExportError(false);
  try{await downloadRankingPng(title,['Pos.','Participante',...metrics],exportRows);}
  catch{setExportError(true);}
  finally{setExporting(false);}
 }
 return <div className="historical-totals">
  <div className="totals-header"><div><span className="totals-back">Estadísticas históricas de TAFA</span><h1>TABLAS TOTALES</h1></div><span className="totals-period">Todas las temporadas registradas</span></div>
  <nav className="totals-tabs" aria-label="Tablas Totales">{tabs.map(item=><button type="button" key={item.id} aria-pressed={item.id===tab} onClick={()=>setTab(item.id)}>{item.name}</button>)}</nav>
  <section className="totals-panel">
   <header className="totals-panel-title"><span className="totals-panel-icon">{tab==='palmares'||tab==='competencia'?<img src="/brand/tafa.png" alt="Escudo oficial TAFA" width="28" height="44"/>:tab==='general'||tab==='descensos'?'▥':'◉'}</span><div><h2>{(tab==='competencia'?'Palmarés por competencia':title).toLocaleUpperCase('es-AR')}</h2><p>{tab==='palmares'?'Campeonatos y subcampeonatos de todas las temporadas':tab==='competencia'?'Elegí la competencia para consultar sus campeones':tab==='oficial'?'Ranking de las últimas cinco temporadas':tab==='iffhs'?'Ranking IFFHS acumulado de todas las temporadas':tab==='descensos'?'Movimientos registrados en las temporadas históricas importadas':'Estadísticas acumuladas, ordenadas por puntos totales'}</p></div>
    {tab==='oficial'&&<span className="totals-period">Últimas 5 temporadas</span>}</header>
   <button type="button" className="button button--secondary" disabled={exporting||!exportRows.length} onClick={()=>void exportPng()}>{exporting?'Preparando PNG…':'Descargar tabla en PNG'}</button>
   {exportError&&<p role="alert">No pudimos preparar la imagen. Volvé a intentarlo.</p>}
   {tab==='competencia'&&<div className="totals-competitions" role="group" aria-label="Elegir competición">
    {regular.map(c=><button type="button" key={c.code} aria-pressed={selected===c.code} onClick={()=>setCode(c.code)}>
     <CompetitionTrophy code={c.code} name={c.name}/>{c.name}
    </button>)}
    {other.length>0&&<button type="button" aria-pressed={inOther} onClick={()=>{if(!inOther)setCode(preferredWorld?.code??other[0].code)}}>Otras</button>}
   </div>}
   {tab==='competencia'&&inOther&&<div className="totals-competitions" role="group" aria-label="Otras competiciones">
    {other.filter(c=>!worldCupZone(c.code)||c.code===preferredWorld?.code).map(c=>{
     const world=c.code===preferredWorld?.code;
     const name=world?'Mundial':c.name;
     return <button type="button" key={c.code} aria-pressed={world?activeWorld:selected===c.code} onClick={()=>setCode(c.code)}>
      <CompetitionTrophy code={c.code} name={name}/>{name}
     </button>;
    })}
   </div>}
   {tab==='competencia'&&activeWorld&&worlds.length>1&&<div className="totals-competitions" role="group" aria-label="Zonas del Mundial">
    {['Oro','Plata','Bronce'].flatMap(zone=>{
     const world=worlds.find(c=>worldCupZone(c.code)===zone);
     return world?[<button type="button" key={world.code} aria-pressed={world.code===selected} onClick={()=>setCode(world.code)}><CompetitionTrophy code={world.code} name={zone}/>{zone} · {zone==='Oro'?'Oficial':'No oficial'}</button>]:[];
    })}
   </div>}
   {tab==='palmares'&&<div className="totals-tabs" role="group" aria-label="Modalidad de palmarés"><button type="button" aria-pressed={official} onClick={()=>setOfficial(true)}>Palmarés Oficial</button><button type="button" aria-pressed={!official} onClick={()=>setOfficial(false)}>Palmarés Total</button></div>}
   {(tab==='palmares'||tab==='competencia')&&<><HonourCards rows={honours} overall={tab==='palmares'} latest={latest}/><Rows rows={titled}/>{tab==='competencia'&&<>{finals.length>0&&<FinalsCalendar finals={finals}/>}<EditionPodiums editions={podiums} showPoints={family.startsWith('LIGA_')}/></>}</>}
   {(tab==='oficial'||tab==='iffhs')&&<Indicators items={[
    ['Líder',leader(iffhs,r=>r.totalPoints,decimal)],['Puntos del líder',decimal(iffhs[0]?.totalPoints??null)],
    ['Temporadas consideradas',tab==='oficial'?data.iffhsOfficial.seasons.map(n=>'T'+n).join(' · '):iffhs[0]?.breakdown.length??0],
    ['Mejor promedio',leader(iffhs,r=>r.seasons?r.average:null,decimal)]
   ]}/>}
   {tab==='competencia'&&historicalTrophies[family]&&(()=>{
    const t=historicalTrophies[family];
    return <p className="totals-note">Imagen: <a href={'https://commons.wikimedia.org/wiki/File:'+t.source}>{t.author}</a> · <a href={'https://creativecommons.org/licenses/by-sa/'+t.license+'/'}>CC BY-SA {t.license}</a> · sin modificaciones.</p>;
   })()}
   {tab==='oficial'&&<IffhsRows rows={data.iffhsOfficial.ranking} seasons={data.iffhsOfficial.seasons} official/>}
   {tab==='iffhs'&&<IffhsRows rows={data.iffhsTotal} seasons={[]} official={false}/>}
   {tab==='general'&&<><Indicators items={[
    ['Máximo puntaje',leader(data.general,r=>r.points)],
    ['Mejor promedio',leader(data.general,r=>r.averagePoints,decimal)],
    ['Más plenos',leader(data.general,r=>r.fulls)],
    ['Participantes',data.general.length]
   ]}/><p className="totals-note">Las estadísticas suman los valores disponibles. El promedio usa las temporadas con plenos, parciales y errores registrados.</p><GeneralRows rows={data.general}/></>}
   {tab==='descensos'&&relegations.length>0&&<RelegationRows rows={relegations}/>}
   {((tab==='palmares'&&!honours.length)||(tab==='competencia'&&!rows.length)||(tab==='oficial'&&!data.iffhsOfficial.ranking.length)||(tab==='iffhs'&&!data.iffhsTotal.length)||(tab==='general'&&!data.general.length)||(tab==='descensos'&&!relegations.length))&&<p className="totals-empty">Todavía no hay datos históricos disponibles para este ranking.</p>}
  </section>
 </div>;
}
export default function ParticipantHistoricalTotals(){
 const read=useParticipantRead<TotalsData>('/api/participant/historical-totals','No pudimos cargar las tablas históricas.');
 return <><ParticipantState loading={read.loading} error={read.error} retry={read.retry}/>{read.data&&<HistoricalTotalsView data={read.data}/>}</>;
}

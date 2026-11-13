import {useState} from 'react';
import {CompetitionImage,ParticipantShield} from './AssetImage';
import {useParticipantRead,ParticipantState} from './ParticipantState';
import type {TotalsData,PalmarTotal,GeneralTotal,IffhsTotal} from '../worker/historical-totals';
import './historical-totals.css';

type Tab='palmares'|'competencia'|'oficial'|'iffhs'|'general';
const tabs:Array<{id:Tab;name:string}>=[
 {id:'palmares',name:'Palmarés total'},{id:'competencia',name:'Por competencia'},
 {id:'oficial',name:'IFFHS Oficial'},{id:'iffhs',name:'IFFHS Total'},
 {id:'general',name:'Tabla general'},
];
const fmt=(value:number)=>value.toLocaleString('es-AR',{maximumFractionDigits:2});
const decimal=(value:number|null)=>value===null?'—':value.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
function Player({userId,name}:{userId:string;name:string}){
 return <span className="totals-person">
  <ParticipantShield userId={userId.startsWith('hist:')?undefined:userId} name={name} size="xs" decorative/>
  {userId.startsWith('hist:')?<span>{name}</span>:<a href={'#/club/participante/'+encodeURIComponent(userId)}>{name}</a>}
 </span>;
}
function Rows({rows,compact=false}:{rows:PalmarTotal[];compact?:boolean}){
 return <div className="totals-table-wrap" tabIndex={0} role="region" aria-label="Palmarés de participantes">
  <table className="totals-table">
   <thead><tr><th>Pos.</th><th>Participante</th><th>Campeonatos</th><th>Subcampeonatos</th>{!compact&&<th>Participaciones</th>}</tr></thead>
   <tbody>{rows.map(r=><tr key={r.userId}><td>{r.position}°</td><th scope="row"><Player userId={r.userId} name={r.fullName}/></th><td className="totals-highlight">{r.championships}</td><td>{r.runnerUps}</td>{!compact&&<td>{r.participations}</td>}</tr>)}</tbody>
  </table>
 </div>;
}
function IffhsRows({rows,seasons,official}:{rows:IffhsTotal[];seasons:number[];official:boolean}){
 return <div className="totals-table-wrap" tabIndex={0} role="region" aria-label={official?'IFFHS Oficial':'IFFHS Total'}>
  <table className="totals-table">
   <thead><tr><th>Pos.</th><th>Participante</th>{official?seasons.map(n=><th key={n}>T{n}</th>):null}<th>PTS IFFHS</th>{!official&&<><th>Temporadas</th><th>Prom. / temp.</th></>}</tr></thead>
   <tbody>{rows.map(r=><tr key={r.userId}><td>{r.position}°</td><th scope="row"><Player userId={r.userId} name={r.fullName}/></th>
    {official&&seasons.map(n=><td key={n}>{r.breakdown.find(b=>b.seasonNumber===n)?.points==null?'—':decimal(r.breakdown.find(b=>b.seasonNumber===n)!.points)}</td>)}
    <td className="totals-highlight">{decimal(r.totalPoints)}</td>{!official&&<><td>{r.seasons}</td><td>{decimal(r.average)}</td></>}
   </tr>)}</tbody>
  </table>
 </div>;
}
function GeneralRows({rows}:{rows:GeneralTotal[]}){
 return <div className="totals-table-wrap" role="region" aria-label="Tabla general histórica" tabIndex={0}>
  <table className="totals-table totals-table--general">
   <thead><tr><th>#</th><th>Participante</th><th>PTS</th><th>Plenos</th><th>Parciales</th><th>Errores</th><th>Extras</th><th>Fechas</th><th>Prom. PTS</th><th>Prom. Pl.</th><th>Prom. Par.</th><th>Prom. Err.</th><th>Prom. Ext.</th></tr></thead>
   <tbody>{rows.map(r=><tr key={r.userId}><td>{r.position}°</td><th scope="row"><Player userId={r.userId} name={r.fullName}/></th>
    <td className="totals-highlight">{fmt(r.points)}</td><td>{r.fulls===null?'—':fmt(r.fulls)}</td><td>{r.partials===null?'—':fmt(r.partials)}</td>
    <td>{r.errors===null?'—':fmt(r.errors)}</td><td>{r.extras===null?'—':fmt(r.extras)}</td>
    <td>{r.dates===null?'—':fmt(r.dates)}</td><td>{decimal(r.averagePoints)}</td>
    <td>{decimal(r.averageFulls)}</td><td>{decimal(r.averagePartials)}</td>
    <td>{decimal(r.averageErrors)}</td><td>{decimal(r.averageExtras)}</td>
   </tr>)}</tbody>
  </table>
 </div>;
}
export function HistoricalTotalsView({data}:{data:TotalsData}){
 const [tab,setTab]=useState<Tab>('palmares');
 const [code,setCode]=useState(data.competitions[0]?.code??'');
 const selected=data.competitions.some(c=>c.code===code)?code:data.competitions[0]?.code??'';
 const title=tabs.find(x=>x.id===tab)?.name??'Tablas Totales';
 const rows=data.perCompetition[selected]??[];
 return <div className="historical-totals">
  <div className="totals-header"><div><a href="#/historia" className="totals-back">Historia / Estadísticas históricas</a><h1>TABLAS TOTALES</h1></div><span className="totals-period">Todas las temporadas registradas</span></div>
  <nav className="totals-tabs" aria-label="Tablas Totales">{tabs.map(item=><button type="button" key={item.id} aria-pressed={item.id===tab} onClick={()=>setTab(item.id)}>{item.name}</button>)}</nav>
  <section className="totals-panel">
   <header className="totals-panel-title"><span className="totals-panel-icon">{tab==='palmares'||tab==='competencia'?'🏆':tab==='general'?'▥':'◉'}</span><div><h2>{tab==='palmares'?'PALMARÉS TOTAL':tab==='competencia'?'PALMARÉS POR COMPETENCIA':tab==='oficial'?'IFFHS OFICIAL':tab==='iffhs'?'IFFHS TOTAL':'TABLA GENERAL TOTAL'}</h2><p>{tab==='palmares'?'Campeonatos y subcampeonatos de todas las temporadas':tab==='competencia'?'Elegí la competencia para consultar sus campeones':tab==='oficial'?'Ranking de las últimas cinco temporadas':tab==='iffhs'?'Ranking IFFHS acumulado de todas las temporadas':'Estadísticas acumuladas, ordenadas por puntos totales'}</p></div>
    {tab==='oficial'&&<span className="totals-period">Últimas 5 temporadas</span>}</header>
   {tab==='competencia'&&<div className="totals-competitions" role="group" aria-label="Elegir competición">{data.competitions.map(c=><button type="button" key={c.code} aria-pressed={selected===c.code} onClick={()=>setCode(c.code)}><CompetitionImage code={c.code} name={c.name} variant="trophy" size="xs" decorative/>{c.name}</button>)}</div>}
   {tab==='palmares'&&<Rows rows={data.palmares} compact/>}
   {tab==='competencia'&&<Rows rows={rows}/>}
   {tab==='oficial'&&<IffhsRows rows={data.iffhsOfficial.ranking} seasons={data.iffhsOfficial.seasons} official/>}
   {tab==='iffhs'&&<IffhsRows rows={data.iffhsTotal} seasons={[]} official={false}/>}
   {tab==='general'&&<><p className="totals-note">Promedios por Fecha jugada. Cuando no existe un recuento histórico fiable de Fechas se indica «—».</p><GeneralRows rows={data.general}/></>}
   {((tab==='palmares'&&!data.palmares.length)||(tab==='competencia'&&!rows.length)||(tab==='oficial'&&!data.iffhsOfficial.ranking.length)||(tab==='iffhs'&&!data.iffhsTotal.length)||(tab==='general'&&!data.general.length))&&<p className="totals-empty">Todavía no hay datos históricos disponibles para este ranking.</p>}
  </section>
 </div>;
}
export default function ParticipantHistoricalTotals(){
 const read=useParticipantRead<TotalsData>('/api/participant/historical-totals','No pudimos cargar las tablas históricas.');
 return <><ParticipantState loading={read.loading} error={read.error} retry={read.retry}/>{read.data&&<HistoricalTotalsView data={read.data}/>}</>;
}

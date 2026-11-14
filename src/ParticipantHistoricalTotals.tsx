import {competitionFamily} from './historical-competition-family';
import {historicalTrophies} from './historical-trophies';
import {useState} from 'react';
import {AssetImage,CompetitionImage,ParticipantShield} from './AssetImage';
import {useParticipantRead,ParticipantState} from './ParticipantState';
import type {PalmarTotal,GeneralTotal,IffhsTotal,TotalsData} from './historical-totals-types';
import {Icon} from './ui';
import './historical-totals.css';

type Tab='palmares'|'competencia'|'oficial'|'iffhs'|'general';
const tabs:Array<{id:Tab;name:string}>=[
 {id:'palmares',name:'Palmarés'},{id:'competencia',name:'Por competencia'},
 {id:'oficial',name:'IFFHS Oficial'},{id:'iffhs',name:'IFFHS Total'},
 {id:'general',name:'Tabla general'},
];
const fmt=(value:number)=>value.toLocaleString('es-AR',{maximumFractionDigits:2});
const decimal=(value:number|null)=>value===null?'—':value.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
function Player({userId,name}:{userId:string;name:string}){
 return <span className="totals-person">
  <ParticipantShield userId={userId.startsWith('hist:')?undefined:userId} name={name} size="sm" decorative/>
  {userId.startsWith('hist:')?<span>{name}</span>:<a href={'#/club/participante/'+encodeURIComponent(userId)}>{name}</a>}
 </span>;
}
function CompetitionTrophy({code,name}:{code:string;name:string}){
 const family=competitionFamily(code),trophy=historicalTrophies[family];
 return trophy||family==='COPA_EUROAMERICA'
  ?<AssetImage name={name} src={trophy?.image} size="sm" decorative fallback={<Icon name="trophy"/>}/>
  :<CompetitionImage code={code} name={name} variant="trophy" size="sm" decorative/>;
}
function Awards({count,kind}:{count:number;kind:'gold'|'silver'}){
 return <span className={'totals-awards totals-'+kind} aria-label={count+' '+(kind==='gold'?'campeonatos':'subcampeonatos')}>
  {Array.from({length:Math.min(count,2)},(_,i)=><Icon key={i} name="trophy"/>)}<strong>{count>2?'+'+(count-2):count}</strong>{count>2&&<small>({count} total)</small>}
 </span>;
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
function HonourCards({rows,overall,latest}:{rows:PalmarTotal[];overall:boolean;latest?:{name:string;seasonNumber:number}}){
 const card=(label:string,metric:(r:PalmarTotal)=>number,icon:'trophy'|'user',tone:string)=>{
  const value=Math.max(0,...rows.map(metric));
  return <div className={'totals-card '+tone}><dt><Icon name={icon}/>{label}</dt><dd><strong>{value||'—'}</strong>{value>0&&<ul>{rows.filter(r=>metric(r)===value).map(r=><li key={r.userId}><Player userId={r.userId} name={r.fullName}/></li>)}</ul>}</dd></div>;
 };
 return <dl className="totals-indicators totals-honour-cards">
  {card('Máximo campeón',r=>r.championships,'trophy','totals-gold')}
  {overall&&card('Más subcampeonatos',r=>r.runnerUps,'trophy','totals-silver')}
  {card('Más participaciones',r=>r.participations,'user','')}
  {overall?<div className="totals-card totals-registered"><dt><img src="/brand/tafa.png" alt=""/>Campeonatos registrados</dt><dd><strong>{rows.reduce((sum,r)=>sum+r.championships,0)}</strong></dd></div>:latest&&<div className="totals-card totals-gold"><dt><Icon name="trophy"/>Último campeón</dt><dd><strong>T{latest.seasonNumber}</strong><ul>{latest.name.split(' · ').map((name,i)=><li key={i}>{name}</li>)}</ul></dd></div>}
 </dl>;
}
function Rows({rows}:{rows:PalmarTotal[]}){
 return <div className="totals-table-wrap" tabIndex={0} role="region" aria-label="Palmarés de participantes">
  <table className="totals-table totals-table--honours">
   <thead><tr><th>Pos.</th><th>Participante</th><th>Campeonatos</th><th>Subcampeonatos</th><th>Participaciones</th></tr></thead>
   <tbody>{rows.map(r=><tr key={r.userId} data-podium={r.position<=3?r.position:undefined}><td>{r.position}°</td><th scope="row"><Player userId={r.userId} name={r.fullName}/></th><td><Awards count={r.championships} kind="gold"/></td><td><Awards count={r.runnerUps} kind="silver"/></td><td>{r.participations}</td></tr>)}</tbody>
  </table>
 </div>;
}
function IffhsRows({rows,seasons,official}:{rows:IffhsTotal[];seasons:number[];official:boolean}){
 return <div className="totals-table-wrap" tabIndex={0} role="region" aria-label={official?'IFFHS Oficial':'IFFHS Total'}>
  <table className="totals-table">
   <thead><tr><th>Pos.</th><th>Participante</th>{official?seasons.map(n=><th key={n}>T{n}</th>):null}<th>PTS IFFHS</th>{!official&&<><th>Temporadas</th><th>Prom. / temp.</th><th>Detalle</th></>}</tr></thead>
   <tbody>{rows.map(r=><tr key={r.userId}><td>{r.position}°</td><th scope="row"><Player userId={r.userId} name={r.fullName}/></th>
    {official&&seasons.map(n=><td key={n}>{r.breakdown.find(b=>b.seasonNumber===n)?.points==null?'—':decimal(r.breakdown.find(b=>b.seasonNumber===n)?.points??null)}</td>)}
    <td className="totals-highlight">{decimal(r.totalPoints)}</td>{!official&&<><td>{r.seasons}</td><td>{decimal(r.average)}</td><td><details className="totals-breakdown"><summary aria-label={'Temporadas de '+r.fullName}>Ver</summary><dl>{r.breakdown.map(b=><div key={b.seasonNumber}><dt>T{b.seasonNumber}</dt><dd>{decimal(b.points)}</dd></div>)}</dl></details></td></>}
   </tr>)}</tbody>
  </table>
 </div>;
}
function GeneralRows({rows}:{rows:GeneralTotal[]}){
 return <div className="totals-table-wrap" role="region" aria-label="Tabla general histórica" tabIndex={0}>
  <table className="totals-table totals-table--general">
   <thead><tr><th>#</th><th>Participante</th><th>PTS</th><th>Plenos</th><th>Parciales</th><th>Errores</th><th>Extras</th><th>Promedio</th></tr></thead>
   <tbody>{rows.map(r=><tr key={r.userId}><td>{r.position}°</td><th scope="row"><Player userId={r.userId} name={r.fullName}/></th>
    <td className="totals-highlight">{fmt(r.points)}</td><td>{r.fulls===null?'—':fmt(r.fulls)}</td><td>{r.partials===null?'—':fmt(r.partials)}</td>
    <td>{r.errors===null?'—':fmt(r.errors)}</td><td>{r.extras===null?'—':fmt(r.extras)}</td>
    <td>{decimal(r.averagePoints)}</td>
   </tr>)}</tbody>
  </table>
 </div>;
}
export function HistoricalTotalsView({data}:{data:TotalsData}){
 const [tab,setTab]=useState<Tab>('palmares');
 const [official,setOfficial]=useState(true);
 const [code,setCode]=useState(data.competitions[0]?.code??'');
 const selected=data.competitions.some(c=>c.code===code)?code:data.competitions[0]?.code??'';
 const rows=data.perCompetition[selected]??[];
 const honours=tab==='competencia'?rows:official?data.palmaresOfficial:data.palmares;
 const iffhs=tab==='oficial'?data.iffhsOfficial.ranking:data.iffhsTotal;
 const latest=data.latestChampions[competitionFamily(selected)];
 return <div className="historical-totals">
  <div className="totals-header"><div><a href="#/historia" className="totals-back">Historia / Estadísticas históricas</a><h1>TABLAS TOTALES</h1></div><span className="totals-period">Todas las temporadas registradas</span></div>
  <nav className="totals-tabs" aria-label="Tablas Totales">{tabs.map(item=><button type="button" key={item.id} aria-pressed={item.id===tab} onClick={()=>setTab(item.id)}>{item.name}</button>)}</nav>
  <section className="totals-panel">
   <header className="totals-panel-title"><span className="totals-panel-icon">{tab==='palmares'||tab==='competencia'?<img src="/brand/tafa.png" alt="Escudo oficial TAFA" width="28" height="44"/>:tab==='general'?'▥':'◉'}</span><div><h2>{tab==='palmares'?(official?'PALMARÉS OFICIAL':'PALMARÉS TOTAL'):tab==='competencia'?'PALMARÉS POR COMPETENCIA':tab==='oficial'?'IFFHS OFICIAL':tab==='iffhs'?'IFFHS TOTAL':'TABLA GENERAL TOTAL'}</h2><p>{tab==='palmares'?'Campeonatos y subcampeonatos de todas las temporadas':tab==='competencia'?'Elegí la competencia para consultar sus campeones':tab==='oficial'?'Ranking de las últimas cinco temporadas':tab==='iffhs'?'Ranking IFFHS acumulado de todas las temporadas':'Estadísticas acumuladas, ordenadas por puntos totales'}</p></div>
    {tab==='oficial'&&<span className="totals-period">Últimas 5 temporadas</span>}</header>
   {tab==='competencia'&&<div className="totals-competitions" role="group" aria-label="Elegir competición">{data.competitions.map(c=><button type="button" key={c.code} aria-pressed={selected===c.code} onClick={()=>setCode(c.code)}><CompetitionTrophy code={c.code} name={c.name}/>{c.name}</button>)}</div>}
   {tab==='palmares'&&<div className="totals-tabs" role="group" aria-label="Modalidad de palmarés"><button type="button" aria-pressed={official} onClick={()=>setOfficial(true)}>Palmarés Oficial</button><button type="button" aria-pressed={!official} onClick={()=>setOfficial(false)}>Palmarés Total</button></div>}
   {(tab==='palmares'||tab==='competencia')&&<><HonourCards rows={honours} overall={tab==='palmares'} latest={latest}/><Rows rows={honours}/></>}
   {(tab==='oficial'||tab==='iffhs')&&<Indicators items={[
    ['Líder',leader(iffhs,r=>r.totalPoints,decimal)],['Puntos del líder',decimal(iffhs[0]?.totalPoints??null)],
    ['Temporadas consideradas',tab==='oficial'?data.iffhsOfficial.seasons.map(n=>'T'+n).join(' · '):iffhs[0]?.breakdown.length??0],
    ['Mejor promedio',leader(iffhs,r=>r.seasons?r.average:null,decimal)]
   ]}/>}
   {tab==='competencia'&&competitionFamily(selected)==='COPA_AMERICA'&&<p className="totals-note">Imagen: <a href="https://copaamerica.com/es/novedades/copa-america-trofeo-original-restaurado-campeon-2024">CONMEBOL Copa América · trofeo original restaurado</a></p>}
   {tab==='competencia'&&competitionFamily(selected)!=='COPA_AMERICA'&&Object.values(historicalTrophies).some(t=>t===historicalTrophies[competitionFamily(selected)])&&(()=>{
    const t=historicalTrophies[competitionFamily(selected)];
    return <p className="totals-note">Imagen: <a href={'https://commons.wikimedia.org/wiki/File:'+t.source}>{t.author}</a> · <a href={'https://creativecommons.org/licenses/by-sa/'+t.license+'/'}>CC BY-SA {t.license}</a> · sin modificaciones.</p>;
   })()}
   {tab==='oficial'&&<IffhsRows rows={data.iffhsOfficial.ranking} seasons={data.iffhsOfficial.seasons} official/>}
   {tab==='iffhs'&&<IffhsRows rows={data.iffhsTotal} seasons={[]} official={false}/>}
   {tab==='general'&&<><Indicators items={[
    ['Máximo puntaje',leader(data.general,r=>r.points)],
    ['Mejor promedio',leader(data.general,r=>r.averagePoints,decimal)],
    ['Más plenos',leader(data.general,r=>r.fulls)],
    ['Participantes',data.general.length]
   ]}/><p className="totals-note">Promedio de puntos por pronóstico puntuable.</p><GeneralRows rows={data.general}/></>}
   {((tab==='palmares'&&!honours.length)||(tab==='competencia'&&!rows.length)||(tab==='oficial'&&!data.iffhsOfficial.ranking.length)||(tab==='iffhs'&&!data.iffhsTotal.length)||(tab==='general'&&!data.general.length))&&<p className="totals-empty">Todavía no hay datos históricos disponibles para este ranking.</p>}
  </section>
 </div>;
}
export default function ParticipantHistoricalTotals(){
 const read=useParticipantRead<TotalsData>('/api/participant/historical-totals','No pudimos cargar las tablas históricas.');
 return <><ParticipantState loading={read.loading} error={read.error} retry={read.retry}/>{read.data&&<HistoricalTotalsView data={read.data}/>}</>;
}

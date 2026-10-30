import {useEffect,useState,type ReactNode} from 'react';
import {AssetImage,ParticipantShield} from './AssetImage';
import {competitionAsset} from './competition-assets';
import {Icon} from './ui';
import type {HistorySummary,HistoryDetail} from './history-types';
import type {ArchivePayload,ArchiveCompetition} from './historical-schema';
import './participant-archive.css';

const resultNames:Record<string,string>={CHAMPION:'Campeón',RUNNER_UP:'Subcampeón',THIRD:'Tercero',SEMIFINAL:'Semifinal',QUARTERFINAL:'Cuartos de final',ROUND_OF_16:'Octavos de final',GROUP_STAGE:'Fase de grupos',POSITION:'Posición final',ELIMINATED:'Eliminado',QUALIFIED:'Clasificado'};
const display=(n:number|null|undefined)=>n??'—';
const decimals=new Intl.NumberFormat('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
type ArchiveView='resumen'|'competiciones'|'iffhs';
export function historicalExtras(r:{points:number;fulls:number|null;partials:number|null;extras:number|null}){
 return r.extras??(r.fulls!==null&&r.partials!==null?r.points-3*r.fulls-r.partials:null);
}
function Trophy({code,name,season,large=false}:{code:string;name:string;season:number;large?:boolean}){
 const asset=competitionAsset(code,season);
 return <span className={'archive-emblem'+(large?' archive-emblem--large':'')}><AssetImage src={asset.trophy||asset.logo} name={name} size={large?'lg':'md'} fallback={<Icon name="trophy"/>}/></span>;
}
function Person({data,id}:{data:ArchivePayload;id:string}){
 const p=data.participants.find(p=>p.key===id);
 return <span className="archive-person">{p?.userId?<ParticipantShield userId={p.userId} name={p.name} size="sm" decorative/>:<span className="archive-avatar" aria-hidden="true"><Icon name="user"/></span>}{p?.userId?<a href={'#/club/participante/'+encodeURIComponent(p.userId)}>{p.name}</a>:<span>{p?.name||'Participante no disponible'}</span>}</span>;
}
function Empty({children='Información no disponible.'}:{children?:ReactNode}){return <div className="archive-empty"><Icon name="book"/><p>{children}</p></div>;}
function SectionHeading({title,detail}:{title:string;detail?:string}){return <div className="archive-section-heading"><h2>{title}</h2>{detail&&<span>{detail}</span>}</div>;}
function StatsTable({data,rows,label,positions=false}:{data:ArchivePayload;rows:Array<{participantKey:string;position?:number;points:number;fulls:number|null;partials:number|null;errors:number|null;extras:number|null}>;label:string;positions?:boolean}){
 return <div className="archive-table" role="region" aria-label={label} tabIndex={0}><table><caption className="sr-only">{label}</caption><thead><tr>{positions&&<th scope="col">Posición</th>}<th scope="col">Participante</th><th scope="col">Puntos</th><th scope="col">Plenos</th><th scope="col">Parciales</th><th scope="col">Errores</th><th scope="col">Extras</th></tr></thead><tbody>{rows.map(r=><tr key={r.participantKey}>{positions&&<td><span className={'archive-position'+(r.position===1?' archive-position--first':'')}>{display(r.position)}{r.position!==undefined?'°':''}</span></td>}<th scope="row"><Person data={data} id={r.participantKey}/></th><td className="archive-points">{r.points}</td><td>{display(r.fulls)}</td><td>{display(r.partials)}</td><td>{display(r.errors)}</td><td>{display(historicalExtras(r))}</td></tr>)}</tbody></table></div>;
}
function Podium({detail,code}:{detail:HistoryDetail;code?:string}){
 const {data,summary}=detail;
 const awards=data.results.filter(r=>(!code||r.competitionCode===code)&&['CHAMPION','RUNNER_UP'].includes(r.resultCode)).sort((a,b)=>(a.resultCode==='CHAMPION'?0:1)-(b.resultCode==='CHAMPION'?0:1));
 return awards.length?<div className="archive-podium">{awards.map((r,i)=>{
  const c=data.competitions.find(c=>c.code===r.competitionCode),row=data.standings.find(s=>s.competitionCode===r.competitionCode&&s.participantKey===r.participantKey);
  const champion=r.resultCode==='CHAMPION';
  return <article className={'archive-award'+(champion?' archive-award--champion':'')} key={r.competitionCode+':'+r.participantKey+':'+i}><Trophy code={r.competitionCode} name={c?.name||r.competitionCode} season={summary.number} large/><div className="archive-award__body"><span className="archive-award__label">{resultNames[r.resultCode]}</span><h3>{c?.name||r.competitionCode}</h3><Person data={data} id={r.participantKey}/>{r.teamLabel&&<p>{r.teamLabel}</p>}</div>{row&&<div className="archive-award__points"><strong>{row.points}</strong><span>puntos</span></div>}</article>;
 })}</div>:<Empty>Sin resultados finales declarados.</Empty>;
}
function CompetitionDetail({detail,competition}:{detail:HistoryDetail;competition:ArchiveCompetition}){
 const {data,summary}=detail,c=competition;
 const standings=data.standings.filter(r=>r.competitionCode===c.code).sort((a,b)=>a.position-b.position);
 const results=data.results.filter(r=>r.competitionCode===c.code);
 const rounds=data.rounds.filter(r=>(r.competitionCode||(data.competitions.length===1?c.code:null))===c.code);
 const matches=data.matches.filter(r=>r.competitionCode===c.code);
 const links=detail.officialLinks.filter(l=>l.code===c.code);
 const roundNames=[...new Set(rounds.map(r=>r.round))];
 return <div className="archive-competition">
  <div className="archive-competition-heading"><Trophy code={c.code} name={c.name} season={summary.number}/><div><span className="archive-kicker">Competición · T{summary.number}</span><h2>{c.name}</h2></div></div>
  <Podium detail={detail} code={c.code}/>
  <section className="archive-panel"><SectionHeading title="Tabla final" detail={standings.length?standings.length+' participantes':undefined}/>{standings.length?<StatsTable data={data} rows={standings} positions label={'Tabla de '+c.name}/>:results.length?<div className="archive-table" role="region" aria-label={'Puestos de '+c.name} tabIndex={0}><table><thead><tr><th scope="col">Posición</th><th scope="col">Participante</th><th scope="col">Fase alcanzada</th></tr></thead><tbody>{[...results].sort((a,b)=>(a.position??Infinity)-(b.position??Infinity)).map((r,i)=><tr key={i}><td><span className="archive-position">{display(r.position)}</span></td><th scope="row"><Person data={data} id={r.participantKey}/></th><td>{resultNames[r.resultCode]||r.resultCode}</td></tr>)}</tbody></table></div>:<Empty>Tabla final no disponible.</Empty>}</section>
  {(roundNames.length>0||links.length>0)&&<section className="archive-panel"><SectionHeading title="Resultados por Fecha" detail={roundNames.length?roundNames.length+' Fechas':undefined}/>{roundNames.map(round=><details className="archive-round" key={round}><summary><span><Icon name="calendar"/>{round}</span><span>Ver resultados</span></summary><StatsTable data={data} rows={rounds.filter(r=>r.round===round)} label={c.name+' · '+round}/></details>)}{links.length>0&&<div className="archive-round-links">{links.map(l=><a className="button button--secondary" key={l.roundId} href={'#/club/historial/'+l.roundId}>{l.name}<Icon name="arrow"/></a>)}</div>}</section>}
  {matches.length>0&&<section className="archive-panel"><SectionHeading title="Enfrentamientos oficiales" detail={matches.length+' cruces'}/><div className="archive-table" role="region" aria-label={'Cruces de '+c.name} tabIndex={0}><table><thead><tr><th scope="col">Fase / Fecha</th><th scope="col">Participante</th><th scope="col">Resultado</th><th scope="col">Rival</th></tr></thead><tbody>{matches.map((m,i)=><tr key={m.matchId||i}><td><strong>{m.stage}</strong>{m.round&&<small>{m.round}</small>}{m.scoreBasis==='DUO'&&<small>Puntaje de dúo</small>}</td><th scope="row"><Person data={data} id={m.aKey}/></th><td className="archive-score">{m.pointsA} – {m.pointsB}</td><td><Person data={data} id={m.bKey}/></td></tr>)}</tbody></table></div></section>}
  {(!roundNames.length&&!links.length||!matches.length)&&<p className="archive-availability">{!roundNames.length&&!links.length&&<span>Sin desglose por Fecha disponible.</span>}{!matches.length&&<span>Sin enfrentamientos oficiales disponibles.</span>}</p>}
 </div>;
}
function Iffhs({detail}:{detail:HistoryDetail}){
 const {data}=detail;
 return <section className="archive-panel archive-iffhs"><SectionHeading title="Ranking IFFHS" detail={data.iffhs.length?data.iffhs.length+' participantes':undefined}/><p className="archive-table-note">Puntos IFFHS de esta temporada, independientes del puntaje deportivo.</p>{data.iffhs.length?<div className="archive-table" role="region" aria-label="IFFHS de la temporada" tabIndex={0}><table><thead><tr><th scope="col">Posición</th><th scope="col">Participante</th><th scope="col">Puntos IFFHS</th></tr></thead><tbody>{[...data.iffhs].sort((a,b)=>b.points-a.points).map(r=><tr key={r.participantKey}><td><span className={'archive-position'+(r.position===1?' archive-position--first':'')}>{display(r.position)}</span></td><th scope="row"><Person data={data} id={r.participantKey}/></th><td className="archive-points">{decimals.format(r.points)}</td></tr>)}</tbody></table></div>:<Empty>Información IFFHS no disponible.</Empty>}</section>;
}
export function SeasonDetail({detail,competition,view}:{detail:HistoryDetail;competition?:string;view?:ArchiveView}){
 const {data,summary}=detail;
 const active=view||(competition?'competiciones':'resumen');
 const selected=data.competitions.find(c=>c.code===competition)||(!competition?data.competitions[0]:undefined);
 const root='#/historia/'+summary.number;
 const total=(key:'points'|'extras')=>data.statistics.length&&data.statistics.every(r=>r[key]!==null)?data.statistics.reduce((n,r)=>n+(r[key]??0),0):null;
 return <>
  <header className="archive-hero"><div className="archive-breadcrumb"><a href="#/historia">Historia</a><span aria-hidden="true">/</span><span>T{summary.number}</span></div><div className="archive-hero__row"><div><span className="archive-kicker">Temporada {summary.number}</span><h1>{summary.name}</h1><p>{summary.source==='mixed'?'Temporada histórica y oficial':summary.source==='imported'?'Temporada histórica':'Temporada oficial'}</p></div><span className="archive-edition" aria-hidden="true">T<strong>{summary.number}</strong></span></div><div className="archive-meta"><span><Icon name="user"/>{display(summary.participantCount)} participantes</span><span><Icon name="trophy"/>{summary.competitions.length} {summary.competitions.length===1?'competición':'competiciones'}</span></div></header>
  <nav className="archive-tabs" aria-label="Vistas de la temporada"><a href={root} aria-current={active==='resumen'?'page':undefined}><Icon name="book"/>Resumen</a><a href={competition?root+'/'+competition:root+'?view=competiciones'} aria-current={active==='competiciones'?'page':undefined}><Icon name="trophy"/>Competiciones</a><a href={root+'?view=iffhs'} aria-current={active==='iffhs'?'page':undefined}><Icon name="list"/>IFFHS</a></nav>
  {active==='resumen'?<>
   <div className="archive-metrics"><div><span>Participantes</span><strong>{display(summary.participantCount)}</strong></div><div><span>Competiciones</span><strong>{summary.competitions.length}</strong></div>{total('points')!==null&&<div><span>Puntos deportivos</span><strong>{total('points')}</strong></div>}{total('extras')!==null&&<div><span>Extras</span><strong>{total('extras')}</strong></div>}</div>
   <section><SectionHeading title="Protagonistas de la temporada"/><Podium detail={detail}/></section>
   <section><SectionHeading title="Competiciones disputadas" detail={summary.competitions.length.toString()}/><div className="archive-competition-grid">{summary.competitions.map(c=><a className="archive-competition-link" key={c.code} href={root+'/'+c.code}><Trophy code={c.code} name={c.name} season={summary.number}/><span><strong>{c.name}</strong><small>Tabla y resultados</small></span><Icon name="arrow"/></a>)}</div></section>
   <a className="archive-ranking-link" href={root+'?view=iffhs'}><span className="archive-emblem"><Icon name="list"/></span><span><strong>IFFHS de la temporada</strong><small>{data.iffhs.length?data.iffhs.length+' participantes · Ver clasificación':'Información no disponible'}</small></span><Icon name="arrow"/></a>
   {data.movements.length>0&&<section className="archive-panel"><SectionHeading title="Ascensos y descensos"/><ul className="archive-movements">{data.movements.map((m,i)=><li key={i}><Person data={data} id={m.participantKey}/><span className="archive-movement-type">{m.type}</span><span>{m.fromDivision||'—'} → {m.toDivision||'—'}</span>{m.detail&&<small>{m.detail}</small>}</li>)}</ul></section>}
  </>:active==='iffhs'?<Iffhs detail={detail}/>:<><nav className="archive-competition-tabs" aria-label="Competiciones de la temporada">{summary.competitions.map(c=><a key={c.code} aria-current={selected?.code===c.code?'page':undefined} href={root+'/'+c.code}>{c.name}</a>)}</nav>{selected?<CompetitionDetail detail={detail} competition={selected}/>:<Empty>Competición sin información disponible.</Empty>}</>}
 </>;
}
export default function ParticipantArchive({route}:{route:string}){
 const [path,query='']=route.split('?');const [,number,competition]=path.split('/');
 const requested=new URLSearchParams(query).get('view');const view=requested==='iffhs'||requested==='competiciones'?requested:undefined;
 const [seasons,setSeasons]=useState<HistorySummary[]>([]),[detail,setDetail]=useState<HistoryDetail|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [search,setSearch]=useState(''),[kind,setKind]=useState('');
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');
  fetch('/api/participant/history'+(number?'/'+number:''),{signal:controller.signal}).then(async res=>{const body=await res.json();if(!res.ok)throw Error(body.error||'No pudimos cargar Historia.');return body;}).then(body=>{if(controller.signal.aborted)return;if(number)setDetail(body);else setSeasons(body.seasons);setLoading(false);}).catch(e=>{if(!controller.signal.aborted){setError(e instanceof Error?e.message:'No pudimos cargar Historia.');setLoading(false);}});
  return ()=>controller.abort();
 },[number,revision]);
 if(loading)return <div className="participant-archive"><div className="archive-loading" role="status"><Icon name="book"/><h1>Historia</h1><p>Cargando temporadas y resultados…</p></div></div>;
 if(error)return <div className="participant-archive"><section className="archive-panel archive-error"><Icon name="book"/><h1>Historia</h1><p role="alert">{error}</p><div><button className="button button--primary" onClick={()=>setRevision(n=>n+1)}>Reintentar</button><a className="button button--secondary" href="#/historia">Volver a Historia</a></div></section></div>;
 if(number&&detail)return <div className="participant-archive"><SeasonDetail detail={detail} competition={competition} view={view}/></div>;
 const filtered=seasons.filter(s=>(s.number+' '+s.name).toLocaleLowerCase().includes(search.toLocaleLowerCase())&&(!kind||s.competitions.some(c=>c.kind===kind)));
 return <div className="participant-archive"><header className="archive-hero"><div className="archive-hero__row"><div><span className="archive-kicker">Archivo TAFA</span><h1>Historia</h1><p>Temporadas, títulos y estadísticas</p></div><span className="archive-hero__icon"><Icon name="book"/></span></div><div className="archive-meta"><span>{seasons.length} {seasons.length===1?'temporada disponible':'temporadas disponibles'}</span></div></header><div className="archive-filters"><label><span>Buscar temporada</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Número o nombre"/></label><label><span>Tipo de competición</span><select value={kind} onChange={e=>setKind(e.target.value)}><option value="">Todas las competiciones</option><option value="LEAGUE">Liga</option><option value="CUP">Copa</option><option value="TOURNAMENT">Torneo</option><option value="PROMOTION">Promoción</option></select></label></div>
  {!filtered.length?<Empty>{seasons.length?'No hay temporadas para estos filtros.':'Todavía no hay temporadas históricas disponibles.'}</Empty>:<div className="archive-season-grid">{filtered.map(s=><article className="archive-season-card" key={s.number}><div className="archive-season-card__heading"><span className="archive-season-number">T{s.number}</span><span className="archive-source">{s.source==='official'?'Oficial':s.source==='mixed'?'Histórica / oficial':'Histórica'}</span></div><h2><a href={'#/historia/'+s.number}>{s.name}</a></h2><div className="archive-season-facts"><span>{s.competitions.length} {s.competitions.length===1?'competición':'competiciones'}</span>{s.participantCount!==null&&<span>{s.participantCount} participantes</span>}</div><ul className="archive-season-cups">{s.competitions.map(c=><li key={c.code}><Trophy code={c.code} name={c.name} season={s.number}/><span><strong>{c.name}</strong>{c.champions.length>0?<small><span className="archive-champion-label">Campeón</span>{c.champions.join(' · ')}</small>:<small>Sin campeón declarado</small>}</span></li>)}</ul><a className="archive-season-cta" href={'#/historia/'+s.number}>Ver temporada<Icon name="arrow"/></a></article>)}</div>}
 </div>;
}

import {useEffect,useState} from 'react';
import {CompetitionImage,ParticipantShield} from './AssetImage';
import type {HistorySummary,HistoryDetail} from './history-types';
import type {ArchivePayload} from './historical-schema';
import './participant-archive.css';

const resultNames:Record<string,string>={CHAMPION:'Campeón',RUNNER_UP:'Subcampeón',THIRD:'Tercero',SEMIFINAL:'Semifinal',QUARTERFINAL:'Cuartos de final',ROUND_OF_16:'Octavos de final',GROUP_STAGE:'Fase de grupos',POSITION:'Posición final',ELIMINATED:'Eliminado',QUALIFIED:'Clasificado'};
const display=(n:number|null|undefined)=>n??'—';
export function historicalExtras(r:{points:number;fulls:number|null;partials:number|null;extras:number|null}){
 return r.extras??(r.fulls!==null&&r.partials!==null?r.points-3*r.fulls-r.partials:null);
}
function Person({data,id}:{data:ArchivePayload;id:string}){
 const p=data.participants.find(p=>p.key===id);return <span className="archive-person"><ParticipantShield userId={p?.userId||undefined} name={p?.name||'Participante no disponible'} size="sm" decorative/>{p?.userId?<a href={'#/club/participante/'+encodeURIComponent(p.userId)}>{p.name}</a>:<span>{p?.name||'Participante no disponible'}</span>}</span>;
}
function Empty({children='Información no disponible.'}:{children?:string}){return <p className="archive-empty">{children}</p>;}
export function SeasonDetail({detail,competition}:{detail:HistoryDetail;competition?:string}){
 const {data,summary}=detail;
 const competitions=data.competitions.filter(c=>!competition||c.code===competition);
 return <>
  <header className="archive-heading"><a href="#/historia">Historia</a><h1>T{summary.number} · {summary.name}</h1><p>{summary.source==='mixed'?'Archivo importado y temporada oficial':summary.source==='imported'?'Archivo importado':'Temporada oficial'}{summary.participantCount!==null?' · '+summary.participantCount+' participantes':''}</p></header>
  <nav className="archive-tabs" aria-label="Competiciones de la temporada"><a href={'#/historia/'+summary.number} aria-current={!competition?'page':undefined}>Resumen</a>{summary.competitions.map(c=><a key={c.code} aria-current={competition===c.code?'page':undefined} href={'#/historia/'+summary.number+'/'+c.code}>{c.name}</a>)}</nav>
  {competition&&!competitions.length?<Empty>Competición sin información disponible.</Empty>:competitions.map(c=>{
   const standings=data.standings.filter(r=>r.competitionCode===c.code).sort((a,b)=>a.position-b.position);
   const results=data.results.filter(r=>r.competitionCode===c.code);
   const awards=results.filter(r=>['CHAMPION','RUNNER_UP','THIRD'].includes(r.resultCode));
   const rounds=data.rounds.filter(r=>(r.competitionCode||(data.competitions.length===1?c.code:null))===c.code);
   const matches=data.matches.filter(r=>r.competitionCode===c.code);
   const roundNames=[...new Set(rounds.map(r=>r.round))];
   return <section className="archive-competition panel" key={c.code}>
    <div className="archive-competition__heading"><CompetitionImage code={c.code} name={c.name} season={summary.number} variant="trophy" size="lg"/><h2>{c.name}</h2></div>
    <h3>Resultados finales</h3>{awards.length?<div className="archive-awards">{awards.map((r,i)=><div key={i}><strong>{resultNames[r.resultCode]||r.resultCode}</strong>{r.position!==null&&<small>Posición {r.position}</small>}<Person data={data} id={r.participantKey}/>{r.teamLabel&&<span>{r.teamLabel}</span>}</div>)}</div>:<Empty>Sin resultados finales declarados.</Empty>}
    <h3>Tabla final</h3>{standings.length?<div className="archive-table" role="region" aria-label={'Tabla de '+c.name} tabIndex={0}><table><thead><tr><th scope="col">Pos.</th><th scope="col">Participante</th><th scope="col">Puntos</th><th scope="col">Plenos</th><th scope="col">Parciales</th><th scope="col">Errores</th><th scope="col">Extras</th></tr></thead><tbody>{standings.map(r=><tr key={r.participantKey}><td>{r.position}°</td><td><Person data={data} id={r.participantKey}/></td><td><strong>{r.points}</strong></td><td>{display(r.fulls)}</td><td>{display(r.partials)}</td><td>{display(r.errors)}</td><td>{display(historicalExtras(r))}</td></tr>)}</tbody></table></div>:results.length?<div className="archive-table" role="region" aria-label={'Puestos de '+c.name} tabIndex={0}><table><thead><tr><th>Pos.</th><th>Participante</th><th>Fase alcanzada</th></tr></thead><tbody>{[...results].sort((a,b)=>(a.position??Infinity)-(b.position??Infinity)).map((r,i)=><tr key={i}><td>{display(r.position)}</td><td><Person data={data} id={r.participantKey}/></td><td>{resultNames[r.resultCode]||r.resultCode}</td></tr>)}</tbody></table></div>:<Empty>Tabla final no disponible.</Empty>}
    <h3>Fechas</h3>{roundNames.length?roundNames.map(round=><details key={round}><summary>{round}</summary><div className="archive-table" role="region" aria-label={c.name+' · '+round} tabIndex={0}><table><thead><tr><th>Participante</th><th>Puntos</th><th>Plenos</th><th>Parciales</th><th>Errores</th><th>Extras</th></tr></thead><tbody>{rounds.filter(r=>r.round===round).map(r=><tr key={r.participantKey}><td><Person data={data} id={r.participantKey}/></td><td>{r.points}</td><td>{display(r.fulls)}</td><td>{display(r.partials)}</td><td>{display(r.errors)}</td><td>{display(historicalExtras(r))}</td></tr>)}</tbody></table></div></details>):<Empty>Sin desglose por Fecha disponible.</Empty>}
    {detail.officialLinks.filter(l=>l.code===c.code).map(l=><a className="button button--ghost" key={l.roundId} href={'#/club/historial/'+l.roundId}>{l.name} · resultados y pronósticos</a>)}
    <h3>Enfrentamientos oficiales</h3>{matches.length?<div className="archive-table" role="region" aria-label={'Cruces de '+c.name} tabIndex={0}><table><thead><tr><th>Fase / Fecha</th><th>Participante</th><th>Puntos</th><th>Rival</th></tr></thead><tbody>{matches.map((m,i)=><tr key={m.matchId||i}><td>{m.stage}{m.round&&<small>{m.round}</small>}{m.scoreBasis==='DUO'&&<small>Puntaje de dúo</small>}</td><td><Person data={data} id={m.aKey}/></td><td className="archive-score">{m.pointsA} – {m.pointsB}</td><td><Person data={data} id={m.bKey}/></td></tr>)}</tbody></table></div>:<Empty>Sin enfrentamientos oficiales disponibles.</Empty>}
   </section>;
  })}
  {!competition&&<>
   <section className="panel"><h2>Ascensos y descensos</h2>{data.movements.length?<ul>{data.movements.map((m,i)=><li key={i}><Person data={data} id={m.participantKey}/> · {m.type} · {m.fromDivision||'—'} → {m.toDivision||'—'}{m.detail&&<span> · {m.detail}</span>}</li>)}</ul>:<Empty>Sin movimientos confirmados disponibles.</Empty>}</section>
   <section className="panel"><h2>IFFHS de la temporada</h2>{data.iffhs.length?<div className="archive-table" role="region" aria-label="IFFHS de la temporada" tabIndex={0}><table><thead><tr><th>Pos.</th><th>Participante</th><th>Puntos IFFHS</th></tr></thead><tbody>{[...data.iffhs].sort((a,b)=>b.points-a.points).map(r=><tr key={r.participantKey}><td>{display(r.position)}</td><td><Person data={data} id={r.participantKey}/></td><td>{r.points}</td></tr>)}</tbody></table></div>:<Empty>Información IFFHS no disponible.</Empty>}</section>
  </>}
 </>;
}
export default function ParticipantArchive({route}:{route:string}){
 const [,number,competition]=route.split('/');
 const [seasons,setSeasons]=useState<HistorySummary[]>([]),[detail,setDetail]=useState<HistoryDetail|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [search,setSearch]=useState(''),[kind,setKind]=useState('');
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');
  fetch('/api/participant/history'+(number?'/'+number+(competition?'/'+competition:''):''),{signal:controller.signal}).then(async res=>{const body=await res.json();if(!res.ok)throw Error(body.error||'No pudimos cargar Historia.');return body;}).then(body=>{if(controller.signal.aborted)return;if(number)setDetail(body);else setSeasons(body.seasons);setLoading(false);}).catch(e=>{if(!controller.signal.aborted){setError(e instanceof Error?e.message:'No pudimos cargar Historia.');setLoading(false);}});
  return ()=>controller.abort();
 },[number,competition,revision]);
 if(loading)return <p role="status">Cargando Historia…</p>;
 if(error)return <section className="panel"><p role="alert">{error}</p><button onClick={()=>setRevision(n=>n+1)}>Reintentar</button><a href="#/historia">Volver a Historia</a></section>;
 if(number&&detail)return <div className="participant-archive"><SeasonDetail detail={detail} competition={competition}/></div>;
 const filtered=seasons.filter(s=>(s.number+' '+s.name).toLocaleLowerCase().includes(search.toLocaleLowerCase())&&(!kind||s.competitions.some(c=>c.kind===kind)));
 return <div className="participant-archive"><header className="archive-heading"><h1>Historia</h1><p>Temporadas de Prode TAFA</p></header><div className="archive-filters"><label>Temporada<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Número o nombre"/></label><label>Tipo de competición<select value={kind} onChange={e=>setKind(e.target.value)}><option value="">Todas</option><option value="LEAGUE">Liga</option><option value="CUP">Copa</option><option value="TOURNAMENT">Torneo</option><option value="PROMOTION">Promoción</option></select></label></div>
  {!filtered.length?<Empty>{seasons.length?'No hay temporadas para estos filtros.':'Todavía no hay temporadas históricas disponibles.'}</Empty>:<div className="archive-season-grid">{filtered.map(s=><article className="panel" key={s.number}><h2><a href={'#/historia/'+s.number}>T{s.number} · {s.name}</a></h2>{s.participantCount!==null&&<p>{s.participantCount} participantes</p>}<ul className="archive-season-cups">{s.competitions.map(c=><li key={c.code}><CompetitionImage code={c.code} name={c.name} season={s.number} variant="trophy" size="sm"/><span><strong>{c.name}</strong>{c.champions.length>0&&<small>Campeón: {c.champions.join(' · ')}</small>}</span></li>)}</ul><a className="button button--ghost" href={'#/historia/'+s.number}>Ver temporada</a></article>)}</div>}
 </div>;
}

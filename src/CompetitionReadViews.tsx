import {useEffect,useState,useRef} from 'react';
import {ParticipantShield} from './AssetImage';
import {entryMembers,entryName,phaseName,papaNextRound,papaSourceEntry,readCompetition,type Season,type Competition} from './participant-competitions';
import {competitionFamily} from './historical-competition-family';
import type {HistorySummary} from './history-types';

export function CompetitionLoading({label='Cargando información…'}:{label?:string}){
 return <p className="sport-loading" role="status"><span className="sport-spinner" aria-hidden="true"/>{label}</p>;
}
export function EntryIdentity({s,id,round=null}:{s:Season;id:number|null;round?:number|null}){
 const people=entryMembers(s,id,round);
 return <span className="sport-entry-identity">{people.map(m=><ParticipantShield key={m.userId} userId={m.userId} season={s.seasonNumber} name={m.fullName} size="xs" decorative/>)}<span>{entryName(s,id,round)}</span></span>;
}
export function MiniFixtures({s,fixtures}:{s:Season;fixtures:Array<{id:number;segmentId:number|null;slotKey?:string;entryAId:number;entryBId:number;scoreA:number;scoreB:number;complete:boolean}>}){
 const mini=(f:typeof fixtures[number])=>Number(f.slotKey?.match(/-M([1-6])-/)?.[1]??0)||s.segments.find(seg=>seg.id===f.segmentId)?.sequence||0;
 return <div className="sport-mini-fixtures"><h3>Enfrentamientos del grupo</h3>{[...new Set(fixtures.map(mini))].sort((a,b)=>a-b).map(day=>{
  const matches=fixtures.filter(f=>mini(f)===day),segment=s.segments.find(seg=>seg.id===matches[0]?.segmentId);
  const start=((day-1)%3)*4+1;
  return <section key={day}><h4>F{day||'—'} · {day?`Partidos ${start} a ${start+3} de ${segment?.roundName??`la Fecha ${Math.ceil(day/3)} de Copas (por vincular)`}`:'Programación por definir'}</h4>
   {matches.map(f=><div className="sport-mini-fixture" key={f.id}><EntryIdentity s={s} id={f.entryAId}/><strong>{f.complete?`${f.scoreA} – ${f.scoreB}`:'VS'}</strong><EntryIdentity s={s} id={f.entryBId}/></div>)}
  </section>;
 })}</div>;
}
export function PapaProgression({s,c}:{s:Season;c:Competition}){
 const next=papaNextRound(s,c);if(!next.some(pair=>pair.sources.some(e=>e.entryBId===null)))return null;
 return <section className="reference-section"><h2>{phaseName(next[0].stage.name)} · Próximos cruces</h2><div className="sport-rounds">{next.map((pair,i)=><article className="sport-encounter" key={i}>{pair.sources.map(e=>{
  const entry=papaSourceEntry(e);
  return <div key={e.id}>{entry!==null?<EntryIdentity s={s} id={entry}/>:<span>Ganador de {entryName(s,e.entryAId,e.roundId)} vs. {entryName(s,e.entryBId,e.roundId)}</span>}</div>;
 })}<small>Esperando la definición del rival · orden de llave confirmado</small></article>)}</div></section>;
}
type Source={entryId:number|null;source:string;displayName:string|null};
export type ChampionsNode={id:number;code:string;label:string;sourceA:Source;sourceB:Source;stageId:number|null;round:{id:number}|null;encounter:{scoreA:number|null;scoreB:number|null;winnerEntryId:number|null;adminConfirmedAt:string|null}|null};
export function ChampionsProgression({s,nodes}:{s:Season;nodes:ChampionsNode[]}){
 const canvas=useRef<HTMLDivElement>(null);
 const [connections,setConnections]=useState<string[]>([]);
 useEffect(()=>{
  const host=canvas.current;if(!host)return;
  const measure=()=>{
   const base=host.getBoundingClientRect();
   const boxes=new Map(Array.from(host.querySelectorAll<HTMLElement>('[data-node-code]')).map(el=>[el.dataset.nodeCode,el.getBoundingClientRect()]));
   const paths=nodes.flatMap(node=>[node.sourceA,node.sourceB].flatMap(source=>{
    const from=boxes.get(source.source),to=boxes.get(node.code);if(!from||!to)return [];
    const x1=from.right-base.left,y1=from.top+from.height/2-base.top,x2=to.left-base.left,y2=to.top+to.height/2-base.top;
    const mid=x1+(x2-x1)/2;return [`M${x1},${y1} H${mid} V${y2} H${x2}`];
   }));
   setConnections(old=>JSON.stringify(old)===JSON.stringify(paths)?old:paths);
  };
  measure();const observer=new ResizeObserver(measure);observer.observe(host);host.querySelectorAll('[data-node-code]').forEach(el=>observer.observe(el));
  return()=>observer.disconnect();
 },[nodes]);
 const depths=new Map<string,number>();
 function depth(node:ChampionsNode,seen=new Set<string>()):number{
  if(depths.has(node.code))return depths.get(node.code)!;
  if(seen.has(node.code))return 0;
  const visited=new Set(seen).add(node.code);
  const parents=[node.sourceA,node.sourceB].flatMap(source=>nodes.filter(n=>n.code===source.source));
  const result=parents.length?1+Math.max(...parents.map(parent=>depth(parent,visited))):0;
  depths.set(node.code,result);return result;
 }
 nodes.forEach(n=>depth(n));
 const levels=[...new Set(depths.values())].sort((a,b)=>a-b);
 return <section className="cx-knockout"><div className="cx-knockout-head"><h2>Llave de Copa Campeones</h2><small>Seguí cada código hacia la próxima ronda →</small></div><div className="sport-bracket-scroll"><div ref={canvas} className="cx-knockout-columns sport-champions-rounds"><svg className="sport-bracket-lines" aria-hidden="true">{connections.map((d,i)=><path key={i} d={d}/>)}</svg>{levels.map(level=><section className="cx-knockout-column" key={level}><h3>{level===levels.at(-1)?'Final':`Ronda ${level+1}`}</h3>{nodes.filter(n=>depths.get(n.code)===level).map(n=><article className="sport-encounter" data-node-code={n.code} key={n.id}>
  <h4>{n.code} · {n.label}</h4>{[n.sourceA,n.sourceB].map((source,i)=><div key={i}>{source.entryId!==null?<EntryIdentity s={s} id={source.entryId} round={n.round?.id??null}/>:<span>Ganador de {source.source}</span>}<strong>{(i===0?n.encounter?.scoreA:n.encounter?.scoreB)??'—'}</strong></div>)}
  <small>{n.encounter?.adminConfirmedAt?'Resultado confirmado':n.sourceA.entryId!==null&&n.sourceB.entryId!==null?'Cruce definido':'Esperando rivales'}</small>
  {nodes.some(other=>[other.sourceA.source,other.sourceB.source].includes(n.code))&&<footer>Ganador → {nodes.filter(other=>[other.sourceA.source,other.sourceB.source].includes(n.code)).map(other=>other.code).join(', ')}</footer>}
 </article>)}</section>)}</div></div></section>;
}
export function ImportedCompetitionHistory({code}:{code:string}){
 const [seasons,setSeasons]=useState<HistorySummary[]|null>(null),[error,setError]=useState(false);
 useEffect(()=>{const controller=new AbortController();readCompetition<{seasons:HistorySummary[]}>('/api/participant/history',controller.signal).then(d=>setSeasons(d.seasons)).catch(()=>{if(!controller.signal.aborted)setError(true);});return()=>controller.abort();},[]);
 if(error)return <p role="alert">No pudimos cargar las ediciones históricas. <a href="#/historia">Abrir Historia</a></p>;
 if(!seasons)return <CompetitionLoading label="Cargando ediciones históricas…"/>;
 const editions=seasons.filter(season=>season.source!=='official').flatMap(season=>season.competitions.filter(c=>competitionFamily(c.code)===competitionFamily(code)).map(c=>({season,c})));
 return <div><h3>Ediciones anteriores</h3>{editions.length?editions.map(({season,c})=><a className="sport-history" key={season.number+':'+c.code} href={`#/historia/${season.number}`}><strong>T{season.number} · {c.name}</strong><span>{c.champions.length?'Campeón: '+c.champions.join(' + '):'Ver tablas y enfrentamientos'}</span><span>Ver edición →</span></a>):<p>No hay ediciones anteriores registradas para esta competición.</p>}</div>;
}

import {Fragment,useMemo,useState} from 'react';
import {ParticipantShield,CompetitionImage} from './AssetImage';
import {useParticipantRead,ParticipantState} from './ParticipantState';
import {competitionHref,phaseName} from './participant-competitions';
import './mi-equipo.css';

export type TeamMatch={id:number;seasonNumber:number;competitionCode:string;competitionName:string;stageName:string;roundName:string|null;opponentId:string;opponentName:string;opponentParticipantName?:string;opponentShieldUrl?:string|null;scoreBasis?:string;resolution?:string|null;outcome?:'win'|'draw'|'loss'|null;ownPoints:number;rivalPoints:number;plenos:number|null};
export type TeamPageData={
 identity:{id:string;participantName:string;teamName:string;shieldUrl:string|null;foundedSeason:number|null};
 division:{name:string;seasonNumber:number}|null;
 stats:{dates:number;points:number;fulls:number;partials:number;errors:number;extras:number;predictions:number};
 titles:Array<{code:string;name:string;seasonNumber:number}>;
 rankings:{general:{current:number|null;best:{position:number;seasonNumber:number}|null};iffhs:{current:number|null;best:{position:number;seasonNumber:number}|null;throughSeason:number|null;missingSeasons?:number[]}};
 encounters:TeamMatch[];
 historicalSeasons?:Array<{seasonNumber:number;seasonName:string;kind:string;name:string;division:string|null;
 statistics:{points:number;fulls:number|null;partials:number|null;errors:number|null;extras:number|null;dates:number|null}|null;
 standings:Array<{competitionCode:string;competitionName:string;position:number;points:number}>;
 rounds:Array<{round:string;points:number;fulls:number|null;partials:number|null;errors:number|null;extras:number|null}>;
 results:Array<{competitionCode:string;competitionName:string;resultCode:string;position:number|null}>;
 movements:Array<{type:string;fromDivision:string|null;toDivision:string|null;detail:string|null}>;
 iffhs:{points:number;position:number|null}|null;}>;

};
type Rival={id:string;name:string;matches:TeamMatch[];difference:number;wins:number;draws:number;losses:number;points:number;otherPoints:number;fulls:number|null;participantName?:string;shieldUrl?:string|null};
export function groupOfficialRivals(matches:TeamMatch[]):Rival[]{
 const result=new Map<string,Rival>();
 for(const m of matches){
  const entry=result.get(m.opponentId)??{id:m.opponentId,name:m.opponentName,matches:[],difference:0,wins:0,draws:0,losses:0,points:0,otherPoints:0,fulls:0,participantName:m.opponentParticipantName,shieldUrl:m.opponentShieldUrl};
  entry.matches.push(m);entry.points+=m.ownPoints;entry.otherPoints+=m.rivalPoints;
  const outcome=matchOutcome(m);
  if(outcome==='win')entry.wins++;else if(outcome==='loss')entry.losses++;else entry.draws++;
  entry.difference=entry.wins-entry.losses;
  if(m.plenos===null)entry.fulls=null;
  else if(entry.fulls!==null)entry.fulls+=m.plenos;
  result.set(m.opponentId,entry);
 }
 return [...result.values()].sort((a,b)=>b.matches.length-a.matches.length||a.name.localeCompare(b.name,'es'));
}
const fmt=(x:number)=>x.toLocaleString('es-AR');
const rank=(n:number|null)=>n===null?'—':n+'.º';
function Ranking({name,info}:{name:string;info:{current:number|null;best:{position:number;seasonNumber:number}|null}}){
 return <section className="equipo-ranking"><strong>{rank(info.current)}</strong><span>{name}</span><small>{info.best?'Mejor '+rank(info.best.position)+' · T'+info.best.seasonNumber:'Mejor posición no disponible'}</small></section>;
}
function matchOutcome(m:TeamMatch){
 return m.outcome??(m.ownPoints>m.rivalPoints?'win':m.ownPoints<m.rivalPoints?'loss':'draw');
}
export function TeamHistory({matches,identity}:{matches:TeamMatch[];identity?:TeamPageData['identity']}){
 const [expanded,setExpanded]=useState<string[]>([]);
 const rivals=useMemo(()=>groupOfficialRivals(matches),[matches]);
 const person=(id:string|undefined,name:string,participantName?:string,shieldUrl?:string|null)=><span className="equipo-rival"><ParticipantShield userId={id?.startsWith('hist:')?undefined:id} name={participantName??name} shieldUrl={shieldUrl} size="sm" decorative/><span>{name}</span></span>;
 return <section className="equipo-history" id="club-historiales" aria-label="Historial de enfrentamientos oficiales">
  <h2>Historial de enfrentamientos</h2>
  <p>DIF = victorias − derrotas · PF/PC = puntos a favor/en contra</p>
  {!rivals.length?<p>Todavía no hay enfrentamientos oficiales confirmados para este equipo.</p>:<div className="equipo-table-scroll"><table className="equipo-table">
   <thead><tr>{['RIVAL','DIF','PJ','PG','PE','PP','PF','PC','FICHA'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead>
   <tbody>{rivals.map(r=>{
    const open=expanded.includes(r.id);
    return <Fragment key={r.id}><tr>
     <th scope="row">{r.id.startsWith('hist:')?person(undefined,r.name):<a href={'#/club/participante/'+encodeURIComponent(r.id)}>{person(r.id,r.name,r.participantName,r.shieldUrl)}</a>}</th>
     <td className={r.difference>0?'equipo-positive':r.difference<0?'equipo-negative':''}>{r.difference>0?'+':''}{r.difference}</td>
     <td>{r.matches.length}</td><td>{r.wins}</td><td>{r.draws}</td><td>{r.losses}</td><td>{r.points}</td><td>{r.otherPoints}</td>
     <td><button type="button" aria-expanded={open} aria-controls={'equipo-rival-'+encodeURIComponent(r.id)} aria-label={(open?'Cerrar':'Ver')+' enfrentamientos contra '+r.name} onClick={()=>setExpanded(old=>open?old.filter(x=>x!==r.id):[...old,r.id])}>{open?'−':'+'}</button></td>
    </tr>{open&&<tr className="equipo-detail" id={'equipo-rival-'+encodeURIComponent(r.id)}><td colSpan={9}><div className="equipo-detail-inner">
     {[...r.matches].sort((a,b)=>b.seasonNumber-a.seasonNumber||(a.id<0&&b.id<0?a.id-b.id:b.id-a.id)).map(m=>{
      const outcome=matchOutcome(m),label=outcome==='win'?'Victoria':outcome==='loss'?'Derrota':'Empate';
      return <article className="equipo-encounter" key={m.id+'-'+m.opponentId}>
       <div className="equipo-encounter-meta"><strong>T{m.seasonNumber} · <a href={competitionHref(m.competitionCode,m.seasonNumber)}>{m.competitionName}</a></strong><small>{phaseName(m.stageName)}{m.roundName?' · '+m.roundName:''}</small>{m.scoreBasis==='DUO'&&<small>Marcador de la pareja</small>}</div>
       <div className="equipo-encounter-score">{person(identity?.id,identity?.teamName??'Equipo consultado',identity?.participantName,identity?.shieldUrl)}<strong>{m.ownPoints} <span>–</span> {m.rivalPoints}</strong>{person(r.id,r.name,r.participantName,r.shieldUrl)}</div>
       <div className={'equipo-outcome equipo-outcome-'+outcome}>{label}{m.resolution==='tiebreak'&&<small>{m.outcome==='win'?identity?.teamName:m.outcome==='loss'?r.name:null}{m.outcome&&m.outcome!=='draw'?' avanzó por TAFA':' · TAFA confirmado'}</small>}</div>
      </article>;
     })}
    </div></td></tr>}</Fragment>;
   })}</tbody>
  </table></div>}
 </section>;
}
export function MiEquipoProfile({data}:{data:TeamPageData}){
 const {identity,division,stats,titles,rankings,encounters}=data;
 const grouped=[...new Set(titles.map(t=>t.code))].map(code=>({code,items:titles.filter(t=>t.code===code)}));
 return <article className="equipo-page">
  <header className="equipo-header">
   <span className="eyebrow">MI CLUB · PRODE TAFA</span>
   <div className="equipo-shield"><ParticipantShield userId={identity.id} name={identity.participantName} shieldUrl={identity.shieldUrl} size="lg"/></div>
   <h1>{identity.teamName}</h1>
   <p>Participante: {identity.participantName} {identity.foundedSeason?'· Fundado en T'+identity.foundedSeason:''}</p>
   {division&&<small>{division.name} · Temporada {division.seasonNumber}</small>}
  </header>
  <section className="equipo-titles" aria-label="Trofeos ganados">
   {grouped.length?grouped.map(item=><div key={item.code} className="equipo-trophy">
    <CompetitionImage code={item.code} name={item.items[0].name} season={item.items[0].seasonNumber} variant="trophy" size="lg"/>
    <span>{item.items[0].name}</span>
    <strong>{item.items.length}</strong>
    <small>{item.items.map(t=>'T'+t.seasonNumber).join(' · ')}</small>
   </div>):<p>El equipo todavía no tiene títulos confirmados.</p>}
  </section>
  <section className="equipo-points" aria-label="Estadísticas del Prode">
   <p className="equipo-stats-note">Fechas finalizadas · puntajes definitivos</p><strong className="equipo-total">{fmt(stats.points)}</strong><h2>PTS TOTALES</h2>
   <dl>{[[stats.fulls,'Plenos'],[stats.partials,'Parciales'],[stats.errors,'Errores'],[stats.extras,'Extras'],[stats.predictions,'Pronósticos enviados']].map(([n,label])=><div key={label}><dd>{fmt(n as number)}</dd><dt>{label}</dt></div>)}</dl>
  </section>
  <div className="equipo-rankings"><Ranking name="TABLA GENERAL" info={rankings.general}/><Ranking name="RANKING IFFHS" info={rankings.iffhs}/></div>
  {rankings.iffhs.throughSeason&&<p className="equipo-rank-note">IFFHS · ventana de cinco temporadas hasta T{rankings.iffhs.throughSeason}{rankings.iffhs.missingSeasons?.length?' · Sin datos en '+rankings.iffhs.missingSeasons.map(n=>'T'+n).join(', '):''}. Mejor posición calculada por temporada.</p>}
  <TeamHistory key={identity.id} matches={encounters} identity={identity}/>
  {!!data.historicalSeasons?.length&&<section className="equipo-archive-seasons" aria-label="Archivo de temporadas anteriores">
   <h2>TEMPORADAS HISTÓRICAS</h2>
   <p>Información recuperada de planillas oficiales. Cada temporada muestra únicamente lo que efectivamente se disputó.</p>
   {data.historicalSeasons.map(s=><details key={s.seasonNumber}>
    <summary><strong>T{s.seasonNumber} · {s.seasonName}</strong><span>{s.statistics?s.statistics.points+' PTS':''} {s.division?'· '+s.division:''}</span></summary>
    <div className="equipo-archive-season-detail">
     {s.statistics&&<p><strong>Total:</strong> {s.statistics.points} PTS · {s.statistics.fulls??'—'} plenos · {s.statistics.partials??'—'} parciales · {s.statistics.errors??'—'} errores · {s.statistics.extras??'—'} extras</p>}
     {s.iffhs&&<p><strong>IFFHS:</strong> {s.iffhs.points} puntos{s.iffhs.position?' · '+s.iffhs.position+'.º':''}</p>}
     {s.standings.length>0&&<div><h3>Tablas</h3><ul>{s.standings.map((row,i)=><li key={i}>{row.competitionName}: {row.position}.º · {row.points} PTS</li>)}</ul></div>}
     {s.results.length>0&&<div><h3>Competiciones</h3><ul>{s.results.map((row,i)=><li key={i}>{row.competitionName} · {row.resultCode}{row.position?' · '+row.position+'.º':''}</li>)}</ul></div>}
     {s.movements.length>0&&<div><h3>Ascensos y descensos</h3><ul>{s.movements.map((m,i)=><li key={i}>{m.type} · {m.fromDivision??'—'} → {m.toDivision??'—'}{m.detail?' · '+m.detail:''}</li>)}</ul></div>}
     {s.rounds.length>0&&<div><h3>Puntos por Fecha</h3><div className="equipo-archive-rounds">{s.rounds.map((d,i)=><span key={i}>{d.round}: <strong>{d.points} PTS</strong></span>)}</div></div>}
    </div>
   </details>)}
  </section>}
 </article>;
}
export default function MiEquipo({userId,route}:{userId:string;route:string}){
 const path=route.split('?')[0];const encoded=path.startsWith('equipo/')?path.slice('equipo/'.length):'';
 let id=userId;try{if(encoded)id=decodeURIComponent(encoded);}catch{}
 const profile=useParticipantRead<TeamPageData>('/api/participant/teams/'+encodeURIComponent(id),'No pudimos cargar Mi Equipo. Reintentá.');
 return <><ParticipantState loading={profile.loading} error={profile.error} retry={profile.retry}/>
 {profile.data&&<MiEquipoProfile key={profile.data.identity.id} data={profile.data}/>}</>;
}

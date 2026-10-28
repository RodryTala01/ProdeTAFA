import {Fragment,useMemo,useState} from 'react';
import {ParticipantShield,CompetitionImage} from './AssetImage';
import {useParticipantRead,ParticipantState} from './ParticipantState';
import {competitionHref} from './participant-competitions';
import './mi-equipo.css';

export type TeamMatch={id:number;seasonNumber:number;competitionCode:string;competitionName:string;stageName:string;roundName:string|null;opponentId:string;opponentName:string;ownPoints:number;rivalPoints:number;plenos:number|null};
export type TeamPageData={
 identity:{id:string;participantName:string;teamName:string;shieldUrl:string|null;foundedSeason:number|null};
 division:{name:string;seasonNumber:number}|null;
 stats:{dates:number;points:number;fulls:number;partials:number;errors:number;extras:number;predictions:number};
 titles:Array<{code:string;name:string;seasonNumber:number}>;
 rankings:{general:{current:number|null;best:{position:number;seasonNumber:number}|null};iffhs:{current:number|null;best:{position:number;seasonNumber:number}|null;throughSeason:number|null}};
 encounters:TeamMatch[];
};
type Rival={id:string;name:string;matches:TeamMatch[];difference:number;points:number;otherPoints:number;fulls:number|null};
export function groupOfficialRivals(matches:TeamMatch[]):Rival[]{
 const result=new Map<string,Rival>();
 for(const m of matches){
  const entry=result.get(m.opponentId)??{id:m.opponentId,name:m.opponentName,matches:[],difference:0,points:0,otherPoints:0,fulls:0};
  entry.matches.push(m);entry.points+=m.ownPoints;entry.otherPoints+=m.rivalPoints;
  entry.difference=entry.points-entry.otherPoints;
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
export function TeamHistory({matches}:{matches:TeamMatch[]}){
 const [expanded,setExpanded]=useState<string[]>([]);
 const rivals=useMemo(()=>groupOfficialRivals(matches),[matches]);
 return <section className="equipo-history" aria-label="Historial de enfrentamientos oficiales">
   <h2>HISTORIAL DE ENFRENTAMIENTOS</h2>
   <p>Solo cruces directos oficiales confirmados. DIF = diferencia de puntos; CR = cruces; RIV = puntos del rival.</p>
   {rivals.length===0?<p>Todavía no hay enfrentamientos oficiales confirmados para este equipo.</p>:
   <div className="equipo-table-scroll"><table className="equipo-table">
    <thead><tr><th scope="col">RIVAL</th><th scope="col">DIF</th><th scope="col">CR</th><th scope="col">PTS</th><th scope="col">RIV</th><th scope="col">PL</th><th scope="col">Ficha</th></tr></thead>
    <tbody>{rivals.map(r=>{
      const open=expanded.includes(r.id);
      return <Fragment key={r.id}><tr>
       <th scope="row"><a href={'#/equipo/'+encodeURIComponent(r.id)}>{r.name}</a></th>
       <td className={r.difference>0?'equipo-positive':r.difference<0?'equipo-negative':''}>{r.difference>0?'+':''}{r.difference}</td>
       <td>{r.matches.length}</td><td>{r.points}</td><td>{r.otherPoints}</td><td>{r.fulls??'—'}</td>
       <td><button type="button" aria-expanded={open} aria-label={(open?'Cerrar':'Ver')+' enfrentamientos contra '+r.name} onClick={()=>setExpanded(old=>open?old.filter(x=>x!==r.id):[...old,r.id])}>{open?'−':'+'}</button></td>
      </tr>
      {open&&<tr className="equipo-detail"><td colSpan={7}>
       <div className="equipo-detail-inner">
        <h3>Enfrentamientos contra {r.name}</h3>
        <table><thead><tr><th>Temporada</th><th>Competencia</th><th>Instancia</th><th>Mis PTS</th><th>Rival</th></tr></thead>
         <tbody>{r.matches.map(m=><tr key={m.id+'-'+m.opponentId}><td>T{m.seasonNumber}</td><td><a href={competitionHref(m.competitionCode,m.seasonNumber)}>{m.competitionName}</a></td><td>{m.stageName}{m.roundName?' · '+m.roundName:''}</td><td>{m.ownPoints}</td><td>{m.rivalPoints}</td></tr>)}</tbody>
        </table>
       </div></td></tr>}
      </Fragment>;
    })}</tbody>
   </table></div>}
 </section>;
}
export function MiEquipoProfile({data}:{data:TeamPageData}){
 const {identity,division,stats,titles,rankings,encounters}=data;
 const grouped=[...new Set(titles.map(t=>t.code))].map(code=>({code,items:titles.filter(t=>t.code===code)}));
 return <article className="equipo-page">
  <header className="equipo-header">
   <span className="eyebrow">MI EQUIPO · PRODE TAFA</span>
   <div className="equipo-shield"><ParticipantShield userId={identity.id} name={identity.participantName} shieldUrl={identity.shieldUrl} size="lg"/></div>
   <h1>{identity.teamName}</h1>
   <p>Participante: <a href={'#/club/participante/'+encodeURIComponent(identity.id)}>{identity.participantName}</a> {identity.foundedSeason?'· Fundado en T'+identity.foundedSeason:''}</p>
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
   <strong className="equipo-total">{fmt(stats.points)}</strong><h2>PTS TOTALES</h2>
   <dl>{[[stats.fulls,'Plenos'],[stats.partials,'Parciales'],[stats.errors,'Errores'],[stats.extras,'Extras'],[stats.predictions,'Pronósticos enviados']].map(([n,label])=><div key={label}><dd>{fmt(n as number)}</dd><dt>{label}</dt></div>)}</dl>
  </section>
  <div className="equipo-rankings"><Ranking name="TABLA GENERAL" info={rankings.general}/><Ranking name="RANKING IFFHS" info={rankings.iffhs}/></div>
  <TeamHistory matches={encounters}/>
 </article>;
}
export default function MiEquipo({userId,route}:{userId:string;route:string}){
 const path=route.split('?')[0];const encoded=path.startsWith('equipo/')?path.slice('equipo/'.length):'';
 let id=userId;try{if(encoded)id=decodeURIComponent(encoded);}catch{}
 const profile=useParticipantRead<TeamPageData>('/api/participant/teams/'+encodeURIComponent(id),'No pudimos cargar Mi Equipo. Reintentá.');
 return <><ParticipantState loading={profile.loading} error={profile.error} retry={profile.retry}/>
 {profile.data&&<MiEquipoProfile data={profile.data}/>}</>;
}

import {useEffect,useState} from 'react';
import {ParticipantShield} from './AssetImage';
import {contextLabel,type CompetitionContext} from './competition-contexts';
import {entryMembers,readCompetition,type Overview} from './participant-competitions';
type Standing={entryId?:number;userId?:string;position:number;points?:number;totalPoints?:number;gd?:number};
export function PredictionContextCard({context:c,overview,roundId}:{context:CompetitionContext;overview:Overview|null;roundId:number}) {
 const [row,setRow]=useState<Standing|null>(null);
 const [unavailable,setUnavailable]=useState(false);
 const season=overview?.season;
 const validSeason=season?.competitions.some(x=>x.id===c.competition.id) ? season : null;
 useEffect(()=>{
  setRow(null);setUnavailable(false);
  if(!validSeason)return;
  const url=c.kind==='LEAGUE'?`/api/competition-engine/leagues/${c.competition.code}/standings?season=${validSeason.seasonNumber}`:c.kind==='ACCUMULATIVE_GROUP'?`/api/competition-engine/cups/${c.competition.code}/groups?season=${validSeason.seasonNumber}`:c.kind==='TOTAL_GROUP'&&c.stage?`/api/competition-engine/stages/${c.stage.id}/total/groups`:null;
  if(!url)return;
  const controller=new AbortController();
  readCompetition<{standings?:Standing[];groups?:{id:number;standings:Standing[]}[]}>(url,controller.signal).then(data=>{
   if(controller.signal.aborted)return;
   const rows=c.kind==='LEAGUE'?data.standings:data.groups?.find(g=>'group' in c&&g.id===c.group.id)?.standings;
   setRow(rows?.find(r=>c.kind==='LEAGUE'?r.userId===overview?.currentUserId:'entryId' in c&&r.entryId===c.entryId)??null);
  }).catch(()=>{if(!controller.signal.aborted)setUnavailable(true);});
  return()=>controller.abort();
 },[c.id,validSeason,overview?.currentUserId]);
 const encounter=c.kind==='KNOCKOUT'?c.encounter:null;
 const own=validSeason&&'entryId' in c?entryMembers(validSeason,c.entryId,roundId):[];
 const opponents=validSeason&&encounter?entryMembers(validSeason,encounter.opponentEntryId,roundId):[];
 const confirmed=encounter?.adminConfirmedAt&&encounter.winnerEntryId!==null;
 const people=(members:typeof own)=>members.map(m=><span className="prediction-context-person" key={m.userId}><ParticipantShield name={m.fullName} userId={m.userId} size="sm"/>{m.fullName}</span>);
 return <section className="prediction-summary" aria-label={c.competition.displayName}>
  <div className="prediction-context-title">{contextLabel(c)}</div>
  {row&&<><small>Tabla actual de {c.kind==='LEAGUE'?c.competition.displayName:'group' in c?c.group.name:c.competition.displayName}</small><dl><div><dt>{c.kind==='LEAGUE'?'Tu posición':'Posición en el grupo'}</dt><dd>{row.position}°</dd></div>{(row.points??row.totalPoints)!==undefined&&<div><dt>Puntos</dt><dd>{row.points??row.totalPoints}</dd></div>}{row.gd!==undefined&&<div><dt>Diferencia de goles</dt><dd>{row.gd}</dd></div>}</dl></>}
  {unavailable&&<p role="status">Tabla no disponible en este momento.</p>}
  {encounter&&<>{own.length>0&&opponents.length>0&&<div className="prediction-context-members"><div>{people(own)}</div><b>VS</b><div>{people(opponents)}</div></div>}{encounter.scoreSelf!==null&&encounter.scoreOpponent!==null&&<p>Marcador del cruce: <strong>{encounter.scoreSelf} – {encounter.scoreOpponent}</strong></p>}<p>{confirmed?(encounter.winnerEntryId===('entryId' in c?c.entryId:null)?'Clasificado':'Eliminado'):'Ganador pendiente de confirmación'}</p></>}
  {c.kind==='DUO_SURVIVAL'&&<div>{own.length?people(own):c.partner&&<span className="prediction-context-person"><ParticipantShield userId={c.partner.userId} name={c.partner.fullName}/>{c.partner.fullName}</span>}</div>}
  {c.kind==='TOTAL_GROUP'&&c.miniFixtures.map(f=><p key={f.encounterId}>Mini-fecha {f.miniDay} · vs {f.opponentName}: {f.scoreSelf}–{f.scoreOpponent}{!f.complete&&' · Provisional'}</p>)}
 </section>;
}

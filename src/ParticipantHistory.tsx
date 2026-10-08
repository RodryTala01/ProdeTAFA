import { ParticipantState, useParticipantRead } from './ParticipantState';
import PredictionHistory from './PredictionHistory';
import { argentinaDate, historicalScoreLabel, historyHref, profileHref, type HistoricalMatch, type HistoricalPrediction, type HistoryRound, type PublicProfile, type Reveal } from './participant-profile';
import './participant-club.css';

type Ranking = {ranking:{userId:string;position:number;points:number;fulls:number;partials:number;errors:number;extras:number}[]};
export function HistoryList({rounds,otherId}:{rounds:HistoryRound[];otherId?:string}) {
  if (!rounds.length) return <ParticipantState empty={otherId?'Todavía no hay Fechas finalizadas de este participante.':'Todavía no jugaste ninguna Fecha finalizada.'}/>;
  return <ul className="history-rounds">{rounds.map(r=><li key={r.id}><a href={historyHref(r.id,otherId)}><span><strong>{r.name}</strong><small>{argentinaDate(r.finishedAt)} · {r.fulls} plenos · {r.partials} parciales · {r.errors} errores{r.extras>0&&` · ${r.extras} extras`}</small></span><b>{r.points}<small>PTS</small></b><span aria-hidden="true">›</span></a></li>)}</ul>;
}
function penaltyTeam(match:HistoricalMatch,id:string|null) {return id===null?'Sin elegir':id===match.home.id?match.home.name:id===match.away.id?match.away.name:'Sin elegir';}
function predictionText(p:HistoricalPrediction|undefined) {return p?.homeScore==null||p.awayScore==null?'Sin pronóstico':`${p.homeScore} – ${p.awayScore}`;}
export function HistoricalMatchRow({match,prediction,comparison,own}:{match:HistoricalMatch;prediction?:HistoricalPrediction;comparison?:HistoricalPrediction;own:boolean}) {
  const label=historicalScoreLabel(prediction,match);
  return <article className="history-match">
    <div className="history-match-score"><span>{match.home.name}</span><strong>{match.result.isVoid?'—':`${match.result.home??'—'} – ${match.result.away??'—'}`}</strong><span>{match.away.name}</span></div>
    <div className="history-match-detail"><div><p>{own?'Tu pronóstico':'Pronóstico'}: <strong>{predictionText(prediction)}</strong></p>{match.matchType==='PENALTIES_ONLY'&&<p>Penales: {penaltyTeam(match,prediction?.extraTeamId??null)}</p>}{match.result.penalties&&<p>Ganador de penales: {penaltyTeam(match,match.result.winnerId)}</p>}{comparison&&<p className="history-comparison">Tu pronóstico: {predictionText(comparison)}{match.matchType==='PENALTIES_ONLY'&&` · Penales: ${penaltyTeam(match,comparison.extraTeamId)}`} · {comparison.points} PTS</p>}</div><div className={`history-score-label ${label==='PLENO'?'history-score-label--full':''}`}><strong>{label}</strong><span>{prediction?.score||match.result.isVoid?`${prediction?.points??0} PTS`:'—'}</span>{(prediction?.score?.extraPoints??0)>0&&<small>+{prediction!.score!.extraPoints} por penales</small>}</div></div>
  </article>;
}
export function HistoryDetail({data,participantId,currentUserId,ranking,onSelect}:{data:Reveal;participantId:string;currentUserId:string;ranking?:Ranking;onSelect:(id:string)=>void}) {
  const person=data.participants.find(p=>p.id===participantId);
  const mine=data.participants.find(p=>p.id===currentUserId);
  const row=ranking?.ranking.find(r=>r.userId===participantId);
  return <>
    <header className="sport-heading"><span className="eyebrow">FECHA FINALIZADA · {argentinaDate(data.round.finishedAt)}</span><h1>{data.round.name}</h1><p>Pronósticos oficiales y resultados definitivos.</p></header>
    <label className="field history-select"><span>Ver pronóstico de</span><select value={person?.id??''} onChange={e=>onSelect(e.target.value)}><option value="" disabled>Elegí un participante</option>{data.participants.map(p=><option key={p.id} value={p.id}>{p.fullName}{p.id===currentUserId?' · Vos':''}</option>)}</select></label>
    {person?<><div className="history-summary"><a href={person.id===currentUserId?'#/club':profileHref(person.id)}>{person.fullName}</a><strong>{row&&`${row.position}.º · `}{person.points} PTS</strong>{row&&<p>{row.fulls} plenos · {row.partials} parciales · {row.errors} errores · {row.extras} extras</p>}</div><div className="history-matches">{data.matches.map(match=><HistoricalMatchRow key={match.id} match={match} prediction={person.predictions.find(p=>p.matchId===match.id)} own={participantId===currentUserId} comparison={participantId!==currentUserId?mine?.predictions.find(p=>p.matchId===match.id):undefined}/>)}</div></>:<ParticipantState empty="No hay un envío registrado de este participante en esta Fecha. Podés consultar los otros envíos disponibles."/>}
  </>;
}
export default function ParticipantHistory({user,route='club/historial'}:{user:{id:string;fullName:string};route?:string}) {
  const path=route.split('?')[0];const roundId=Number(path.split('/')[2])||0;
  const requested=new URLSearchParams(route.split('?')[1]??'').get('user');
  const participantId=requested||user.id;const other=participantId!==user.id;
  const list=useParticipantRead<{rounds:HistoryRound[];participant?:PublicProfile['participant']}>(!roundId?(other?`/api/participant/profiles/${encodeURIComponent(participantId)}`:'/api/participant/history'):null,'No pudimos cargar tu historial.');
  const detail=useParticipantRead<Reveal>(roundId?`/api/participant/reveal/${roundId}`:null,'No pudimos cargar esta Fecha. Sólo se pueden consultar Fechas finalizadas.');
  const ranking=useParticipantRead<Ranking>(roundId?`/api/participant/ranking/${roundId}`:null,'No pudimos cargar la posición de esta Fecha.');
  return <div className="club-history"><a className="button button--ghost" href={roundId?historyHref(undefined,other?participantId:undefined):other?profileHref(participantId):'#/club'}>{roundId?'Volver al historial':other?'Volver al perfil':'Volver a Mi Club'}</a>
    {!roundId?<><header className="sport-heading"><span className="eyebrow">{list.data?.participant?.fullName??user.fullName}</span><h1>Historial de Fechas</h1><p>Qué pronosticaste, qué ocurrió y cuánto sumaste.</p></header><ParticipantState loading={list.loading} error={list.error} retry={list.retry}/>{list.data&&<HistoryList rounds={list.data.rounds} otherId={other?participantId:undefined}/>}</>:<><ParticipantState loading={detail.loading} error={detail.error} retry={detail.retry}/>{detail.data&&<><ParticipantState loading={ranking.loading} error={ranking.error} retry={ranking.retry}/><HistoryDetail data={detail.data} participantId={participantId} currentUserId={user.id} ranking={ranking.data??undefined} onSelect={id=>{window.location.hash=historyHref(roundId,id===user.id?undefined:id);}}/>{!other&&<PredictionHistory roundId={roundId} own/>}</>}</>}
  </div>;
}

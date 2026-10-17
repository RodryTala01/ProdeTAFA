import {argentinaDateTime} from './match-time';
import {ParticipantShield,CompetitionImage,TeamShield} from './AssetImage';
import { useEffect, useState } from 'react';
import CompetitionList from './CompetitionList';
import { competitionRows, homeCompetitions, predictionState, type HomeData, type HomeRound } from './participant-home';
import { Icon } from './ui';
import {competitionHref,phaseName} from './participant-competitions';
import './participant-home.css';

export function NextRound({ round }: { round: HomeRound | null }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => window.clearInterval(timer);
  }, [round]);
  if (!round) return <section className="next-round"><span className="eyebrow">PRÓXIMA FECHA</span><h2>Todo al día</h2><p>Todavía no hay una próxima Fecha publicada.</p></section>;
  const now = Date.parse(round.serverNow) + elapsed;
  const target = Math.min(...round.matches.map(m => Date.parse(m.lockedAt)).filter(t => t > now));
  const remaining = Math.max(0, Math.ceil((target-now)/1000));
  const units = [Math.floor(remaining/86400),Math.floor(remaining%86400/3600),Math.floor(remaining%3600/60),remaining%60];
  return <section className="home-hero">
    <div className="home-hero__copy"><span className="eyebrow">PRÓXIMA</span><h1>{round.name}</h1>
      <p className="home-submission">{predictionState(round)}</p>
      <a className="button button--primary" href="#/pronosticos">{round.submitted || !Number.isFinite(target) ? 'Ver pronósticos' : 'Hacer mis pronósticos'} <Icon name="arrow" /></a>
    </div>
    {Number.isFinite(target) ? <div className="home-countdown"><h2>Cierre de pronósticos</h2><p>Próximo partido · cada partido tiene su cierre</p><div className="home-clock">{units.map((value,i)=><div key={i}><strong>{String(value).padStart(2,'0')}</strong><small>{['Días','Horas','Minutos','Segundos'][i]}</small></div>)}</div><time dateTime={new Date(target).toISOString()}>{new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(target)} · Argentina</time></div>
      : <div className="home-countdown"><h2>Pronósticos cerrados</h2><p>Podés consultar tu envío y los resultados disponibles.</p></div>}
  </section>;
}

export function HomeErrors({ errors, retry }: { errors: string[]; retry: () => void }) {
  if (!errors.length) return null;
  return <section className="alert alert--error"><div role="alert">{errors.map(error => <p key={error}>{error}</p>)}</div><button className="button button--secondary" onClick={retry}>Reintentar</button></section>;
}

export function LeagueSummary({ data }: { data: HomeData }) {
  const mine = data.league?.standings.find(row => row.userId === data.league?.currentUserId);
  return <section className="reference-section"><div className="section-heading"><h2>{data.league?.competition.displayName ?? data.season?.division?.name ?? 'Tu Liga'}</h2></div>
    {mine ? <><div className="league-snapshot"><strong className="sport-number">{mine.position}<span>.º</span></strong><div><strong>{mine.points} <small>PTS</small></strong><p>Tu posición actual</p></div></div>{data.league?.provisional && <p>Puntaje provisional</p>}</> : <p>{data.season?.division ? 'Todavía no hay una posición disponible.' : 'Todavía no tenés una división asignada en una temporada activa.'}</p>}
    <a className="button button--secondary" href="#/competiciones/liga">Ver Liga <Icon name="arrow" /></a>
  </section>;
}


function HomeHeading({title,href,label}:{title:string;href:string;label:string}) {return <div className="home-heading"><h2>{title}</h2><a href={href}>{label} <Icon name="arrow"/></a></div>;}
const HOME_FINAL_STATUSES = new Set(['FT','AET','PEN']);
const HOME_LIVE_STATUSES = new Set(['1H','HT','2H','ET','BT','P','LIVE']);
function homeFixtureState(match: HomeRound['matches'][number]) {
  const isFinal = HOME_FINAL_STATUSES.has(match.status ?? '');
  const isLive = HOME_LIVE_STATUSES.has(match.status ?? '');
  const started = isFinal || isLive;
  const hasPrediction = match.officialPrediction.homeScore != null && match.officialPrediction.awayScore != null;
  const prediction = hasPrediction ? `${match.officialPrediction.homeScore} – ${match.officialPrediction.awayScore}` : null;
  const home = isFinal ? (match.result?.homeRegulation ?? match.result?.homeCurrent) : match.result?.homeCurrent;
  const away = isFinal ? (match.result?.awayRegulation ?? match.result?.awayCurrent) : match.result?.awayCurrent;
  const result = started && home != null && away != null ? `${home} – ${away}` : null;
  const action = started || match.isLocked ? 'Ver' : hasPrediction ? 'Modificar' : 'Pronosticar';
  return { isFinal, isLive, started, prediction, result, action };
}
export default function ParticipantHome({ name, data, userId }: { name: string; data: HomeData; userId?:string }) {
  const user=userId??data.league?.currentUserId??data.overview?.currentUserId??'';
  const cards=homeCompetitions(data,user);
  const mine=data.league?.standings.find(row=>row.userId===user);
  const matches=[...(data.round?.matches??[])].filter(m=>m.home&&m.away).sort((a,b)=>Date.parse(a.kickoffAt)-Date.parse(b.kickoffAt));
  const resultRound=data.round??data.resultRound;
  const results=[...(resultRound?.matches??[])].filter(m=>m.home&&m.away&&['FT','AET','PEN'].includes(m.status??'')&&!m.result?.isVoid&&m.result?.homeRegulation!=null&&m.result?.awayRegulation!=null).sort((a,b)=>Date.parse(b.kickoffAt)-Date.parse(a.kickoffAt));
  return <div className="home-sports">
    <div className="home-welcome"><span>{data.season?.name??'PRODE TAFA'}</span><span>{name}</span></div>
    {!data.errors.includes('No pudimos cargar la próxima Fecha.')&&<NextRound round={data.round}/>}
    <div className="home-main-grid"><section className="home-panel"><HomeHeading title="Partidos de la Fecha" href="#/pronosticos" label="Ver toda la Fecha"/>
      {matches.length?<div className="home-fixtures">{matches.slice(0,5).map((m,i)=>{
        const state=homeFixtureState(m);
        return <article className={`home-fixture ${state.isLive?'home-fixture--live':state.isFinal?'home-fixture--final':''}`} key={m.id??i}>
          <time dateTime={m.kickoffAt}>{argentinaDateTime(m.kickoffAt,{month:'short'})}</time>
          <span className="home-team"><TeamShield name={m.home!.name} teamId={m.home!.id} logoUrl={m.home!.logoUrl} size="sm" decorative/><span>{m.home!.name}</span></span>
          <span className="home-match-center">
            {state.started
              ? <><strong className="home-real-score">{state.result??'— – —'}</strong><span className={state.isLive?'home-match-status home-match-status--live':'home-match-status home-match-status--final'}>{state.isLive?`EN VIVO${m.elapsedMinutes!=null?' · '+m.elapsedMinutes+'′':''}`:'FINAL'}</span>{state.prediction&&<small>Tu pronóstico: {state.prediction}</small>}{state.isFinal&&m.score&&<small className="home-match-points">{m.score.points>0?'+':''}{m.score.points} pts</small>}</>
              : state.prediction
                ? <><strong className="home-prediction-score">{state.prediction}</strong><small>Tu pronóstico</small></>
                : <span className="home-versus">VS</span>}
          </span>
          <span className="home-team"><TeamShield name={m.away!.name} teamId={m.away!.id} logoUrl={m.away!.logoUrl} size="sm" decorative/><span>{m.away!.name}</span></span>
          <a href="#/pronosticos" className="home-match-action">{state.action}</a><small className="home-fixture-league">{m.competitionName}</small>
        </article>;
      })}</div>:<p className="home-empty">Los partidos aparecerán cuando haya una Fecha publicada.</p>}
    </section><aside className="home-side"><section className="home-panel"><HomeHeading title="Tu posición" href={data.season?.division?competitionHref('LIGA_'+data.season.division.code,data.season.seasonNumber):'#/competiciones'} label="Ver Liga"/>
      {mine?<><div className="home-position"><strong>{mine.position}°</strong><div><b>{mine.points}</b><span>Puntos</span></div><ParticipantShield name={name} userId={user} size="lg"/></div><p>{data.league?.competition.displayName} · {data.league?.provisional?'Provisional':'Puntaje definitivo'}</p></>:<p className="home-empty">Todavía no hay una posición disponible.</p>}
    </section><section className="home-panel"><HomeHeading title="Últimos resultados" href={resultRound?.status==='finished'?`#/club/historial/${resultRound.id}`:'#/pronosticos'} label="Ver Fecha"/>
      {results.length?<><small>{resultRound?.name} · resultado de 90 minutos</small><div className="home-results">{results.map((m,i)=><div key={m.id??i}><div><TeamShield name={m.home!.name} logoUrl={m.home!.logoUrl} size="sm"/><strong>{m.result!.homeRegulation} – {m.result!.awayRegulation}</strong><TeamShield name={m.away!.name} logoUrl={m.away!.logoUrl} size="sm"/></div><small>{m.home!.name} · {m.away!.name}</small><small>Tu pronóstico: <strong>{m.officialPrediction.homeScore==null||m.officialPrediction.awayScore==null?'Sin pronóstico enviado':m.officialPrediction.homeScore+' – '+m.officialPrediction.awayScore}</strong></small><small><strong>{m.score?m.score.points+' pts':'Puntos pendientes'}</strong>{m.score?.provisional?' · provisional':''}{(m.score?.extraPoints??0)>0?' · +'+m.score!.extraPoints+' por penales':''}</small></div>)}</div></>:<p className="home-empty">Todavía no hay resultados definitivos en esta Fecha del Prode.</p>}
    </section></aside></div>
    <section className="home-panel"><HomeHeading title="Competiciones" href="#/competiciones" label="Ver todas"/>
      {cards.length?<div className="home-cups">{cards.map(({competition:c,status,phase,sides,context})=><a className={'home-cup '+(c.family==='LEAGUE'?'home-cup--league':'')} href={competitionHref(c.code,data.season?.seasonNumber)} key={c.id}>
        <CompetitionImage code={c.code} name={c.displayName} season={data.season?.seasonNumber} variant="trophy" size="lg" decorative/><h3>{c.code==='LIGA_A'?'Primera División':c.code==='LIGA_B'?'Segunda División':c.displayName}</h3>
        {c.code===data.league?.competition.code&&mine?<p><strong>{mine.position}° puesto</strong><br/>{mine.points} pts</p>:<>
          {sides.length===2?<div className="home-opponents">{sides.map((side,i)=><div className="home-cup-side" key={i}>{side.length?side.map(m=><span key={m.userId}><ParticipantShield userId={m.userId} name={m.fullName} season={data.season?.seasonNumber} size="sm" decorative/><small>{m.fullName}</small></span>):<small>Por definir</small>}</div>)}<b>VS</b></div>:context?.kind==='DUO_SURVIVAL'&&context.partner?<p>Con {context.partner.fullName}</p>:null}
          <p className={status==='Eliminado'?'home-eliminated':''}>{status}</p>{phase&&<small>{phaseName(phase)}</small>}
        </>
      }</a>)}</div>:<p className="home-empty">Tus competiciones aparecerán cuando tengas una participación registrada.</p>}
    </section>
  </div>;
}


export function ParticipantCompetitions({ data }: { data: HomeData }) {
  const rows = competitionRows(data);
  return <><div className="reference-title"><div><span className="eyebrow">{data.season?.name ?? 'TU TEMPORADA'}</span><h1>Competiciones</h1><p>Tu recorrido y las competiciones de la temporada.</p></div></div>
    {rows.length ? <ul className="competition-directory">{rows.map(row => <li key={row.id}>
      {row.code === 'LIGA_A' || row.code === 'LIGA_B' ? <><CompetitionList items={[row]} /><a className="button button--secondary" href={`#/competiciones/liga-${row.code === 'LIGA_A' ? 'a' : 'b'}`}>Consultar {row.name}</a></>
        : <details><summary><CompetitionImage code={row.code} name={row.name} decorative/><span><strong>{row.name}</strong><small>{row.status === 'En esta Fecha' ? row.detail : row.status}</small></span><Icon name="arrow" /></summary><div className="competition-directory__detail"><p>{row.detail}</p><p>Más adelante vas a poder consultar acá el recorrido completo de esta competición.</p></div></details>}
    </li>)}</ul> : <section className="card panel"><p>Todavía no hay competiciones disponibles.</p><a href="#/competiciones/liga" className="button button--secondary">Consultar Liga</a></section>}
  </>;
}

export function ParticipantClub({ name, data }: { name: string; data: HomeData }) {
  return <><div className="reference-title"><div><span className="eyebrow">MI CLUB</span><h1>{name}</h1><p>{data.season?.division?.name ?? 'Participante'}</p></div><ParticipantShield name={name} userId={data.league?.currentUserId} season={data.season?.seasonNumber} size="lg"/></div>
    <div className="club-layout"><section className="reference-section"><h2>Tu historia</h2><p>Volvé a tus Fechas y revisá los pronósticos que enviaste.</p><a className="button button--primary" href="#/club/historial">Ver historial <Icon name="arrow" /></a><p><a className="button button--ghost" href="#/pronosticos">Consultar pronósticos por Fecha</a></p></section><LeagueSummary data={data} /></div>
    <section className="admin-notice"><h2>Estadísticas</h2><p>Tu historia va a seguir creciendo. Por ahora, podés consultar tus puntos y aciertos en el historial de Fechas.</p></section>
  </>;
}

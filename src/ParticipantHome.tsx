import {argentinaDateTime} from './match-time';
import {ParticipantShield,CompetitionImage,TeamShield} from './AssetImage';
import { useEffect, useState } from 'react';
import CompetitionList from './CompetitionList';
import { competitionRows, predictionState, type HomeData, type HomeRound } from './participant-home';
import {homeCompetitionDirectory,homeCompetitionStatuses,homeCompetitionName} from './home-competition-status';
import { Icon } from './ui';
import {competitionHref} from './participant-competitions';
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
    <a className="button button--secondary" href={data.season?.division?competitionHref('LIGA_'+data.season.division.code,data.season.seasonNumber):'#/competiciones'}>Ver Liga <Icon name="arrow" /></a>
  </section>;
}


function HomeHeading({title,href,label}:{title:string;href:string;label:string}) {return <div className="home-heading"><h2>{title}</h2><a href={href}>{label} <Icon name="arrow"/></a></div>;}
const HOME_FINAL_STATUSES = new Set(['FT','AET','PEN']);
const HOME_LIVE_STATUSES = new Set(['1H','HT','2H','ET','BT','P','LIVE']);
function homeFixtureState(match: HomeRound['matches'][number]) {
  const isFinal = HOME_FINAL_STATUSES.has(match.status ?? '');
  const isLive = HOME_LIVE_STATUSES.has(match.status ?? '');
  const hasOfficial = match.officialPrediction.homeScore != null && match.officialPrediction.awayScore != null;
  const hasDraft = !match.isLocked && match.prediction.homeScore != null && match.prediction.awayScore != null;
  // Never present an unsent draft change as the official submitted prediction.
  // Closed matches always use only the server's official snapshot.
  const saved = hasOfficial ? match.officialPrediction : hasDraft ? match.prediction : null;
  const prediction = saved ? `${saved.homeScore} – ${saved.awayScore}` : null;
  const predictionLabel = hasOfficial ? 'TU PRONÓSTICO · ENVIADO' : hasDraft ? 'BORRADOR · SIN ENVIAR' : 'TU PRONÓSTICO';
  const home = isFinal ? (match.result?.homeRegulation ?? match.result?.homeCurrent) : match.result?.homeCurrent;
  const away = isFinal ? (match.result?.awayRegulation ?? match.result?.awayCurrent) : match.result?.awayCurrent;
  const result = (isFinal || isLive) && home != null && away != null ? `${home} – ${away}` : null;
  const resultLabel = isLive ? 'RESULTADO EN VIVO' : isFinal ? 'RESULTADO REAL · 90′' : 'RESULTADO REAL';
  const resultType = match.score?.resultType;
  const scoreType = resultType === 'FULL' ? 'PLENO' : resultType === 'PARTIAL' ? 'PARCIAL' : resultType === 'ERROR' ? 'ERROR' : resultType === 'PENALTIES' ? 'PENALES' : resultType === 'VOID' ? 'ANULADO' : null;
  const points = match.score && (isFinal || isLive) ? `${scoreType ? scoreType + ' · ' : ''}${match.score.points} pts` : isFinal && !hasOfficial && !match.result?.isVoid ? 'ERROR · 0 pts' : null;
  const status = match.result?.isVoid ? 'Anulado' : isLive ? 'En vivo' : isFinal ? 'Finalizado' : match.isLocked ? 'Cerrado' : hasOfficial ? 'Enviado' : hasDraft ? 'Sin enviar' : 'Disponible';
  return { isFinal, isLive, prediction, predictionLabel, result, resultLabel, points, status };
}
export default function ParticipantHome({ name, data, userId }: { name: string; data: HomeData; userId?:string }) {
  const user=userId??data.league?.currentUserId??data.overview?.currentUserId??'';
  const statuses=homeCompetitionStatuses(data,user);
  const directory=homeCompetitionDirectory(data,user);
  const mine=data.league?.standings.find(row=>row.userId===user);
  const leader=data.league?.standings[0];
  const distance=mine&&leader?Math.max(0,leader.points-mine.points):null;
  const leagueHref=data.season?.division?competitionHref('LIGA_'+data.season.division.code,data.season.seasonNumber):'#/competiciones';
  const leagueName=data.season?.division?'LIGA_'+data.season.division.code:null;
  const matches=[...(data.round?.matches??[])].filter(m=>m.home&&m.away).sort((a,b)=>Date.parse(a.kickoffAt)-Date.parse(b.kickoffAt));
  return <div className="home-sports">
    <div className="home-welcome"><span>{data.season?.name??'PRODE TAFA'}</span><span>{name}</span></div>
    {!data.errors.includes('No pudimos cargar la próxima Fecha.')&&<NextRound round={data.round}/>}
    <div className="home-main-grid"><section className="home-panel"><HomeHeading title="Partidos de la Fecha" href="#/pronosticos" label="Ver toda la Fecha"/>
      {matches.length?<div className="home-fixtures">{matches.map((m,i)=>{
        const state=homeFixtureState(m);
        return <article className={'home-fixture-card'+(state.isLive?' home-fixture-card--live':'')} key={m.id??i}>
          <a className="home-fixture-link" href="#/pronosticos" aria-label={m.home!.name+' versus '+m.away!.name+', '+argentinaDateTime(m.kickoffAt)}>
            <time dateTime={m.kickoffAt}>{argentinaDateTime(m.kickoffAt,{month:'short'})} · ARG</time>
            <div className="home-fixture-teams">
              <span><TeamShield name={m.home!.name} teamId={m.home!.id} logoUrl={m.home!.logoUrl} size="sm" decorative/><strong>{m.home!.name}</strong></span>
              <b className="home-fixture-versus" aria-hidden="true">VS</b>
              <span><TeamShield name={m.away!.name} teamId={m.away!.id} logoUrl={m.away!.logoUrl} size="sm" decorative/><strong>{m.away!.name}</strong></span>
            </div>
            <div className="home-fixture-scores">
              <div className="home-fixture-result"><small>{state.resultLabel}</small><strong>{state.result ?? (state.isFinal ? 'Sin confirmar' : 'Por jugar')}</strong></div>
              <div className="home-fixture-my-score"><small>{state.predictionLabel}</small><strong>{state.prediction ?? 'Sin enviar'}</strong></div>
            </div>
            <div className="home-fixture-bottom">
              <small className={state.isLive?'home-fixture-status--live':'home-fixture-status'}>{state.status}</small>
              {state.points && <strong className="home-fixture-points">{state.points}</strong>}
            </div>
          </a>
        </article>;
      })}</div>:<p className="home-empty">Los partidos aparecerán cuando haya una Fecha publicada.</p>}
    </section></div>
    <div className="home-overview" aria-label="Tu posición y estado general">
      <section className="home-panel home-overview-league">
        <HomeHeading title="Tu posición" href={leagueHref} label="Ver Liga"/>
        {mine?<div className="home-league-content">
          <div className="home-league-rank">
            <span className="home-league-place">{mine.position}°</span>
            {leagueName&&<span className="home-league-name"><CompetitionImage code={leagueName} name={data.league?.competition.displayName??leagueName} size="xs" decorative/>{homeCompetitionName(leagueName,data.league?.competition.displayName??leagueName)}</span>}
          </div>
          <div className="home-league-points"><strong>{mine.points} <small>pts</small></strong>
            <span>{data.league?.provisional?'Tabla provisional':'Tabla de tu Liga'}</span>
          </div>
          <div className="home-league-stats" aria-label="Estadísticas de liga">
            {([['Plenos',mine.fulls],['Parciales',mine.partials],['Errores',mine.errors],['Extras',mine.extras]] as const).filter(([,value])=>value!=null).map(([label,value])=>
              <span key={label}><small>{label}</small><strong>{value}</strong></span>)}
          </div>
          {(distance!==null||mine.zone)&&<div className="home-league-zone">
            {distance!==null&&<span>{distance===0?'En la primera posición':`A ${distance} pts del líder`}</span>}
            {mine.zone&&<strong>{mine.zone.label}</strong>}
          </div>}
        </div>:<div className="home-league-unavailable">
          <CompetitionImage code={leagueName??''} name={data.league?.competition.displayName??'Liga'} size="lg" decorative/>
          <p>{data.season?.division?'Todavía no hay una posición disponible en tu Liga.':'Tu Liga aparecerá cuando tengas una división asignada.'}</p>
        </div>}
      </section>
      <section className="home-panel home-status-panel">
        <HomeHeading title="Tu estado general" href="#/competiciones" label="Ver todas las competiciones"/>
        {statuses.length?<div className="home-status-grid">{statuses.map(card=>
          <a className={`home-status-card home-status-card--${card.tone}`} key={card.code} href={card.href}
             aria-label={`${card.name}: ${card.primary}${card.detail?' · '+card.detail:''}`}>
            <CompetitionImage code={card.code} name={card.name} season={data.season?.seasonNumber} size="md" decorative/>
            <span className="home-status-copy">
              <strong>{card.name}</strong>
              <b className="home-status-primary">{card.primary}</b>
              {card.detail&&<small>{card.detail}</small>}
            </span>
            <span className="home-status-arrow" aria-hidden="true">›</span>
          </a>)}</div>
          :<p className="home-empty">Tus estados aparecerán cuando las competiciones tengan participantes o cruces registrados.</p>}
      </section>
    </div>
    <section className="home-panel home-directory-panel">
      <HomeHeading title="Competiciones" href="#/competiciones" label="Ver todas"/>
      {directory.length?<nav className="home-competition-directory" aria-label="Accesos a competiciones">
        {directory.map(card=><a key={card.code} href={card.href}
          className={`home-competition-shortcut ${card.current?'home-competition-shortcut--mine':''}`}>
          <CompetitionImage code={card.code} name={card.name} season={data.season?.seasonNumber} size="md" variant="trophy" decorative/>
          <strong>{card.name}</strong>
        </a>)}
      </nav>:<p className="home-empty">Las competiciones aparecerán cuando estén configuradas para esta temporada.</p>}
    </section>
  </div>;
}


export function ParticipantCompetitions({ data }: { data: HomeData }) {
  const rows = competitionRows(data);
  return <><div className="reference-title"><div><span className="eyebrow">{data.season?.name ?? 'TU TEMPORADA'}</span><h1>Competiciones</h1><p>Tu recorrido y las competiciones de la temporada.</p></div></div>
    {rows.length ? <ul className="competition-directory">{rows.map(row => <li key={row.id}>
      {row.code === 'LIGA_A' || row.code === 'LIGA_B' ? <><CompetitionList items={[row]} /><a className="button button--secondary" href={`#/competiciones/liga-${row.code === 'LIGA_A' ? 'a' : 'b'}`}>Consultar {row.name}</a></>
        : <details><summary><CompetitionImage code={row.code} name={row.name} decorative/><span><strong>{row.name}</strong><small>{row.status === 'En esta Fecha' ? row.detail : row.status}</small></span><Icon name="arrow" /></summary><div className="competition-directory__detail"><p>{row.detail}</p><p>Más adelante vas a poder consultar acá el recorrido completo de esta competición.</p></div></details>}
    </li>)}</ul> : <section className="card panel"><p>Todavía no hay competiciones disponibles.</p><a href="#/competiciones" className="button button--secondary">Consultar Liga</a></section>}
  </>;
}

export function ParticipantClub({ name, data }: { name: string; data: HomeData }) {
  return <><div className="reference-title"><div><span className="eyebrow">MI CLUB</span><h1>{name}</h1><p>{data.season?.division?.name ?? 'Participante'}</p></div><ParticipantShield name={name} userId={data.league?.currentUserId} season={data.season?.seasonNumber} size="lg"/></div>
    <div className="club-layout"><section className="reference-section"><h2>Tu historia</h2><p>Volvé a tus Fechas y revisá los pronósticos que enviaste.</p><a className="button button--primary" href="#/club/historial">Ver historial <Icon name="arrow" /></a><p><a className="button button--ghost" href="#/pronosticos">Consultar pronósticos por Fecha</a></p></section><LeagueSummary data={data} /></div>
    <section className="admin-notice"><h2>Estadísticas</h2><p>Tu historia va a seguir creciendo. Por ahora, podés consultar tus puntos y aciertos en el historial de Fechas.</p></section>
  </>;
}

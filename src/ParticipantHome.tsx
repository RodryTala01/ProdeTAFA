import {ParticipantShield,CompetitionImage} from './AssetImage';
import { useEffect, useState } from 'react';
import CompetitionList from './CompetitionList';
import { competitionRows, predictionState, timeRemaining, type HomeData, type HomeRound } from './participant-home';
import { Icon } from './ui';

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
  const kickoff = Math.min(...round.matches.map(m => Date.parse(m.kickoffAt)));
  const nextLock = Math.min(...round.matches.map(m => Date.parse(m.lockedAt)).filter(t => t > now));
  const target = kickoff > now ? kickoff : nextLock;
  const date = Number.isFinite(target) ? new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(new Date(target)) : null;
  return <section className="next-round">
    <div className="section-kicker"><span className="eyebrow">PRÓXIMA FECHA</span><span className="status-badge status-badge--success">Abierta</span></div>
    <h2>{round.name}</h2>
    {date && <p>{kickoff > now ? 'Comienza' : 'Próximo cierre'}: {date} · Argentina</p>}
    <p className="home-submission">{predictionState(round)}</p>
    <div className="next-round__bottom"><div><small>{Number.isFinite(target) ? (kickoff > now ? 'Para el primer partido' : 'Para el próximo cierre') : 'Los partidos ya cerraron'}</small>{Number.isFinite(target) && <strong className="sport-number">{timeRemaining(target, now)}</strong>}</div>
      <a className="button button--primary" href="#/pronosticos">{round.submitted || !Number.isFinite(nextLock) ? 'Ver pronóstico' : 'Cargar pronósticos'} <Icon name="arrow" /></a>
    </div>
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

export default function ParticipantHome({ name, data, userId }: { name: string; data: HomeData; userId?:string }) {
  const rows = competitionRows(data);
  return <>
    <div className="reference-title"><div><span className="eyebrow">INICIO</span><h1>{name}<span className="accent-text">.</span></h1><p>{data.season?.division?.name ?? 'Tu próxima jugada empieza acá.'}</p></div><ParticipantShield name={name} userId={userId??data.league?.currentUserId} season={data.season?.seasonNumber} size="lg"/></div>
    <div className="home-layout"><div>{!data.errors.includes('No pudimos cargar la próxima Fecha.') && <NextRound round={data.round} />}<section className="reference-section"><div className="section-heading"><h2>Competiciones</h2><a className="button button--ghost" href="#/competiciones">Ver todas <Icon name="arrow" /></a></div>
      {rows.length ? <CompetitionList items={rows} /> : <p>Todavía no hay competiciones disponibles.</p>}
    </section></div><aside className="home-aside"><LeagueSummary data={data} />
      <section className="admin-notice"><h2>Avisos</h2><p>No hay avisos importantes.</p></section>
    </aside></div>
  </>;
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

import { competitionHref, entryMembers, participation, phaseName, type Overview } from './participant-competitions';
import { historyHref, type PublicProfile } from './participant-profile';
import { ParticipantState, useParticipantRead } from './ParticipantState';
import type { LeagueData } from './LeagueView';
import './participant-club.css';

export type ClubData = {profile:PublicProfile;overview:Overview;league:LeagueData|null};
export function HeadToHead() {
  return <section className="reference-section"><h1>Enfrentamientos</h1><p>Todavía no hay historial de enfrentamientos cargado.</p><p className="sport-footnote">Esta consulta es distinta del historial de Fechas. Los cruces de cada edición están disponibles en Competiciones.</p><a href="#/competiciones" className="button button--ghost">Ver competiciones</a></section>;
}
export function ClubProfile({data,own}:{data:ClubData;own:boolean}) {
  const {profile,overview,league}=data;
  const {id,fullName}=profile.participant;
  const season=overview.season;
  const person=season?.people.find(p=>p.userId===id);
  const standing=league?.standings.find(p=>p.userId===id);
  const rows=season?.competitions.filter(c=>season.members.some(m=>m.competitionId===c.id&&m.userId===id))??[];
  // Summing existing finalized summaries only; no scoring or ranking reconstruction.
  const totals=profile.rounds.reduce((sum,r)=>({points:sum.points+r.points,fulls:sum.fulls+r.fulls,partials:sum.partials+r.partials,errors:sum.errors+r.errors}),{points:0,fulls:0,partials:0,errors:0});
  return <div className="club-profile">
    <header className="club-heading"><span className="avatar club-avatar" aria-label="Escudo pendiente">{fullName.slice(0,2).toUpperCase()}</span><div><span className="eyebrow">{own?'MI CLUB':'PARTICIPANTE'}</span><h1>{fullName}</h1><p>{person?.league??'Sin Liga asignada en esta edición'}{standing&&<> · {standing.position}.º · <strong>{standing.points} PTS</strong></>}</p></div></header>
    <nav className="club-links" aria-label="Recorrido del participante"><a href={historyHref(undefined,own?undefined:id)}>Historial de Fechas</a><a href={`#/club/enfrentamientos${own?'':`?user=${encodeURIComponent(id)}`}`}>Enfrentamientos</a><a href="#/competiciones">Competiciones</a>{own&&<a href="#/club/envios">Envíos y cambios</a>}<a href="#club-estadisticas" onClick={e=>{e.preventDefault();document.getElementById('club-estadisticas')?.scrollIntoView({behavior:'smooth'});}}>Estadísticas básicas</a></nav>
    <div className="club-columns"><section className="reference-section"><div className="section-heading"><h2>{season?.name??'Temporada actual'}</h2>{person&&<a href={competitionHref(`LIGA_${person.division}`,season?.seasonNumber)}>Ver Liga</a>}</div>
      {!season?<p>Todavía no hay una temporada disponible.</p>:rows.length?<ul className="club-competitions">{rows.map(c=>{
        const encounters=season.encounters.filter(e=>season.stages.some(st=>st.id===e.stageId&&st.competitionId===c.id)&&[e.entryAId,e.entryBId].some(entry=>entryMembers(season,entry,e.roundId).some(m=>m.userId===id)));
        const latest=encounters.at(-1);
        return <li key={c.id}><a href={competitionHref(c.code,season.seasonNumber)}><strong>{c.displayName}</strong><span>{participation(season,c,id)}{latest&&<> · {phaseName(season.stages.find(st=>st.id===latest.stageId)?.name)}</>}</span></a></li>;
      })}</ul>:<p>Todavía no hay competiciones disponibles para este participante.</p>}
    </section><section className="reference-section" id="club-estadisticas"><h2>Recorrido en Fechas</h2><p className="sport-footnote">Sólo Fechas finalizadas con envío. Todas las temporadas cargadas.</p>{profile.rounds.length?<dl className="club-numbers">{[[profile.rounds.length,'Fechas'],[totals.points,'Puntos'],[totals.fulls,'Plenos'],[totals.partials,'Parciales'],[totals.errors,'Errores']].map(([value,label])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>:<p>{own?'Todavía no jugaste ninguna Fecha finalizada.':'Todavía no hay Fechas finalizadas de este participante.'}</p>}<a href={historyHref(undefined,own?undefined:id)}>Ver detalle por Fecha</a></section></div>
    <section className="reference-section"><h2>Últimas Fechas</h2>{profile.rounds.length?<ul className="club-recent">{profile.rounds.slice(0,3).map(r=><li key={r.id}><a href={historyHref(r.id,own?undefined:id)}>{r.name}<strong>{r.points} PTS</strong></a></li>)}</ul>:<p>Todavía no hay historial público disponible.</p>}</section>
  </div>;
}
export default function ParticipantClubPage({user,route}:{user:{id:string;fullName:string};route:string}) {
  const path=route.split('?')[0];
  const encoded=path.startsWith('club/participante/')?path.slice('club/participante/'.length):null;
  let id=user.id;
  try { if(encoded)id=decodeURIComponent(encoded); } catch { /* Invalid route is reported as unavailable. */ }
  const own=id===user.id;
  const season=new URLSearchParams(route.split('?')[1]??'').get('season');
  const profile=useParticipantRead<PublicProfile>(`/api/participant/profiles/${encodeURIComponent(id)}`,'No pudimos cargar este perfil. Puede no estar disponible.');
  const overview=useParticipantRead<Overview>(`/api/competition-engine/overview${season?`?season=${encodeURIComponent(season)}`:''}`,'No pudimos cargar las competiciones.');
  const division=overview.data?.season?.people.find(p=>p.userId===id)?.division;
  const league=useParticipantRead<LeagueData>(division?`/api/competition-engine/leagues/LIGA_${division}/standings?season=${overview.data!.season!.seasonNumber}`:null,'No pudimos cargar la posición en Liga.');
  return <>
    {encoded&&<nav className="club-links" aria-label="Volver"><a href={division?competitionHref(`LIGA_${division}`,overview.data?.season?.seasonNumber):'#/competiciones'}>Volver a {division?'Liga':'Competiciones'}</a>{own&&<a href="#/club">Ir a Mi Club</a>}</nav>}
    <ParticipantState loading={profile.loading||overview.loading} error={profile.error||overview.error} retry={()=>{profile.retry();overview.retry();}}/>
    {profile.data&&overview.data&&<><ParticipantState loading={league.loading} error={league.error} retry={league.retry}/><ClubProfile own={own} data={{profile:profile.data,overview:overview.data,league:league.data}}/></>}
  </>;
}

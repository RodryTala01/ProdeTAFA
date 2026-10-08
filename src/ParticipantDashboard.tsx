import {ParticipantShield} from './AssetImage';
import { useEffect, useRef, useState } from 'react';
import { Brand, Icon } from './ui';
import ParticipantRound from './ParticipantRound';
import ParticipantHistory from './ParticipantHistory';
import ParticipantClubPage, { HeadToHead } from './ParticipantClub';
import PredictionHistoryBrowser from './PredictionHistoryBrowser';
import LeagueView from './LeagueView';
import ParticipantCompetitionsPage from './ParticipantCompetitions';
import ParticipantHome, { HomeErrors } from './ParticipantHome';
import { emptyHome, loadHome } from './participant-home';
import { participantRoute, participantSections, type ParticipantRoute } from './participant-navigation';
import './participant-shell.css';

export function ParticipantNavigation({ route }: { route: ParticipantRoute }) {
  return <nav className="participant-nav" aria-label="Navegación del participante">{participantSections.map(item => <a key={item.id} href={`#/${item.id}`} aria-current={route.split('?')[0].split('/')[0] === item.id ? 'page' : undefined}><Icon name={item.icon} /><span>{item.label}</span></a>)}</nav>;
}

export default function ParticipantDashboard({ user, onLogout }: { user: { id: string; fullName: string }; onLogout: () => void }) {
  const [route, setRoute] = useState(() => participantRoute(window.location.hash));
  const [data, setData] = useState(emptyHome);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const menu = useRef<HTMLDetailsElement>(null);
  const content = useRef<HTMLElement>(null);
  useEffect(() => {
    const refresh = () => setRevision(n => n + 1);
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  useEffect(() => {
    const change = () => {
      setRoute(participantRoute(window.location.hash));
      if (menu.current) menu.current.open = false;
      window.scrollTo(0, 0);
      content.current?.focus();
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (route !== 'inicio') return;
    setLoading(true);
    loadHome(controller.signal).then(next => {
      if (!controller.signal.aborted) { setData(next); setLoading(false); }
    });
    return () => controller.abort();
  }, [route, revision]);
  return <main className="app-shell participant-shell">
    <header className="topbar"><Brand /><details ref={menu} className="profile-menu" onKeyDown={event => { if (event.key === 'Escape' && menu.current) { menu.current.open = false; menu.current.querySelector('summary')?.focus(); } }}>
      <summary aria-label={`Menú de ${user.fullName}`}><span className="profile-name">{user.fullName}</span><ParticipantShield userId={user.id} name={user.fullName} decorative/></summary>
      <div className="profile-menu__items"><a href="#/club" onClick={() => { if (menu.current) menu.current.open = false; }}>Mi Club</a><button type="button" onClick={onLogout}><Icon name="logout" /> Cerrar sesión</button></div>
    </details></header>
    <div className={`dashboard participant-dashboard ${route === 'pronosticos' ? 'participant-dashboard--predictions' : ''}`}>
      <ParticipantNavigation route={route} />
      <section ref={content} className="participant-content" tabIndex={-1} aria-label="Contenido del participante">
        {route === 'pronosticos' ? <><div className="section-heading"><h2>Pronósticos</h2><a className="button button--ghost" href="#/club/historial">Ver historial</a></div><ParticipantRound /></>
          : route.startsWith('club/historial') ? <ParticipantHistory key={route} user={user} route={route}/>
          : route.startsWith('club/enfrentamientos') ? <><a href={new URLSearchParams(route.split('?')[1]).get('user')?`#/club/participante/${encodeURIComponent(new URLSearchParams(route.split('?')[1]).get('user')!)}`:'#/club'} className="button button--ghost">Volver al perfil</a><HeadToHead/></>
          : route === 'club/envios' ? <><a href="#/club" className="button button--ghost">Volver a Mi Club</a><PredictionHistoryBrowser own/></>
          : route === 'club' || route.startsWith('club/participante/') ? <ParticipantClubPage key={route} user={user} route={route}/>
          : route === 'competiciones/liga' ? <><a className="button button--ghost" href="#/competiciones">Volver a Competiciones</a><LeagueView /></>
          : route.startsWith('competiciones') ? <ParticipantCompetitionsPage route={route}/>
          : loading ? <p className="loader" role="status">Cargando tu temporada…</p>
          : <><HomeErrors errors={data.errors} retry={() => setRevision(n => n + 1)} /><ParticipantHome name={user.fullName} userId={user.id} data={data} /></>}
      </section>
    </div>
  </main>;
}

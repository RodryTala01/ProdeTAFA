import {useRoundRefresh} from './round-refresh';
import ParticipantAllTime from './ParticipantAllTime';
import {ParticipantShield} from './AssetImage';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './ui';
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
  useRoundRefresh(data.round?.matches, () => setRevision(n => n + 1), route === 'inicio');
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
    if (!data.round) setLoading(true);
    loadHome(controller.signal).then(next => {
      if (!controller.signal.aborted) { setData(next); setLoading(false); }
    });
    return () => controller.abort();
  }, [route, revision]);
  return <main className={`app-shell participant-shell ${route === 'inicio' ? 'participant-shell--home' : ''}`}>
    <header className="topbar participant-header"><a className="participant-brand" href="#/inicio" aria-label="Prode TAFA · Inicio"><img src="/brand/tafa.png" alt="Escudo oficial TAFA" width="40" height="64"/><span>Prode <strong>TAFA</strong></span></a><ParticipantNavigation route={route} /><details ref={menu} className="profile-menu" onKeyDown={event => { if (event.key === 'Escape' && menu.current) { menu.current.open = false; menu.current.querySelector('summary')?.focus(); } }}>
      <summary aria-label={`Menú de ${user.fullName}`}><span className="profile-name">{user.fullName}</span><span className="participant-profile-avatar"><ParticipantShield userId={user.id} name={user.fullName} decorative/></span><svg className="profile-chevron" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary>
      <div className="profile-menu__items"><a href="#/club" onClick={() => { if (menu.current) menu.current.open = false; }}>Mi Club</a><button type="button" onClick={onLogout}><Icon name="logout" /> Cerrar sesión</button></div>
    </details></header>
    <div className={`dashboard participant-dashboard ${route === 'pronosticos' ? 'participant-dashboard--predictions' : ''}`}>
      <section ref={content} className="participant-content" tabIndex={-1} aria-label="Contenido del participante">
        {route === 'pronosticos' ? <><div className="section-heading"><a className="button button--ghost" href="#/club/historial">Ver historial</a></div><ParticipantRound /></>
          : route === 'club/historicos' ? <ParticipantAllTime userId={user.id}/>
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

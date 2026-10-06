import { useRef, useState } from 'react';
import CompetitionPreview from './CompetitionPreview';
import { LoginScreen } from '../AppV2';
import { Brand, Icon, PasswordField, TeamIdentity } from '../ui';
import CompetitionList, { type CompetitionSummary } from '../CompetitionList';
import './design-preview.css';
import '../participant-round.css';

// This entire module is imported only behind import.meta.env.DEV in main.tsx.
// Fictional examples: no fetch, no storage, no submission to a Worker.
const competitions: CompetitionSummary[] = [
  { name: 'Liga A', monogram: 'LA', detail: 'Fecha 2 de 5 · 28 puntos', status: 'En juego', tone: 'success', position: '13.º' },
  { name: 'Copa A', monogram: 'CA', detail: 'Octavos de final · vs Participante 2', status: 'Clasificado', tone: 'success' },
  { name: 'Copa Total', monogram: 'CT', detail: 'Grupo B · Próxima jornada', status: 'En juego', tone: 'success' },
  { name: 'Copa Dúos', monogram: 'CD', detail: 'Tu compañero: Participante 3 · Fecha 3', status: 'En juego', tone: 'success' },
  { name: 'Copa Campeones', monogram: 'CC', detail: 'Participación finalizada', status: 'Eliminado' },
  { name: 'Copa Papa', monogram: 'CP', detail: 'Cuartos de final · vs Participante 4', status: 'Clasificado', tone: 'success' },
  { name: 'Promoción', monogram: 'PR', detail: 'Sin cruce asignado', status: 'No participa' },
  { name: 'Copa B', monogram: 'CB', detail: 'Competición de Liga B', status: 'No participa' },
];
const fixtures = [
  ['River Plate', 'Boca Juniors', 'Liga Profesional'], ['Racing Club', 'Independiente', 'Liga Profesional'],
  ['San Lorenzo', 'Huracán', 'Liga Profesional'], ['Estudiantes', 'Gimnasia', 'Liga Profesional'],
  ['Rosario Central', 'Newell’s', 'Liga Profesional'], ['Talleres', 'Belgrano', 'Liga Profesional'],
  ['Vélez Sarsfield', 'Argentinos Juniors', 'Liga Profesional'], ['Lanús', 'Banfield', 'Liga Profesional'],
  ['Atlético Tucumán', 'Central Córdoba', 'Liga Profesional'], ['Unión', 'Godoy Cruz', 'Liga Profesional'],
  ['Argentina', 'Brasil', 'Copa internacional'], ['Uruguay', 'Colombia', 'Copa internacional'],
];
type View = 'home' | 'predictions' | 'competitions' | 'system' | 'login';
const views: { id: View; label: string; icon: 'home' | 'list' | 'trophy' }[] = [
  { id: 'home', label: 'Inicio', icon: 'home' }, { id: 'predictions', label: 'Pronósticos', icon: 'list' }, { id: 'competitions', label: 'Competiciones', icon: 'trophy' },
];

function HomeReference({ onPredict, onCompetitions }: { onPredict: () => void; onCompetitions: () => void }) {
  return <>
    <div className="reference-title"><div><span className="eyebrow">TU TEMPORADA</span><h1>Participante 1<span className="accent-text">.</span></h1></div><div className="participant-identity"><span className="avatar" aria-hidden="true">R</span><span>Participante<br /><small>Liga A</small></span></div></div>
    <div className="home-layout"><div>
      <section className="next-round"><div className="section-kicker"><span className="eyebrow">PRÓXIMA FECHA</span><span className="status-badge status-badge--success">Abierta</span></div><h2>FECHA 3</h2><p>Viernes 2 de octubre · 21:30</p><div className="next-round__bottom"><div><small>Empieza en</small><strong className="sport-number">2<span>d</span> 14<span>h</span></strong></div><button className="button button--primary" onClick={onPredict}>Cargar pronósticos <Icon name="arrow" /></button></div></section>
      <section className="reference-section"><div className="section-heading"><h2>Tus competiciones</h2><button className="button button--ghost" onClick={onCompetitions}>Ver todas <Icon name="arrow" /></button></div><CompetitionList items={competitions.slice(0, 4)} /></section>
    </div><aside className="home-aside"><section className="reference-section"><div className="section-heading"><h2>Liga A</h2><span className="eyebrow">FECHA 2 / 5</span></div><div className="league-snapshot"><strong className="sport-number">13<span>º</span></strong><div><strong>28 <small>PTS</small></strong><p>Tu posición actual</p></div></div><div className="table-scroll" tabIndex={0} role="region" aria-label="Referencia de tabla Liga A"><table><thead><tr><th scope="col">Pos.</th><th scope="col">Participante</th><th className="num" scope="col">Pts</th></tr></thead><tbody>{[['11','Participante 2','31'],['12','Participante 4','29'],['13','Participante 1','28'],['14','Participante 3','26']].map(([rank,name,points])=><tr key={name} className={name==='Participante 1'?'is-highlighted':''}><td>{rank}</td><td>{name}{name==='Participante 1'?' · Vos':''}</td><td className="num"><strong>{points}</strong></td></tr>)}</tbody></table></div></section><section className="admin-notice"><span className="eyebrow">AVISO DEL ADMINISTRADOR</span><h3>Revisá los horarios</h3><p>Podés editar cada partido hasta su cierre. Recordá reenviar si hacés cambios.</p></section></aside></div>
  </>;
}

function PredictionReference() {
  const [scores, setScores] = useState<Record<string, string>>({ '0-h': '2', '0-a': '1' });
  const [penalties, setPenalties] = useState<Record<number, string>>({});
  const [message, setMessage] = useState('');
  function control(index: number, side: 'h' | 'a', team: string) {
    return <input type="number" inputMode="numeric" min="0" max="99" aria-label={`Goles ${team}`} value={scores[`${index}-${side}`] ?? ''} onChange={e=>setScores(s=>({...s,[`${index}-${side}`]:e.target.value}))} />;
  }
  return <div className="participant-round reference-predictions"><header className="participant-round-header"><div><span className="eyebrow">PRONÓSTICOS</span><h1>FECHA 3</h1><p>12 partidos · Viernes 2 de octubre</p></div><span className="status-badge status-badge--success">Abierta</span></header><div className="reference-context"><span>Estás jugando esta Fecha en:</span><strong>Liga A · Fecha 3</strong><strong>Copa A · Octavos · vs Participante 2</strong></div><div className="prediction-list">{fixtures.map(([home,away,competition],index)=><article className="prediction-card" key={home}><div className="prediction-meta"><span className="prediction-competition">{competition}</span><time>Vie 21:30</time><time className="prediction-lock-time">Cierre: vie 02/10, 21:31:00 (Argentina)</time><b className="match-countdown">Cierra en 2d 14h</b></div><div className="score-prediction"><div className="score-side"><TeamIdentity name={home} />{control(index,'h',home)}</div><span className="score-separator" aria-hidden="true">—</span><div className="score-side score-side--away">{control(index,'a',away)}<TeamIdentity name={away} /></div></div>{index>=10&&<div className="penalty-prediction"><p><strong>Penales</strong></p><div className="penalty-options">{[home,away].map(team=><button key={team} type="button" aria-pressed={penalties[index]===team} className={`penalty-option ${penalties[index]===team?'penalty-option--selected':''}`} onClick={()=>setPenalties(p=>({...p,[index]:team}))}>{team}</button>)}</div><small>Elegí quién ganaría la tanda si el partido llega a penales.</small></div>}<div className="prediction-footer"><small>{scores[`${index}-h`]!==undefined?'Guardado en esta vista de ejemplo':'Sin completar'}</small><small>{String(index+1).padStart(2,'0')}</small></div></article>)}</div><section className="card submit-card"><div className="submit-copy"><p>Completá los partidos abiertos antes de enviar.</p>{message&&<p role="status">{message}</p>}</div><button className="button button--primary" onClick={()=>setMessage('Vista de diseño: no se envió ningún pronóstico.')}>Enviar pronóstico</button></section></div>;
}

function SystemReference() {
  const dialog = useRef<HTMLDialogElement>(null);
  return <><div className="reference-title"><div><span className="eyebrow">IDENTIDAD 01</span><h1>Sistema visual</h1></div></div><div className="system-grid"><section className="reference-section"><h2>Acciones y estados</h2><div className="component-samples"><button className="button button--primary" onClick={()=>dialog.current?.showModal()}>Acción principal</button><button className="button button--secondary" onClick={()=>dialog.current?.showModal()}>Secundaria</button><button className="button button--ghost" onClick={()=>dialog.current?.showModal()}>Ver detalle</button><button className="button button--danger" onClick={()=>dialog.current?.showModal()}>Acción sensible</button><button className="button button--secondary" disabled>No disponible</button></div><p className="alert alert--success">Pronóstico enviado correctamente.</p><p className="alert alert--warning">Hay cambios pendientes de reenviar.</p><p className="alert alert--error" role="alert">No se pudo guardar. Intentá de nuevo.</p><dialog className="design-dialog card" ref={dialog}><h2>Confirmar acción</h2><p>Ejemplo visual. Esta ventana no modifica ningún dato.</p><form method="dialog" className="modal-actions"><button className="button button--ghost">Cancelar</button><button className="button button--primary">Entendido</button></form></dialog></section><section className="reference-section"><h2>Controles</h2><div className="form-stack"><label className="field"><span>Nombre</span><input placeholder="Nombre del participante" /></label><PasswordField defaultValue="EjemploLocal" /><label className="field"><span>Fecha</span><select defaultValue="3"><option value="3">Fecha 3</option><option value="4">Fecha 4</option></select></label><label className="field"><span>Campo con error</span><input aria-invalid="true" aria-describedby="sample-error" defaultValue="Valor de ejemplo" /><small id="sample-error" role="alert">Revisá este valor.</small></label><label className="field field--success"><span>Campo validado</span><input defaultValue="Valor correcto" /><small>Validación correcta.</small></label><label className="field"><span>No editable</span><input value="Fecha finalizada" disabled /></label></div></section></div></>;
}

export default function DesignPreview() {
  const initial = new URLSearchParams(location.search).get('view');
  const [view, setView] = useState<View>(['home','predictions','competitions','system','login'].includes(initial??'') ? initial as View : 'home');
  function navigate(next: View) { setView(next); history.replaceState(null,'',`/design?view=${next}`); window.scrollTo(0,0); }
  if (initial === 'competitions-full' || initial === 'league') return <CompetitionPreview initial={initial}/>;
  return <><div className="design-notice"><span>VISTA DE DISEÑO · DATOS DE EJEMPLO · SÓLO LOCAL</span><div><button onClick={()=>navigate(view==='login'?'home':'login')}>{view==='login'?'Inicio':'Login'}</button><button onClick={()=>navigate('system')}>Sistema visual</button><a href="/">App local</a></div></div>{view==='login'?<LoginScreen onLogin={()=>{ location.href='/'; }} />:<main className="app-shell"><header className="topbar"><Brand /><div className="topbar-actions"><span className="user-chip">Participante 1</span><span className="avatar" aria-label="Escudo pendiente de Participante 1">R</span></div></header><div className={`dashboard design-dashboard ${view==='predictions'?'dashboard--narrow':''}`}><nav className="admin-tabs reference-nav" aria-label="Referencias de diseño">{views.map(item=><button key={item.id} className={`admin-tab ${view===item.id?'admin-tab--active':''}`} aria-current={view===item.id?'page':undefined} onClick={()=>navigate(item.id)}><Icon name={item.icon}/><span>{item.label}</span></button>)}</nav>{view==='home'?<HomeReference onPredict={()=>navigate('predictions')} onCompetitions={()=>navigate('competitions')} />:view==='predictions'?<PredictionReference />:view==='competitions'?<><div className="reference-title"><div><span className="eyebrow">TU TEMPORADA</span><h1>Competiciones</h1><p>Tu recorrido, competición por competición.</p></div></div><div className="competition-reference-layout"><section><div className="section-heading"><h2>En juego</h2><span className="eyebrow">5 COMPETICIONES</span></div><CompetitionList items={competitions.filter(c=>c.tone==='success')} /></section><section><h2>Otras competiciones</h2><CompetitionList items={competitions.filter(c=>c.tone!=='success')} /></section></div></>:<SystemReference />}</div></main>}</>;
}

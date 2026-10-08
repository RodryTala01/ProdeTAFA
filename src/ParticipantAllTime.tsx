import {useState} from 'react';
import {ParticipantShield} from './AssetImage';
import {ParticipantState,useParticipantRead} from './ParticipantState';
import {profileHref} from './participant-profile';

type Standing={userId:string;fullName:string;position:number;points:number;roundsPlayed:number;fulls:number;partials:number};
export default function ParticipantAllTime({userId}:{userId:string}) {
  const [query,setQuery]=useState('');
  const read=useParticipantRead<{standings:Standing[]}>('/api/participant/history-ranking','No pudimos cargar el ranking histórico.');
  const rows=read.data?.standings.filter(r=>r.fullName.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')));
  return <section className="reference-section">
    <a className="button button--ghost" href="#/club">Volver a Mi Club</a>
    <h1>Ranking histórico</h1>
    <p>Suma de puntos oficiales definitivos de todas las Fechas finalizadas con envío. Incluye participantes inactivos y sólo la historia cargada, sin duplicar puntos por Liga o Copa.</p>
    <p className="sport-footnote">Es independiente de la Liga actual y de IFFHS. Los empates en puntos comparten posición.</p>
    <label className="field history-select"><span>Buscar participante</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <ParticipantState loading={read.loading} error={read.error} retry={read.retry}/>
    {rows&& (rows.length?<div className="sport-table-scroll"><table className="sport-table league-sport-table"><caption className="sr-only">Puntos históricos de Fechas finalizadas</caption><thead><tr><th>POS</th><th><span className="sr-only">Escudo</span></th><th>Participante</th><th>PTS</th><th className="league-secondary">Fechas</th><th className="league-secondary">Plenos</th><th className="league-secondary">Parciales</th></tr></thead><tbody>{rows.map(r=><tr key={r.userId} className={r.userId===userId?'sport-mine':''}><td>{r.position}</td><td><ParticipantShield userId={r.userId} name={r.fullName} size="sm"/></td><th scope="row"><a href={profileHref(r.userId)}>{r.fullName}</a></th><td className="sport-points">{r.points}</td><td className="league-secondary">{r.roundsPlayed}</td><td className="league-secondary">{r.fulls}</td><td className="league-secondary">{r.partials}</td></tr>)}</tbody></table></div>:<p>{query?'No hay participantes con ese nombre.':'Todavía no hay Fechas finalizadas con envíos.'}</p>)}
  </section>;
}

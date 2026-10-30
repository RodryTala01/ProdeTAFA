import {ParticipantShield} from './AssetImage';
import {useEffect,useState} from 'react';
import './admin-submissions.css';
export type SubmissionParticipant={id:string;name:string;active:number;lastAt:string|null;count:number};
function sentAt(value:string){
 const utc=/(Z|[+-]\d{2}:\d{2})$/.test(value)?value:`${value.replace(' ','T')}Z`;
 return new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(utc));
}
export function SubmissionLists({participants}:{participants:SubmissionParticipant[]}){
 const active=participants.filter(p=>p.active);
 const sent=active.filter(p=>p.lastAt);
 const pending=active.filter(p=>!p.lastAt);
 const inactive=participants.filter(p=>!p.active);
 const person=(p:SubmissionParticipant)=><li key={p.id}><span className="participant-shield-name"><ParticipantShield userId={p.id} name={p.name} size="sm" decorative/><strong>{p.name}</strong></span><span>{p.lastAt?<>Enviado · <time dateTime={p.lastAt}>{sentAt(p.lastAt)}</time>{p.count>1?' · Reenviado':''}</>:'No envió'}</span></li>;
 return <><p className="submission-counts"><strong>{sent.length} enviaron</strong><span>{pending.length} no enviaron</span><small>{active.length} participantes activos</small></p><div className="submission-lists"><section aria-label="No enviaron"><h3>No enviaron · {pending.length}</h3>{pending.length?<ul>{pending.map(person)}</ul>:<p>{active.length?'Todos los participantes activos enviaron.':'No hay participantes activos.'}</p>}</section><section aria-label="Enviaron"><h3>Enviaron · {sent.length}</h3>{sent.length?<ul>{sent.map(person)}</ul>:<p>Todavía no hay envíos de participantes activos.</p>}</section></div>{inactive.length>0&&<details><summary>Participantes inactivos · {inactive.length}</summary><ul className="submission-inactive">{inactive.map(person)}</ul></details>}</>;
}
export default function AdminRoundSubmissions({roundId}:{roundId:number}){
 const [participants,setParticipants]=useState<SubmissionParticipant[]|null>(null);
 const [error,setError]=useState(false);
 const [loading,setLoading]=useState(false);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  const refresh=()=>setRevision(n=>n+1);
  const timer=window.setInterval(refresh,60000);
  window.addEventListener('focus',refresh);
  return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[]);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError(false);
  fetch(`/api/admin/rounds/${roundId}/prediction-history`,{signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error('No disponible');
   const data=await response.json();
   if(!controller.signal.aborted)setParticipants(data.participants);
  }).catch(()=>{if(!controller.signal.aborted)setError(true);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[roundId,revision]);
 return <section className="card admin-round-submissions"><div className="section-heading"><h2>Envíos de la Fecha</h2><button type="button" className="button button--secondary" disabled={loading} onClick={()=>setRevision(n=>n+1)}>{loading?'Actualizando…':'Actualizar envíos'}</button></div><p className="submission-note">Sólo envíos oficiales; guardar un borrador no cuenta. Horarios de Argentina.</p>{error&&<p role="alert">No pudimos actualizar los envíos.{participants?' Se muestra la última consulta disponible.':''} Reintentá con Actualizar envíos.</p>}{!participants&&loading&&<p role="status">Cargando envíos…</p>}{participants&&<SubmissionLists participants={participants}/>}</section>;
}

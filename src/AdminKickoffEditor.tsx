import {useEffect,useState,type FormEvent} from 'react';
import {argentinaDateTime,utcDate} from './match-time';
import './admin-kickoff-editor.css';

function argentinaInput(value:string){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Argentina/Buenos_Aires',
  year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
  .formatToParts(utcDate(value));
 const valueOf=(type:string)=>parts.find(p=>p.type===type)?.value??'';
 return valueOf('year')+'-'+valueOf('month')+'-'+valueOf('day')+'T'+valueOf('hour')+':'+valueOf('minute');
}
export default function AdminKickoffEditor({roundId,matchId,kickoffAt,corrected,onChanged}:{
 roundId:number;matchId:number;kickoffAt:string;corrected?:boolean;onChanged:()=>void;
}){
 const [local,setLocal]=useState(()=>argentinaInput(kickoffAt));
 const [reason,setReason]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 useEffect(()=>{setLocal(argentinaInput(kickoffAt));setSuccess('');},[kickoffAt]);
 async function submit(e:FormEvent){
  e.preventDefault();if(busy)return;
  if(reason.trim().length<8){setError('Ingresá un motivo de al menos 8 caracteres.');return;}
  const willLock=new Date(local+':00-03:00').getTime()+60000<=Date.now();
  if(!window.confirm(willLock
    ?'El horario elegido ya pasó. El partido quedará cerrado para nuevos pronósticos. ¿Confirmás la corrección?'
    :'El horario de este partido cambiará para todos los participantes. ¿Confirmás?'))return;
  setBusy(true);setError('');setSuccess('');
  try{
   const response=await fetch('/api/admin/rounds/'+roundId+'/matches/'+matchId+'/kickoff',{
    method:'PUT',headers:{'content-type':'application/json'},
    body:JSON.stringify({localDateTime:local,reason:reason.trim()})
   });
   const body=await response.json().catch(()=>({})) as {error?:string;locked?:boolean};
   if(!response.ok)throw Error(body.error??'No se pudo corregir el horario');
   setSuccess(body.locked?'Horario actualizado. El partido quedó cerrado.':'Horario actualizado.');
   setReason('');onChanged();
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el horario');}
  finally{setBusy(false);}
 }
 return <details className="admin-kickoff-editor">
  <summary>Corregir horario {corrected?'· fijado por Admin':'· Argentina'}</summary>
  <form onSubmit={e=>void submit(e)}>
   <p>Actual: <strong>{argentinaDateTime(kickoffAt,{year:'numeric'})}</strong>. El proveedor no podrá sobrescribir una corrección manual.</p>
   <label>Inicio real · hora de Argentina <input type="datetime-local" required value={local} onChange={e=>setLocal(e.target.value)} disabled={busy}/></label>
   <label>Motivo <input required minLength={8} maxLength={300} placeholder="Ej.: horario confirmado por el club" value={reason} onChange={e=>setReason(e.target.value)} disabled={busy}/></label>
   <button type="submit" className="button button--secondary" disabled={busy||reason.trim().length<8}>{busy?'Guardando…':'Guardar horario'}</button>
   <small>No modifica pronósticos enviados, resultados ni puntajes.</small>
   {error&&<p role="alert">{error}</p>}
   {success&&<p role="status">{success}</p>}
  </form>
 </details>;
}

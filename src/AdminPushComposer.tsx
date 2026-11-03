import {useMemo,useState} from 'react';

type Recipient={id:string;name:string;active:boolean;devices:number};
type RecentManual={id:number;createdAt:string;title:string;body:string;kind:string;participants:number;devices:number;accepted:number;failed:number};
export type ManualOverview={
 participants:Recipient[];
 currentRound:{id:number;name:string}|null;
 finishedRound:{id:number;name:string}|null;
 pendingUserIds:string[];
 manualMessages:RecentManual[];
};
type Kind='new_round'|'reminder'|'results'|'custom';
type Audience='all'|'pending'|'selected';
type Destination='inicio'|'pronosticos'|'competiciones'|'club';
type SendResult={ok:boolean;participants:number;devices:number;accepted:number;failed:number;error?:string};

const label=(kind:Kind)=>({
 new_round:'Nueva fecha',reminder:'Recordatorio de pronósticos',results:'Resultados disponibles',custom:'Mensaje personalizado'
})[kind];

function dateAr(value:string){
 const iso=/(Z|[+-]\d{2}:\d{2})$/.test(value)?value:value.replace(' ','T')+'Z';
 return new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',
  day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
}

export default function AdminPushComposer({data,onSent}:{data:ManualOverview;onSent:()=>void}){
 const [kind,setKind]=useState<Kind>('new_round');
 const [audience,setAudience]=useState<Audience>('all');
 const [selected,setSelected]=useState<string[]>([]);
 const [title,setTitle]=useState('');
 const [body,setBody]=useState('');
 const [destination,setDestination]=useState<Destination>('inicio');
 const [confirm,setConfirm]=useState(false);
 const [requestId,setRequestId]=useState('');
 const [sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const [result,setResult]=useState<SendResult|null>(null);
 const all=useMemo(()=>data.participants.filter(p=>p.active&&p.devices>0),[data.participants]);
 const pending=new Set(data.pendingUserIds);
 const chosen=new Set(selected);
 const targets=all.filter(p=>audience==='all'||audience==='pending'&&pending.has(p.id)||audience==='selected'&&chosen.has(p.id));
 const devices=targets.reduce((sum,p)=>sum+p.devices,0);
 const noRound=(kind==='new_round'||kind==='reminder'||audience==='pending')&&!data.currentRound;
 const noResults=kind==='results'&&!data.finishedRound;
 const validCustom=kind!=='custom'||(title.trim().length>=3&&title.trim().length<=70&&
  body.trim().length>=5&&body.trim().length<=240&&!/[<>]/.test(title+body));
 const canSend=Boolean(targets.length&&validCustom&&!noRound&&!noResults&&!sending);
 const preview=kind==='new_round'
  ?{title:'⚽ ¡Nueva fecha disponible!',body:(data.currentRound?.name??'La nueva Fecha')+' ya está disponible. ¡Cargá tus pronósticos!'}
  :kind==='reminder'
   ?{title:'⏰ ¡Pronósticos pendientes!',body:'Todavía no enviaste o tenés cambios pendientes en '+(data.currentRound?.name??'la Fecha')+'. ¡Entrá a TAFA!'}
   :kind==='results'
    ?{title:'🏆 ¡Resultados disponibles!',body:'Ya podés consultar los resultados de '+(data.finishedRound?.name??'la Fecha')+' y tu posición en TAFA.'}
    :{title:title.trim()||'Título del aviso',body:body.trim()||'Escribí el mensaje que recibirán los participantes.'};
 function resetDecision(){setConfirm(false);setError('');setResult(null);}
 function chooseKind(next:Kind){
  setKind(next);setAudience(next==='reminder'?'pending':'all');resetDecision();
 }
 function openConfirmation(){
  if(!canSend)return;
  setRequestId(crypto.randomUUID());
  setConfirm(true);setError('');setResult(null);
 }
 async function send(){
  if(!confirm||!requestId||!canSend)return;
  setSending(true);setError('');
  try{
   const response=await fetch('/api/admin/push/send',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({requestId,kind,audience,userIds:audience==='selected'?targets.map(p=>p.id):undefined,
     title:kind==='custom'?title.trim():undefined,
     body:kind==='custom'?body.trim():undefined,destination:kind==='custom'?destination:undefined})
   });
   const output=await response.json().catch(()=>({})) as SendResult;
   if(!response.ok)throw Error(output.error??'No se pudo enviar el aviso');
   setResult(output);setConfirm(false);onSent();
  }catch(e){setError((e instanceof Error?e.message:'No se pudo enviar')+
   ' Si el problema fue de conexión, revisá los últimos envíos antes de repetirlo.');setConfirm(false);}
  finally{setSending(false);}
 }
 return <section className="card admin-push-compose">
  <div className="admin-push-compose__heading"><h2>Enviar notificación manual</h2>
   <p>Elegí un aviso para enviarlo ahora o redactá uno propio. Solo llegará a dispositivos con notificaciones activadas.</p></div>
  <div className="admin-push-compose__fields">
   <label className="field"><span>Tipo de notificación</span><select value={kind} disabled={sending} onChange={e=>chooseKind(e.target.value as Kind)}>
    <option value="new_round">⚽ Nueva fecha</option>
    <option value="reminder">⏰ Recordatorio de pronósticos</option>
    <option value="results">🏆 Resultados disponibles</option>
    <option value="custom">✏️ Personalizada</option>
   </select></label>
   <label className="field"><span>Destinatarios</span><select value={audience} disabled={sending||kind==='reminder'} onChange={e=>{setAudience(e.target.value as Audience);resetDecision();}}>
    <option value="all">Todos los que activaron push</option>
    <option value="pending">Solo pronósticos pendientes</option>
    <option value="selected">Elegir participantes</option>
   </select></label>
  </div>
  {kind==='reminder'&&<p className="admin-push-note">Este aviso siempre se envía únicamente a quienes aún tienen pronósticos pendientes.</p>}
  {audience==='selected'&&<div className="admin-push-recipients">
   <strong>Seleccioná los participantes</strong>
   <div className="admin-push-recipients__list">{all.map(person=><label key={person.id}>
    <input type="checkbox" disabled={sending} checked={chosen.has(person.id)}
     onChange={e=>{setSelected(old=>e.target.checked?[...old,person.id]:old.filter(id=>id!==person.id));resetDecision();}}/>
    <span>{person.name}</span><small>{person.devices} {person.devices===1?'dispositivo':'dispositivos'}</small>
   </label>)}</div>
  </div>}
  {kind==='custom'&&<div className="admin-push-compose__custom">
   <label className="field"><span>Título de la notificación · {title.length}/70</span>
    <input value={title} maxLength={70} disabled={sending} onChange={e=>{setTitle(e.target.value);resetDecision();}} placeholder="Ej.: Atención, participantes de TAFA"/></label>
   <label className="field"><span>Mensaje · {body.length}/240</span>
    <textarea value={body} maxLength={240} rows={3} disabled={sending} onChange={e=>{setBody(e.target.value);resetDecision();}} placeholder="Escribí el aviso que recibirán los participantes…"/></label>
   <label className="field"><span>Al tocar la notificación, abrir</span>
    <select value={destination} disabled={sending} onChange={e=>{setDestination(e.target.value as Destination);resetDecision();}}>
     <option value="inicio">Inicio</option><option value="pronosticos">Pronósticos</option>
     <option value="competiciones">Competiciones</option><option value="club">Mi Club</option>
    </select></label>
  </div>}
  <div className="admin-push-preview">
   <small>Vista previa</small><strong>{preview.title}</strong><p>{preview.body}</p>
  </div>
  <p className="admin-push-note">Destinatarios estimados: <strong>{targets.length} participantes · {devices} dispositivos</strong>.
   {audience==='pending'?' Se consulta la Fecha abierta y el estado de sus envíos.':''}
   {' '}La cantidad se verifica nuevamente al enviar.</p>
  {(noRound||noResults)&&<p role="status" className="admin-push-compose__warning">{noRound?'No hay una Fecha abierta para este aviso.':'Todavía no hay una Fecha finalizada.'}</p>}
  {!confirm?<button type="button" className="button button--primary" disabled={!canSend}
    onClick={openConfirmation}>Preparar envío</button>
   :<div className="admin-push-confirm">
    <strong>¿Confirmás el envío?</strong>
    <p>Se enviará «{preview.title}» a {targets.length} participantes ({devices} dispositivos).
     No se puede retirar una notificación después de enviarla.</p>
    <div className="admin-push-confirm__actions">
     <button type="button" className="button button--primary" disabled={sending||!canSend} onClick={()=>void send()}>{sending?'Enviando…':'Confirmar y enviar ahora'}</button>
     <button type="button" className="button button--ghost" disabled={sending} onClick={()=>setConfirm(false)}>Cancelar</button>
    </div>
   </div>}
  {error&&<p role="alert" className="admin-push-compose__warning">{error}</p>}
  {result&&<p role="status" className="admin-push-compose__result">
    Envío realizado a {result.participants} participantes: {result.accepted} dispositivos aceptados, {result.failed} fallidos.
    {result.failed>0?' Revisá el historial de entregas.':''}
   </p>}
  {data.manualMessages.length>0&&<div className="admin-push-manual-history">
   <h3>Últimas notificaciones manuales</h3>
   <div className="admin-push-scroll"><table><thead><tr>
    <th scope="col">Fecha</th><th scope="col">Aviso</th><th scope="col">Participantes</th>
    <th scope="col">Aceptados</th><th scope="col">Fallidos</th>
   </tr></thead><tbody>{data.manualMessages.map(item=><tr key={item.id}>
    <td>{dateAr(item.createdAt)}</td>
    <th scope="row">{item.title}</th><td>{item.participants}</td><td>{item.accepted}</td><td>{item.failed}</td>
   </tr>)}</tbody></table></div>
  </div>}
 </section>;
}

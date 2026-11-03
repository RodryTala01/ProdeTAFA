import {useEffect,useMemo,useState} from 'react';
import {ParticipantShield} from './AssetImage';
import AdminPushComposer, {type ManualOverview} from './AdminPushComposer';
import './admin-push.css';

type Person={id:string;name:string;active:boolean;devices:number;lastRegisteredAt:string|null;sent:number;failed:number};
type Delivery={id:number;userId:string;name:string;eventKey:string;status:'pending'|'sent'|'failed';attempts:number;attemptedAt:string};
type Overview=Omit<ManualOverview,'participants'> & {participants:Person[];deliveries:Delivery[]};
type Filter='all'|'enabled'|'missing'|'inactive';

function dateAr(value:string|null){
 if(!value)return '—';
 const iso=/(Z|[+-]\d{2}:\d{2})$/.test(value)?value:value.replace(' ','T')+'Z';
 const date=new Date(iso);
 if(Number.isNaN(date.getTime()))return '—';
 return new Intl.DateTimeFormat('es-AR',{
  timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'2-digit',year:'numeric',
  hour:'2-digit',minute:'2-digit',hourCycle:'h23'
 }).format(date);
}
function eventName(key:string){
 if(key.startsWith('test:'))return 'Prueba';
 if(key.startsWith('manual:'))return 'Notificación manual';
 const match=key.match(/^round:(\d+):(published|reminder24|reminder2|finished)$/);
 if(!match)return 'Otro aviso';
 const labels:Record<string,string>={published:'Fecha publicada',reminder24:'Recordatorio 24 h',reminder2:'Recordatorio 2 h',finished:'Fecha finalizada'};
 return labels[match[2]]+' · #'+match[1];
}
const statusName=(status:Delivery['status'])=>status==='sent'?'Aceptado por servicio push':status==='failed'?'Fallido':'Pendiente';

export default function AdminPushNotifications(){
 const [data,setData]=useState<Overview|null>(null);
 const [filter,setFilter]=useState<Filter>('all');
 const [query,setQuery]=useState('');
 const [revision,setRevision]=useState(0);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  setLoading(true);setError('');
  fetch('/api/admin/push/overview',{signal:controller.signal,cache:'no-store'}).then(async response=>{
   const payload=await response.json().catch(()=>({})) as Overview & {error?:string};
   if(!response.ok)throw Error(payload.error??'No se pudo consultar el estado.');
   if(!controller.signal.aborted)setData(payload);
  }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'No se pudo consultar el estado.');})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return ()=>controller.abort();
 },[revision]);
 const participants=data?.participants??[];
 const active=participants.filter(p=>p.active);
 const enabled=active.filter(p=>p.devices>0).length;
 const missing=active.length-enabled;
 const devices=active.reduce((sum,p)=>sum+p.devices,0);
 const filtered=useMemo(()=>participants.filter(p=>{
  if(filter==='enabled'&&(!p.active||!p.devices))return false;
  if(filter==='missing'&&(!p.active||p.devices))return false;
  if(filter==='inactive'&&p.active)return false;
  if(filter==='all'&&!p.active)return false;
  return p.name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es'));
 }),[participants,filter,query]);
 return <section className="admin-push">
  <div className="panel-heading">
   <div><h1>Notificaciones push</h1><p>Estado de los dispositivos registrados y últimos envíos.</p></div>
   <button type="button" className="button button--secondary" disabled={loading} onClick={()=>setRevision(n=>n+1)}>{loading?'Actualizando…':'Actualizar'}</button>
  </div>
  {error&&<p role="alert" className="alert alert--error">{error}{data?' Se muestra la última consulta disponible.':''}</p>}
  {!data&&loading&&<p role="status">Cargando notificaciones…</p>}
  {data&&<>
   <div className="admin-push-stats" aria-label="Resumen de notificaciones">
    <div><small>Participantes activos</small><strong>{active.length}</strong></div>
    <div><small>Con notificaciones</small><strong>{enabled}</strong></div>
    <div><small>Sin activar</small><strong>{missing}</strong></div>
    <div><small>Dispositivos registrados</small><strong>{devices}</strong></div>
   </div>
   <p className="admin-push-note">«Activadas» significa que hay al menos un dispositivo registrado. No confirma que el permiso siga vigente ni que se hayan leído los avisos.</p>
   <AdminPushComposer data={data} onSent={()=>setRevision(n=>n+1)}/>
   <div className="admin-push-toolbar">
    <label className="field"><span>Buscar participante</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre del participante"/></label>
    <label className="field"><span>Mostrar</span><select value={filter} onChange={e=>setFilter(e.target.value as Filter)}>
     <option value="all">Todos los activos ({active.length})</option>
     <option value="enabled">Activadas ({enabled})</option>
     <option value="missing">Sin activar ({missing})</option>
     <option value="inactive">Inactivos ({participants.length-active.length})</option>
    </select></label>
   </div>
   <section className="card admin-push-panel">
    <h2>Participantes · {filtered.length}</h2>
    <div className="admin-push-scroll"><table>
     <thead><tr><th scope="col">Participante</th><th scope="col">Estado</th><th scope="col">Dispositivos</th><th scope="col">Último registro</th><th scope="col">Envíos aceptados</th><th scope="col">Fallidos</th></tr></thead>
     <tbody>{filtered.map(p=><tr key={p.id}>
      <th scope="row"><span className="admin-push-person"><ParticipantShield userId={p.id} name={p.name} size="sm" decorative/>{p.name}</span></th>
      <td><span className={'admin-push-state '+(p.devices?'admin-push-state--enabled':'admin-push-state--missing')}>{p.devices?'Activadas':'Sin activar'}</span></td>
      <td>{p.devices}</td><td>{dateAr(p.lastRegisteredAt)}</td><td>{p.sent}</td><td>{p.failed}</td>
     </tr>)}</tbody>
    </table></div>
    {filtered.length===0&&<p className="admin-push-note">No hay participantes que coincidan con el filtro.</p>}
   </section>
   <section className="card admin-push-panel">
    <h2>Últimos intentos de envío</h2>
    <p className="admin-push-note">Últimos 50 registros por dispositivo. «Aceptado» significa que el servicio push recibió el mensaje, no que se mostró o leyó en el celular. Los registros de suscripciones eliminadas dejan de aparecer.</p>
    <div className="admin-push-scroll"><table>
     <thead><tr><th scope="col">Fecha</th><th scope="col">Participante</th><th scope="col">Aviso</th><th scope="col">Estado</th><th scope="col">Intentos</th></tr></thead>
     <tbody>{data.deliveries.map(d=><tr key={d.id}>
      <td>{dateAr(d.attemptedAt)}</td><th scope="row">{d.name}</th><td>{eventName(d.eventKey)}</td>
      <td><span className={'admin-push-state admin-push-state--'+d.status}>{statusName(d.status)}</span></td><td>{d.attempts}</td>
     </tr>)}</tbody>
    </table></div>
    {!data.deliveries.length&&<p className="admin-push-note">Todavía no hay intentos de envío registrados.</p>}
   </section>
  </>}
 </section>;
}

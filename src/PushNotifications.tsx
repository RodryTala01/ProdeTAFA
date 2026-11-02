import {useEffect,useState} from 'react';
import './push-notifications.css';

type Config={publicKey:string|null;ready:boolean;devices:number};
const api=async<T,>(path:string,init?:RequestInit):Promise<T>=>{
 const r=await fetch('/api/participant/push/'+path,{...init,headers:{'content-type':'application/json',...init?.headers}});
 const body=await r.json() as T & {error?:string};
 if(!r.ok)throw Error(body.error||'No se pudo completar la operación');
 return body;
};
function decode(key:string){
 const padded=key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4);
 const binary=atob(padded),buffer=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)buffer[i]=binary.charCodeAt(i);
 return buffer;
}
const supported=()=>typeof window!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const iosWeb=()=>/iPad|iPhone|iPod/.test(navigator.userAgent);
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches
 ||Boolean((navigator as Navigator & {standalone?:boolean}).standalone);

export default function PushNotifications(){
 const [config,setConfig]=useState<Config|null>(null);
 const [enabled,setEnabled]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [current,setCurrent]=useState<PushSubscription|null>(null);
 useEffect(()=>{
  let alive=true;
  (async()=>{
   try{
    const cfg=await api<Config>('config');if(!alive)return;setConfig(cfg);
    if(!supported()||!cfg.ready)return;
    const reg=await navigator.serviceWorker.register('/sw.js');
    const subscription=await reg.pushManager.getSubscription();
    if(!alive)return;
    setCurrent(subscription);
    if(subscription){
     const status=await api<{enabled:boolean}>('status',{method:'POST',body:JSON.stringify({endpoint:subscription.endpoint})});
     if(alive)setEnabled(status.enabled);
    }
   }catch(e){if(alive)setError(e instanceof Error?e.message:'No se pudo consultar el permiso');}
  })();
  return ()=>{alive=false;};
 },[]);
 const compatible=supported()&&(!iosWeb()||standalone());
 async function activate(){
  if(!config?.publicKey||!compatible)return;
  setBusy(true);setError('');setMessage('');
  try{
   // The permission prompt is triggered by the participant's actual button click.
   const permission=await Notification.requestPermission();
   if(permission!=='granted')throw Error('El dispositivo no autorizó las notificaciones. Revisá los permisos del navegador.');
   const reg=await navigator.serviceWorker.register('/sw.js');
   const existing=await reg.pushManager.getSubscription();
   const subscription=existing??await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(config.publicKey) as BufferSource});
   const value=subscription.toJSON();
   await api('subscribe',{method:'POST',body:JSON.stringify(value)});
   setCurrent(subscription);setEnabled(true);setMessage('Notificaciones activadas en este dispositivo.');
  }catch(e){setError(e instanceof Error?e.message:'No se pudieron activar las notificaciones');}
  finally{setBusy(false);}
 }
 async function deactivate(){
  setBusy(true);setError('');setMessage('');
  try{
   const subscription=current??await (await navigator.serviceWorker.ready).pushManager.getSubscription();
   if(subscription){
    await api('unsubscribe',{method:'POST',body:JSON.stringify({endpoint:subscription.endpoint})});
    await subscription.unsubscribe();
   }
   setEnabled(false);setCurrent(null);setMessage('Notificaciones desactivadas en este dispositivo.');
  }catch(e){setError(e instanceof Error?e.message:'No se pudieron desactivar');}
  finally{setBusy(false);}
 }
 async function test(){
  if(!current)return;
  setBusy(true);setError('');setMessage('');
  try{
   await api('test',{method:'POST',body:JSON.stringify({endpoint:current.endpoint})});
   setMessage('Aviso de prueba enviado al servicio push de tu dispositivo.');
  }catch(e){setError(e instanceof Error?e.message:'No se pudo enviar la prueba');}
  finally{setBusy(false);}
 }
 return <section className="push-settings" aria-label="Notificaciones de TAFA">
  <div className="push-settings__top"><div><h2>Notificaciones</h2><p>Recibí avisos de nuevas Fechas, pronósticos pendientes y resultados, incluso con TAFA cerrada.</p></div><span aria-hidden="true">🔔</span></div>
  {!config?<p className="push-settings__hint">Consultando disponibilidad…</p>
   :!config.ready?<p className="push-settings__hint">Las notificaciones todavía no están configuradas en TAFA.</p>
   :!supported()?<p className="push-settings__hint">Este navegador no admite notificaciones push. Probá con Chrome, Firefox, Edge o la app instalada.</p>
   :iosWeb()&&!standalone()?<p className="push-settings__hint">En iPhone: abrí TAFA desde Safari, tocá Compartir → Agregar a inicio y luego abrí TAFA desde el icono para activarlas.</p>
   :<div className="push-settings__actions">
    <button type="button" className="button button--secondary" disabled={busy} onClick={()=>void(enabled?deactivate():activate())}>{busy?'Procesando…':enabled?'Desactivar en este dispositivo':'Activar notificaciones'}</button>
    {enabled&&<button type="button" className="button button--ghost" disabled={busy} onClick={()=>void test()}>Enviar prueba</button>}
    <span className="push-settings__hint">{enabled?'Activadas en este dispositivo.':'No se enviarán avisos hasta que las actives.'}</span>
   </div>}
  {error&&<p className="push-settings__error" role="alert">{error}</p>}
  {message&&<p className="push-settings__success" role="status">{message}</p>}
 </section>;
}

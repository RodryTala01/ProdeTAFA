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
const iosWeb=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches
 ||Boolean((navigator as Navigator & {standalone?:boolean}).standalone);

export default function PushNotifications({userId}:{userId:string}){
 const storageKey='tafa:push-prompt-dismissed:'+userId;
 const [dismissed,setDismissed]=useState(()=>{
  try{return sessionStorage.getItem(storageKey)==='1';}catch{return false;}
 });
 const [config,setConfig]=useState<Config|null>(null);
 const [checked,setChecked]=useState(false);
 const [enabled,setEnabled]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [current,setCurrent]=useState<PushSubscription|null>(null);
 useEffect(()=>{
  let alive=true;
  (async()=>{
   try{
    const cfg=await api<Config>('config');
    if(!alive)return;
    setConfig(cfg);
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
   finally{if(alive)setChecked(true);}
  })();
  return ()=>{alive=false;};
 },[userId]);
 const compatible=supported()&&(!iosWeb()||standalone());
 const blocked=supported()&&Notification.permission==='denied';
 function dismiss(){
  setDismissed(true);
  try{sessionStorage.setItem(storageKey,'1');}catch{/* Still dismiss in this session. */}
 }
 async function activate(){
  if(!config?.publicKey||!compatible||blocked)return;
  setBusy(true);setError('');setMessage('');
  try{
   // Browser permission requires an explicit user click; never request automatically on page load.
   const permission=await Notification.requestPermission();
   if(permission!=='granted')throw Error('No se autorizó el permiso. Podés cambiarlo desde la configuración del navegador.');
   const reg=await navigator.serviceWorker.register('/sw.js');
   const existing=await reg.pushManager.getSubscription();
   const subscription=existing??await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(config.publicKey) as BufferSource});
   await api('subscribe',{method:'POST',body:JSON.stringify(subscription.toJSON())});
   setCurrent(subscription);setEnabled(true);setMessage('¡Notificaciones activadas en este dispositivo!');
  }catch(e){setError(e instanceof Error?e.message:'No se pudieron activar las notificaciones');}
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
 if(!checked)return null;
 const inviting=Boolean(config?.ready&&!enabled&&!dismissed);
 const hint=!config?'No pudimos consultar las notificaciones.'
  :!config.ready?'Las notificaciones todavía no están configuradas en TAFA.'
  :!supported()?'Este navegador no admite notificaciones push.'
  :iosWeb()&&!standalone()?'En iPhone: desde Safari, tocá Compartir → Agregar a inicio. Abrí TAFA desde ese ícono para activar las notificaciones.'
  :blocked?'Las notificaciones están bloqueadas. Habilitalas desde los permisos de este sitio en el navegador.'
  :null;
 return <section className={'push-settings'+(inviting?' push-settings--invite':' push-settings--compact')} aria-label="Notificaciones de TAFA">
  <div className="push-settings__top">
   <div>
    <h2>{inviting?'🔔 Activá las notificaciones':'Notificaciones'}</h2>
    {inviting?<p>Enterate cuando haya una nueva fecha, cuando te falte enviar tus pronósticos o cuando estén los resultados. Te avisamos aunque TAFA esté cerrada.</p>
      :<p>{enabled?'Activadas en este dispositivo.':'Avisos al celular o computadora, incluso con la web cerrada.'}</p>}
   </div>
   {inviting&&<span aria-hidden="true">🔔</span>}
  </div>
  {hint&&<p className="push-settings__hint">{hint}</p>}
  {config?.ready&&compatible&&<div className="push-settings__actions">
   {enabled?<button type="button" className="button button--ghost" disabled={busy} onClick={()=>void test()}>Enviar prueba</button>
    :!blocked&&<button type="button" className="button button--primary" disabled={busy} onClick={()=>void activate()}>{busy?'Activando…':'Activar notificaciones'}</button>}
   {inviting&&<button type="button" className="button button--ghost" onClick={dismiss}>Ahora no</button>}
  </div>}
  {inviting&&!(config?.ready&&compatible)&&<button type="button" className="button button--ghost" onClick={dismiss}>Entendido</button>}
  {error&&<p className="push-settings__error" role="alert">{error}</p>}
  {message&&<p className="push-settings__success" role="status">{message}</p>}
 </section>;
}

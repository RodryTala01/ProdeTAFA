const CACHE_NAME = 'prode-tafa-static-v2';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
 self.skipWaiting();
});
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
 self.clients.claim();
});
self.addEventListener('fetch', event => {
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 event.respondWith(fetch(request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
  return response;
 }).catch(async()=>{
  const cached=await caches.match(request);
  if(cached)return cached;
  if(request.mode==='navigate')return caches.match('/');
  throw Error('offline');
 }));
});
self.addEventListener('push',event=>{
 let info={title:'Prode TAFA',body:'Tenés una novedad en el Prode.',url:'/#/inicio',tag:'tafa-notice'};
 try{if(event.data)info={...info,...event.data.json()};}catch{}
 event.waitUntil(self.registration.showNotification(info.title,{
  body:info.body,icon:'/icon.svg',badge:'/icon.svg',tag:info.tag,
  data:{url:info.url},renotify:false
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const path=event.notification.data?.url||'/#/inicio';
 const dest=new URL(path,self.location.origin);
 if(dest.origin!==self.location.origin)return;
 event.waitUntil((async()=>{
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clients){
   if(new URL(client.url).origin===dest.origin){
    await client.navigate(dest.href);
    return client.focus();
   }
  }
  return self.clients.openWindow(dest.href);
 })());
});

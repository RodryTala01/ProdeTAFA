import {resolvePromiedosClock} from './promiedos-clock';
// Network acquisition runs only in GitHub Actions, never in the Worker.
import {PromiedosError, parsePromiedosGame, parsePromiedosDay, promiedosFixture} from '../worker/promiedos';
export {safeDailyLiveGame} from '../worker/promiedos';
const API = 'https://api.promiedos.com.ar';
const WEB = 'https://www.promiedos.com.ar';
let version = '1.11.7.5';
let discovery: Promise<string> | undefined;
let lastDiscovery = 0;
export type RequestCounter = { count: number };
class TransportError extends PromiedosError {}
async function read(url: string, counter: RequestCounter, headers?: HeadersInit) {
  counter.count++;
  let r: Response;
  try { r = await fetch(url, { headers, signal: AbortSignal.timeout(15000), redirect: 'manual' }); }
  catch { throw new TransportError('Promiedos no respondió a tiempo o no está disponible. Reintentá más tarde.'); }
  if (!r.ok) throw new TransportError(`Promiedos no disponible (HTTP ${r.status}). Reintentá más tarde.`);
  return r.text();
}
async function discover(counter: RequestCounter) {
  if (discovery) return discovery;
  if (Date.now() - lastDiscovery < 60_000) return version;
  lastDiscovery = Date.now();
  discovery = (async () => {
    const html = await read(WEB, counter);
    const path = html.match(/src="(\/_next\/static\/chunks\/pages\/_app-[a-zA-Z0-9]+\.js)"/)?.[1];
    if (!path) throw new PromiedosError('No se pudo verificar la versión de Promiedos.');
    const script = await read(WEB + path, counter);
    const found = script.match(/"X-VER"\s*:\s*"(\d+(?:\.\d+){2,4})"/)?.[1];
    if (!found) throw new PromiedosError('No se pudo verificar la versión de Promiedos.');
    version = found;
    return found;
  })();
  try { return await discovery; } finally { discovery = undefined; }
}
async function request<T>(path: string, parse: (value: unknown) => T, counter: RequestCounter): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return parse(JSON.parse(await read(API + path, counter, { 'X-VER': version }))); }
    catch (e) {
      if (e instanceof TransportError) throw e;
      if (!attempt) { await discover(counter); continue; }
      throw e instanceof PromiedosError ? e : new PromiedosError('Promiedos no entregó información válida. Requiere revisión.');
    }
  }
  throw new PromiedosError('Promiedos no disponible.');
}

// Canonical day-cache keys are always Argentina dates, independently of runner location.
const rawDays=new Map<string,Promise<import('../worker/promiedos').PromiedosGame[]>>();
export async function getPromiedosDay(date:string,counter:RequestCounter={count:0},sourceTimeZone?:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date)))throw new PromiedosError('Fecha inválida');
 const zone=sourceTimeZone??await resolvePromiedosClock();
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
 const start=Date.parse(date+'T00:00:00-03:00'),end=start+86400000-1;
 const days=[...new Set([formatter.format(start),formatter.format(end)])];
 const groups=await Promise.all(days.map(day=>{
  const key=zone+':'+day;
  if(!rawDays.has(key)){
   const pending=request('/games/'+day.split('-').reverse().join('-'),raw=>{
    const value=raw as {leagues?:Array<{games?:unknown[]}>};
    const annotated={...value,leagues:value.leagues?.map(l=>({...l,games:l.games?.map(g=>({...g as object,sourceTimeZone:zone,clockVersion:2}))}))};
    return parsePromiedosDay(annotated);
   },counter);
   rawDays.set(key,pending);
  }
  return rawDays.get(key)!;
 }));
 const argDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'});
 return [...new Map(groups.flat().filter(g=>argDate.format(new Date(promiedosFixture(g).kickoffAt))===date).map(g=>[g.id,g])).values()];
}
export async function searchPromiedosFixtures(date:string,counter:RequestCounter={count:0},sourceTimeZone?:string){return (await getPromiedosDay(date,counter,sourceTimeZone)).map(g=>promiedosFixture(g));}
export async function getPromiedosGame(id:string,counter:RequestCounter={count:0},sourceTimeZone?:string){
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new PromiedosError('ID inválido');
 const zone=sourceTimeZone??await resolvePromiedosClock();
 return request('/gamecenter/'+id,raw=>parsePromiedosGame({...((raw as any)?.game),sourceTimeZone:zone,clockVersion:2},id),counter);
}

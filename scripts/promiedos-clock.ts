import {PromiedosError} from '../worker/promiedos';
let resolved:Promise<string>|undefined;
export function resolvePromiedosClock(fetcher:typeof fetch=fetch):Promise<string>{
 if(!resolved)resolved=(async()=>{
  for(const endpoint of ['https://ipwho.is/?fields=success,timezone.id','https://ipapi.co/timezone/']){
   try{
    const response=await fetcher(endpoint,{signal:AbortSignal.timeout(10000),redirect:'error'});
    if(!response.ok)continue;
    const text=await response.text();
    const zone=endpoint.includes('ipwho.is')?JSON.parse(text)?.timezone?.id:text.trim();
    if(typeof zone!=='string'||zone.length>80||!/^([A-Za-z_]+\/){1,2}[A-Za-z_+-]+$/.test(zone))continue;
    new Intl.DateTimeFormat('en',{timeZone:zone}).format(new Date());
    console.log('Promiedos acquisition timezone:',zone);
    return zone;
   }catch{/* Never print service bodies, IPs, or uncertain zones. Try the authorized fallback. */}
  }
  throw new PromiedosError('No se pudo verificar la zona horaria del runner. Se conservan los horarios y la caché existentes.');
 })();
 return resolved;
}

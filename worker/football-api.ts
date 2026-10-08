import { safeAdminError } from '../src/safe-admin-error';
export class FootballError extends Error {}
export async function footballFixtures<T>(params:Record<string,string>, key:string):Promise<T[]> {
  const endpoint=new URL('https://v3.football.api-sports.io/fixtures');
  for(const [name,value] of Object.entries(params))endpoint.searchParams.set(name,value);
  const fail=(status:number|null,details:unknown):never=>{
    const raw=typeof details==='string'?details:'Respuesta inválida del proveedor';
    const safe=safeAdminError(raw.split(key).join('[redactado]'));
    const message=`API-Football (HTTP ${status??'sin respuesta'}, ${endpoint.pathname}${endpoint.search}): ${safe}`;
    console.error('API-Football request failed',{status,endpoint:endpoint.pathname+endpoint.search,error:safe});
    throw new FootballError(message);
  };
  let response:Response;
  try {response=await fetch(endpoint,{headers:{'x-apisports-key':key,accept:'application/json'}});}catch {return fail(null,'No se pudo conectar con el proveedor');}
  const data=await response.json().catch(()=>null) as {errors?:unknown;response?:T[]}|null;
  const errors=data?.errors;
  const detail=typeof errors==='string'?errors:errors&&typeof errors==='object'?Object.entries(errors).filter(([,v])=>v).map(([k,v])=>`${k}: ${String(v)}`).join(' · '):'';
  if(!response.ok||detail||!Array.isArray(data?.response))return fail(response.status,detail||'Respuesta inválida del proveedor');
  return data.response;
}

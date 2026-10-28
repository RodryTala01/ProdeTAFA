// Only failures in our own cache upload/apply pipeline fail GitHub Actions.
// Unavailable provider responses remain visible warnings so a single unreachable
// external game cannot generate a failed workflow email every five minutes.
export async function collectProviderCache(plan, {getDay,getGame,upload,apply,fallbackGame,now=()=>new Date().toISOString()},counter) {
  const report={uploaded:0,providerFailures:[],internalFailures:[],gameKeys:[],fallbacks:[]};
  for(const [kind,keys] of [['day',plan.days],['game',plan.games]]) for(const key of keys){
    let payload;
    try {
      payload=kind==='day'?await getDay(key,counter):await getGame(key,counter);
    }catch(error){
      if(kind==='game' && typeof fallbackGame==='function'){
        try{
          const backup=await fallbackGame(key,error);
          if(backup) { payload=backup; report.fallbacks.push(key); }
        }catch{/* An incomplete or ambiguous daily record is not an alternative final score. */}
      }
      if(!payload){
        report.providerFailures.push({kind,key,error:safeError(error)});
        continue;
      }
    }
    try{
      await upload({kind,key,fetchedAt:now(),payload});
      report.uploaded++;
      if(kind==='game')report.gameKeys.push(key);
    }catch(error){
      report.internalFailures.push({operation:'cache-upload',kind,key,error:safeError(error)});
    }
  }
  if(report.gameKeys.length){
    try{
      report.applied=await apply(report.gameKeys);
    }catch(error){
      report.internalFailures.push({operation:'cache-apply',error:safeError(error)});
    }
  }
  return report;
}
export function safeError(error){
  return String(error instanceof Error?error.message:error).replace(/[\r\n%]/g,' ').slice(0,280);
}
export function acquisitionExitCode(report) {
  return report.internalFailures.length?1:0;
}

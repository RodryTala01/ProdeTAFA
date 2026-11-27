import {useEffect,useRef} from 'react';
import {utcDate} from './match-time';
export const LIVE_MATCH_STATUSES = new Set(['1H','HT','2H','ET','BT','P','LIVE']);
export type RefreshMatch={status?:string;kickoffAt:string};
export function roundRefreshDelay(matches:RefreshMatch[],now=Date.now()):number|null {
 if(matches.some(m=>LIVE_MATCH_STATUSES.has(m.status??'')))return 60_000;
 // Discovery stays bounded to relevant kickoffs, at the backend's cadence.
 if(matches.some(m=>m.status==='NS' && (+utcDate(m.kickoffAt))<=now && (+utcDate(m.kickoffAt))>=now-4*3_600_000))return 300_000;
 const next=matches.filter(m=>m.status==='NS').map(m=>(+utcDate(m.kickoffAt))).filter(t=>t>now).sort((a,b)=>a-b)[0];
 // Check upcoming schedules at the same cadence as kickoff discovery.
 return next===undefined?null:Math.min(next-now,300_000);
}
export function useRoundRefresh(matches:RefreshMatch[]|undefined,refresh:()=>void,enabled=true){
 const callback=useRef(refresh);callback.current=refresh;
 useEffect(()=>{
  if(!enabled)return;
  const delay=roundRefreshDelay(matches??[]);
  const repeat=(matches??[]).some(m=>LIVE_MATCH_STATUSES.has(m.status??'') || (m.status==='NS' && (+utcDate(m.kickoffAt))<=Date.now() && (+utcDate(m.kickoffAt))>=Date.now()-4*3_600_000));
  const timer=delay===null?undefined:repeat?window.setInterval(()=>{if(roundRefreshDelay(matches??[])===null){window.clearInterval(timer);return;}callback.current();},delay):window.setTimeout(()=>callback.current(),delay);
  let lastFocus=Date.now();
  const focus=()=>{if(Date.now()-lastFocus<60_000)return;lastFocus=Date.now();callback.current();};
  window.addEventListener('focus',focus);
  return()=>{if(timer!==undefined){window.clearTimeout(timer);window.clearInterval(timer);}window.removeEventListener('focus',focus);};
 },[matches,enabled]);
}

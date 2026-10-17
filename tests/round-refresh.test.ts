// @vitest-environment happy-dom
import {createElement,act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {roundRefreshDelay,useRoundRefresh} from '../src/round-refresh';
it('polls LIVE every minute and stops for finals; scheduled fixtures get one kickoff wake-up',async()=>{
 vi.useFakeTimers();Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const host=document.createElement('div'),root=createRoot(host),refresh=vi.fn();
 function View({status}:{status:string}){useRoundRefresh([{status,kickoffAt:'2020-01-01T00:00:00Z'}],refresh);return null;}
 try{
  await act(async()=>root.render(createElement(View,{status:'LIVE'})));
  await act(async()=>{await vi.advanceTimersByTimeAsync(60_000);});expect(refresh).toHaveBeenCalledTimes(1);
  await act(async()=>root.render(createElement(View,{status:'FT'})));
  await act(async()=>{await vi.advanceTimersByTimeAsync(180_000);});expect(refresh).toHaveBeenCalledTimes(1);
  expect(roundRefreshDelay([{status:'NS',kickoffAt:'2099-01-01T00:00:00Z'}])).toBeGreaterThan(60_000);
  expect(roundRefreshDelay([{status:'NS',kickoffAt:'2020-01-01T00:00:00Z'}])).toBeNull();
  expect(roundRefreshDelay([{status:'NS',kickoffAt:new Date(Date.now()-60_000).toISOString()}])).toBe(300_000);
 }finally{await act(async()=>root.unmount());vi.useRealTimers();}
});

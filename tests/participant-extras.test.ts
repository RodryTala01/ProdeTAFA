import {expect,it} from 'vitest';
import {historyStats,type HistoryRound} from '../src/participant-profile';
const round=(id:number,points:number)=>({id,points,name:`Fecha ${id}`} as HistoryRound);
it('personal stats distinguish no history from zero points and retain every tied best round',()=>{
 expect(historyStats([])).toEqual({average:null,best:[]});
 expect(historyStats([round(1,0)])).toEqual({average:0,best:[round(1,0)]});
 expect(historyStats([round(1,4),round(2,1),round(3,4)])).toEqual({average:3,best:[round(1,4),round(3,4)]});
});
import {participantRoute} from '../src/participant-navigation';
it('opens all-time inside Mi Club without adding a main destination',()=>{
 expect(participantRoute('#/club/historicos')).toBe('club/historicos');
});

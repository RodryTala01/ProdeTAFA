import {afterEach,describe,expect,it,vi} from 'vitest';
import {groupDraw,storedKnockoutDraw} from '../src/draw-export-model';
import type {CupCompetition} from '../src/cup-ab-api';
const c={id:1,code:'COPA_TOTAL',displayName:'Copa Total',stages:[],roundLinks:[]} as unknown as CupCompetition;
const people=Array.from({length:32},(_,i)=>({userId:String(i),fullName:`Participante con nombre completo muy largo ${i}`}));
afterEach(()=>vi.unstubAllGlobals());
describe('draw PNG models are faithful and read-only',()=>{
 it('includes all groups and long names, preserves preview order and criteria without mutating it',()=>{
  const groups=Array.from({length:8},(_,i)=>({name:'Grupo '+(i+1),userIds:people.slice(i*4,i*4+4).map(p=>p.userId)}));
  const before=JSON.stringify(groups);
  const model=groupDraw(c,32,groups,people,true,['Clasificación configurada por Admin']);
  expect(model.blocks.flatMap(b=>b.sides.flat()).map(p=>p.name)).toEqual(people.map(p=>p.fullName));
  expect(model.state).toBe('Vista previa');expect(model.criteria).toEqual(['Clasificación configurada por Admin']);
  expect(JSON.stringify(groups)).toBe(before);
  expect(groupDraw(c,32,groups,people,false).state).toBe('Confirmado');
  expect(groupDraw(c,32,groups,people,false).criteria).toEqual([]);
 });
 it('rejects missing names, empty groups and duplicates instead of silently dropping people',()=>{
  expect(()=>groupDraw(c,32,[{name:'A',userIds:['missing']}],people,true)).toThrow();
  expect(()=>groupDraw(c,32,[{name:'A',userIds:['0','0']}],people,true)).toThrow();
  expect(()=>groupDraw(c,32,[{name:'A',userIds:[]}],people,true)).toThrow();
 });
 it('reads saved encounters including byes and actual connections without generating future rounds',async()=>{
  const season={seasonNumber:32,stages:[{id:10,competitionId:1,type:'KNOCKOUT',sequence:1,name:'Semifinal'},{id:11,competitionId:1,type:'KNOCKOUT',sequence:2,name:'Final'}],
   members:[{entryId:1,userId:'0',fullName:'Anterior',validFrom:null,validTo:5},{entryId:1,userId:'1',fullName:'Vigente',validFrom:5,validTo:null},{entryId:2,userId:'2',fullName:'Rival',validFrom:null,validTo:null}],
   encounters:[{id:100,stageId:10,entryAId:1,entryBId:2,roundId:4,slot:'SF1',winnerEntryId:1,confirmedAt:'2026-01-01'},{id:101,stageId:11,entryAId:1,entryBId:null,roundId:6,slot:'F1'}]};
  const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({season})});vi.stubGlobal('fetch',fetch);
  const model=await storedKnockoutDraw(c,32);
  expect(model.blocks).toHaveLength(2);
  expect(model.blocks[0].sides[0][0].name).toBe('Anterior');expect(model.blocks[1].sides[0][0].name).toBe('Vigente');
  expect(model.blocks[1].bye).toBe(true);expect(model.blocks[1].sources).toEqual(['100']);
  expect(fetch).toHaveBeenCalledOnce();expect(fetch.mock.calls[0][0]).toContain('/api/admin/competition-engine/draw-overview?season=32');
  expect(fetch.mock.calls[0][1]?.method??'GET').toBe('GET');
 });
 it('retains all 13 fixed Champions nodes, their sources and slot participants',async()=>{
  const nodes=Array.from({length:13},(_,i)=>({code:'N'+i,label:'Cruce '+i,branch:'upper',sourceA:{entryId:i===0?1:null,displayName:null,source:i?'N'+(i-1):'S1'},sourceB:{entryId:null,displayName:'Cupo confirmado',source:'S2'}}));
  const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({season:{stages:[],members:[{entryId:1,userId:'1',fullName:'Participante',validTo:null}]}})}).mockResolvedValueOnce({ok:true,json:async()=>({bracket:nodes})});vi.stubGlobal('fetch',fetch);
  const model=await storedKnockoutDraw({...c,code:'COPA_CAMPEONES'},32);
  expect(model.blocks).toHaveLength(13);expect(model.blocks[0].sides[0][0].name).toBe('Participante');
  expect(model.blocks[1].sources).toEqual(['N0']);expect(model.blocks[1].sides[0][0].name).toBe('Ganador N0');
  expect(fetch.mock.calls.every(call=>(call[1]?.method??'GET')==='GET')).toBe(true);
 });
});

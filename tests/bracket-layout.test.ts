import {describe,it,expect} from 'vitest';
import {layoutBracket} from '../src/bracket-layout';
import type {DrawBlock} from '../src/draw-image';
const dependencies:Record<string,string[]>={U1:[],U2:['U1'],U3:['U2'],U4:['U3'],U5:['U4'],L1:[],L2:[],L3:['L1','L2'],L4:['L3'],L5:[],L6:['L4','L5'],L7:['L6'],F1:['U5','L7']};
const blocks:DrawBlock[]=Object.entries(dependencies).map(([id,sources])=>({id,title:id,branch:id.startsWith('U')?'UPPER':id.startsWith('L')?'LOWER':'FINAL',sides:[[{name:'Participante con nombre completo muy largo'}],[{name:'Ganador '+sources[0],placeholder:true}]],sources}));
function checkBounds(input:DrawBlock[]){
 const layout=layoutBracket(input,420,270);
 for(const n of layout.nodes){expect(n.x).toBeGreaterThanOrEqual(0);expect(n.y).toBeGreaterThanOrEqual(240);expect(n.x+420).toBeLessThan(layout.width);expect(n.y+270).toBeLessThan(layout.height);}
 for(const a of layout.nodes)for(const b of layout.nodes)if(a!==b)expect(a.x+420<=b.x||b.x+420<=a.x||a.y+270<=b.y||b.y+270<=a.y).toBe(true);
 for(const e of layout.edges)expect(layout.nodes.find(n=>n.block.id===e.from)!.x+420).toBeLessThan(layout.nodes.find(n=>n.block.id===e.to)!.x);
 return layout;
}
describe('horizontal bracket graph',()=>{
 it('preserves all T32 dependencies, upper/lower branches and converging final without overlapping cards',()=>{
  const before=JSON.stringify(blocks),layout=checkBounds(blocks);
  expect(layout.edges).toEqual(blocks.flatMap(b=>b.sources!.map(from=>({from,to:b.id}))));
  expect(layout.finalIds).toEqual(['F1']);expect(layout.width).toBeGreaterThan(layout.height);
  expect(Math.max(...layout.nodes.filter(n=>n.block.branch==='UPPER').map(n=>n.y))).toBeLessThan(Math.min(...layout.nodes.filter(n=>n.block.branch==='LOWER').map(n=>n.y)));
  expect(layout.nodes.find(n=>n.block.id==='L5')!.column).toBe(2);
  expect(JSON.stringify(blocks)).toBe(before);
 });
 it('lays out a conventional complete knockout using only its actual edges',()=>{
  const traditional:DrawBlock[]=Array.from({length:7},(_,i)=>({id:String(i),title:i===6?'Final':'Cruce '+i,sides:[[{name:'A'}],[{name:'B'}]],sources:i<4?[]:i===4?['0','1']:i===5?['2','3']:['4','5'],branch:i===6?'FINAL':undefined}));
  const layout=checkBounds(traditional);expect(layout.nodes).toHaveLength(7);expect(layout.edges).toHaveLength(6);expect(layout.finalIds).toEqual(['6']);
 });
 it('keeps a partial drawn round independent, including byes and unresolved sides',()=>{
  const partial:DrawBlock[]=[{id:'1',title:'Cuartos 1',sides:[[{name:'A'}],[]],bye:true},{id:'2',title:'Cuartos 2',sides:[[{name:'Ganador externo',placeholder:true}],[{name:'B'}]],sources:['not-in-this-round']}];
  const layout=checkBounds(partial);expect(layout.nodes).toHaveLength(2);expect(layout.edges).toEqual([]);expect(layout.finalIds).toEqual([]);
 });
 it('rejects cyclic or duplicate node identities rather than drawing an invented path',()=>{
  expect(()=>layoutBracket([...blocks,blocks[0]],420,270)).toThrow();
  expect(()=>layoutBracket([{...blocks[0],sources:['U2']},blocks[1]],420,270)).toThrow(/ciclo/);
 });
});

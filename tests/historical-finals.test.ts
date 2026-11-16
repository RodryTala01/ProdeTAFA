// @vitest-environment happy-dom
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {isFinalStage,archivedCompetitionFinals,officialCompetitionFinals,combineCompetitionFinals} from '../src/historical-finals';
import {HonourCards,FinalsCalendar} from '../src/ParticipantHistoricalTotals';
import type {PalmarTotal} from '../src/historical-totals-types';
import type {ArchivePayload} from '../src/historical-schema';

const historical=(season:number,matches:ArchivePayload['matches']):ArchivePayload=>({
 version:1,season:{number:season,name:'Temporada '+season,kind:'MIXTA',notes:''},
 participants:[
  {key:'r',name:'Rodrigo Talarico',userId:'user-r',division:'A'},
  {key:'n',name:'Nico Avalos',userId:'user-n',division:'A'},
  {key:'k',name:'Kevin Sívori',userId:'user-k',division:'A'}],
 competitions:[{code:'COPA_A',name:'Copa A',kind:'CUP'}],
 statistics:[],standings:[],rounds:[],results:[],movements:[],iffhs:[],matches
});
const match=(matchId:string,stage:string,pointsA:number,pointsB:number,aKey='r',bKey='n')=>({
 matchId,competitionCode:'COPA_A',stage,round:null,aKey,bKey,pointsA,pointsB,
 plenosA:null,plenosB:null,scoreBasis:'INDIVIDUAL' as const
});
it('reconoce únicamente finales y no cuartos, semifinales ni octavos de final',()=>{
 expect(isFinalStage('Final')).toBe(true);
 expect(isFinalStage('Final · partido registrado en LIGA')).toBe(true);
 expect(isFinalStage('GRAN_FINAL Final')).toBe(true);
 for(const stage of ['Semifinales','Cuartos de final','Octavos de final','Dieciseisavos de final','Fase final','R16 Fase Final','Tercer puesto'])
  expect(isFinalStage(stage)).toBe(false);
});
it('para T4 toma la final principal de Liga, no duplica el partido de la hoja de Copa',()=>{
 const data=historical(4,[
  match('q','Cuartos de final',9,8),
  match('f1','Final · partido registrado en COPA A',3,4),
  match('f2','Final · partido registrado en LIGA',9,10),
  match('sf','Semifinales',11,13)]);
 const finals=archivedCompetitionFinals(data,k=>data.participants.find(p=>p.key===k)!.userId!);
 expect(finals).toHaveLength(1);
 expect(finals[0]).toMatchObject({seasonNumber:4,competitionCode:'COPA_A',pointsA:9,pointsB:10,encounters:2});
});
it('combina temporadas recientes con antiguas y la vista calendario conserva el orden',()=>{
 const data4=historical(4,[match('4','Final',9,10)]);
 const data2=historical(2,[match('2','Final',3,5)]);
 const a=archivedCompetitionFinals(data4,k=>data4.participants.find(p=>p.key===k)!.userId!);
 const b=archivedCompetitionFinals(data2,k=>data2.participants.find(p=>p.key===k)!.userId!);
 const official=officialCompetitionFinals([
  {encounterId:100,seasonNumber:5,competitionCode:'COPA_A',stageCode:'FINAL',stageName:'Final',
   aName:'Rodrigo Talarico',bName:'Nico Avalos',aUserId:'user-r',bUserId:'user-n',scoreA:11,scoreB:14},
  {encounterId:101,seasonNumber:5,competitionCode:'COPA_A',stageCode:'SF',stageName:'Semifinales',
   aName:'Rodrigo Talarico',bName:'Kevin Sívori',aUserId:'user-r',bUserId:'user-k',scoreA:7,scoreB:8}
 ]);
 expect(official).toHaveLength(1);
 const grouped=combineCompetitionFinals([...a,...b],official);
 expect(grouped.COPA_A.map(f=>f.seasonNumber)).toEqual([5,4,2]);
 const html=renderToStaticMarkup(createElement(FinalsCalendar,{finals:grouped.COPA_A}));
 const host=document.createElement('div');host.innerHTML=html;
 const captions=[...host.querySelectorAll('.totals-final-caption strong')].map(x=>x.textContent);
 expect(captions).toEqual(['T5','T4','T2']);
 expect(host.querySelectorAll('.totals-final-card')).toHaveLength(3);
 expect(host.querySelectorAll('.totals-final-contender .asset-image').length).toBe(6);
 expect(html).toContain('Rodrigo Talarico');
 expect(html).toContain('href="#/historia/4/COPA_A"');
});
it('ediciones importadas y oficiales de la misma temporada no duplican la final',()=>{
 const d=historical(4,[match('x','Final',9,10)]);
 const archived=archivedCompetitionFinals(d,k=>d.participants.find(p=>p.key===k)!.userId!);
 const official=officialCompetitionFinals([{encounterId:1,seasonNumber:4,competitionCode:'COPA_A',stageCode:'FINAL',stageName:'Final',
  aName:'Rodrigo Talarico',bName:'Nico Avalos',aUserId:'user-r',bUserId:'user-n',scoreA:8,scoreB:12}]);
 const grouped=combineCompetitionFinals(archived,official);
 expect(grouped.COPA_A).toHaveLength(1);
 expect(grouped.COPA_A[0].pointsA).toBe(9);
});
it('Más participaciones muestra exactamente dos filas y ofrece Ver más para los empatados restantes',()=>{
 const people:PalmarTotal[]=Array.from({length:6},(_,i)=>({
  userId:'user-'+i,fullName:'Participante '+i,position:i+1,championships:i===0?3:0,
  runnerUps:0,participations:i===5?1:8
 }));
 const html=renderToStaticMarkup(createElement(HonourCards,{rows:people,overall:true}));
 const host=document.createElement('div');host.innerHTML=html;
 const card=host.querySelector('.totals-card--participations')!;
 expect(card.querySelectorAll(':scope > dd > ul > li')).toHaveLength(2);
 expect(card.querySelector('details summary')?.textContent).toContain('Ver más');
 expect(card.querySelectorAll('details ul li')).toHaveLength(3);
 expect(card.querySelector('details')?.hasAttribute('open')).toBe(false);
 expect(host.querySelector('.totals-card.totals-gold')).not.toBeNull();
});
it('no inventa finales cuando una competencia aún no tiene cruces documentados',()=>{
 const html=renderToStaticMarkup(createElement(FinalsCalendar,{finals:[]}));
 expect(html).toContain('Todavía no hay enfrentamientos de final registrados');
 expect(html).not.toContain('totals-final-card');
});

it('muestra el tanteo del desempate registrado en el orden de los finalistas',()=>{
 const data=historical(4,[match('f','Final',9,9),match('t','Desempate de final',8,3,'n','r')]);
 const finals=archivedCompetitionFinals(data,key=>key);
 expect(finals).toHaveLength(1);
 expect(finals[0]).toMatchObject({pointsA:9,pointsB:9,tieA:3,tieB:8});
 const host=document.createElement('div');
 host.innerHTML=renderToStaticMarkup(createElement(FinalsCalendar,{finals}));
 expect(host.querySelector('.totals-final-score')?.textContent).toBe('9(3)–(8)9');
});

it('reconstruye una final de dúos de cuatro cruces y señala al campeón',()=>{
 const duo=(m:ReturnType<typeof match>)=>({...m,competitionCode:'COPA_DUOS'});
 const data=historical(6,[
  duo(match('rn','Final',14,6,'r','n')),duo(match('rk','Final',14,6,'r','k')),
  duo(match('ns','Final',6,14,'n','s')),duo(match('sk','Final',14,6,'s','k'))
 ]);
 data.participants.push({key:'s',name:'Rodrigo Soca',userId:'user-s',division:'A'});
 const finals=archivedCompetitionFinals(data,key=>key);
 expect(finals).toHaveLength(1);
 expect(finals[0]).toMatchObject({pointsA:14,pointsB:6,winner:'a',a:{name:'Rodrigo Soca y Rodrigo Talarico'}});
 const host=document.createElement('div');
 host.innerHTML=renderToStaticMarkup(createElement(FinalsCalendar,{finals}));
 expect(host.querySelectorAll('.totals-final-contender .asset-image')).toHaveLength(4);
 expect(host.querySelector('[data-winner=true]')?.textContent).toContain('Campeón');
});

// @vitest-environment happy-dom
import {createElement,act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {MiEquipoProfile,TeamHistory,groupOfficialRivals,type TeamPageData,type TeamMatch} from '../src/MiEquipo';
import {participantRoute,participantSections} from '../src/participant-navigation';
import {rankedPositions,iffhsPositions} from '../worker/team-page';

const fake:TeamMatch={id:1,seasonNumber:32,competitionCode:'COPA_TOTAL',competitionName:'Copa Total',stageName:'Semifinal',roundName:'Fecha 4',opponentId:'B',opponentName:'Los Primos',ownPoints:18,rivalPoints:14,plenos:3};
const team:TeamPageData={identity:{id:'A',participantName:'Ana',teamName:'Equipo de Ana',shieldUrl:null,foundedSeason:32},division:null,
 stats:{dates:1,points:18,fulls:3,partials:6,errors:3,extras:1,predictions:12},
 titles:[{code:'COPA_TOTAL',name:'Copa Total',seasonNumber:32}],
 rankings:{general:{current:8,best:{position:2,seasonNumber:32}},iffhs:{current:4,best:{position:1,seasonNumber:31},throughSeason:32}},
 encounters:[fake,{...fake,id:2,seasonNumber:31,ownPoints:14,rivalPoints:18,plenos:2}]
};
const html=(component:any,props:any)=>renderToStaticMarkup(createElement(component,props));
describe('Mi Equipo minimalista',()=>{
 it('preserves Mi Club and enables the independent public team route',()=>{
  expect(participantSections.some(x=>x.id==='club')).toBe(true);
  expect(participantSections.some(x=>x.id==='equipo')).toBe(true);
  expect(participantRoute('#/equipo')).toBe('equipo');
  expect(participantRoute('#/equipo/B')).toBe('equipo/B');
 });
 it('renders only confirmed trophy examples, official Prode metrics and both rankings',()=>{
  const page=html(MiEquipoProfile,{data:team});
  for(const value of ['Equipo de Ana','Copa Total','18','Plenos','Parciales','Errores','Extras','Pronósticos enviados','TABLA GENERAL','RANKING IFFHS','Mejor 2.º · T32','Mejor 1.º · T31','HISTORIAL DE ENFRENTAMIENTOS'])expect(page).toContain(value);
  expect(page).not.toMatch(/Partidos ganados|Partidos empatados|Partidos perdidos|Goles a favor/);
  expect(page).not.toMatch(/Cambiar escudo|Editar equipo|Guardar nombre/);
 });
 it('aggregates only verified opponent encounters and opens details immediately below its row',async()=>{
  const rival=groupOfficialRivals(team.encounters)[0];
  expect(rival).toMatchObject({difference:0,points:32,otherPoints:32,fulls:5});
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  const host=document.createElement('div');document.body.append(host);
  const root=createRoot(host);
  try{
   await act(async()=>{root.render(createElement(TeamHistory,{matches:team.encounters}));});
   expect(host.querySelectorAll('.equipo-detail')).toHaveLength(0);
   const btn=host.querySelector('button')!;
   expect(btn.getAttribute('aria-expanded')).toBe('false');
   await act(async()=>{btn.click();});
   const opened=host.querySelector('.equipo-detail')!;
   expect(opened).toBeTruthy();
   expect(opened.previousElementSibling?.textContent).toContain('Los Primos');
   expect(opened.textContent).toContain('Semifinal');
   expect(opened.textContent).toContain('T31');
   expect(btn.getAttribute('aria-expanded')).toBe('true');
   await act(async()=>{btn.click();});
   expect(host.querySelectorAll('.equipo-detail')).toHaveLength(0);
  }finally{await act(async()=>{root.unmount();});host.remove();}
 });
 it('keeps truthful blanks for missing trophies and records',()=>{
  const page=html(MiEquipoProfile,{data:{...team,titles:[],encounters:[],rankings:{general:{current:null,best:null},iffhs:{current:null,best:null,throughSeason:null}}}});
  expect(page).toContain('todavía no tiene títulos confirmados');
  expect(page).toContain('Todavía no hay enfrentamientos oficiales');
  expect(page).toContain('Mejor posición no disponible');
 });
});
describe('Rankings históricos sin inventar resultados',()=>{
 it('ranks cumulative General at the end of linked seasons',()=>{
  expect(rankedPositions([{userId:'A',seasonNumber:30,points:8},{userId:'B',seasonNumber:30,points:10},{userId:'A',seasonNumber:31,points:8},{userId:'B',seasonNumber:31,points:2}], 'A')).toEqual({position:1,seasonNumber:31});
  expect(rankedPositions([], 'A')).toBeNull();
 });
 it('uses rolling 5-season IFFHS windows, preserving best snapshot',()=>{
  const result=iffhsPositions([{userId:'A',seasonNumber:30,points:100},{userId:'B',seasonNumber:30,points:200},{userId:'A',seasonNumber:31,points:200},{userId:'B',seasonNumber:31,points:0}], 'A');
  expect(result).toEqual({current:1,best:{position:1,seasonNumber:31},throughSeason:31});
 });
});

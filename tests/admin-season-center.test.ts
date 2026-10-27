import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {AdminSeasonCenter,AdminFamilyOverview,AdminSetupReview,setupFamilies,familyReadiness,firstPendingFamily,type SetupSeason} from '../src/AdminSeasonCenter';

const codes=['LIGA_A','LIGA_B','COPA_A','COPA_B','COPA_TOTAL','COPA_DUOS','COPA_CAMPEONES','COPA_PAPA','PROMOCION'];
const season:SetupSeason={
 id:33,seasonNumber:33,name:'Temporada 33',status:'draft',
 divisions:[{id:1,code:'A',name:'Liga A',memberCount:1},{id:2,code:'B',name:'Liga B',memberCount:1}],
 members:[{userId:'1',fullName:'Ana',divisionCode:'A',divisionId:1},{userId:'2',fullName:'Beto',divisionCode:'B',divisionId:2}],
 competitions:codes.map((code,i)=>({id:i+1,code,displayName:code.replaceAll('_',' '),family:code.startsWith('LIGA')?'LEAGUE':'CUP',status:'draft',divisionCode:code.endsWith('_A')?'A':code.endsWith('_B')?'B':null,stages:[],roundLinks:[]}))
};
const noop=()=>{};
describe('Centro de temporada',()=>{
 it('groups the nine backend editions into six visual cards with Promotion inside Liga',()=>{
   const html=renderToStaticMarkup(createElement(AdminSeasonCenter,{season,onSelectFamily:noop,onSelectCompetition:noop,onManageSeason:noop}));
   expect((html.match(/class="asc-card asc-card--/g)||[])).toHaveLength(6);
   expect(html).toContain('Copa A/B');
   expect(html).toContain('Copa Dúos');
   expect(html).toContain('Promoción se administrará en la fase final de Liga');
   expect(html).not.toContain('6 de 6');
 });
 it('does not call a tournament ready merely because stages or dates exist',()=>{
   const filled={...season,competitions:season.competitions.map(c=>({...c,stages:[{id:5,name:'Octavos',stageType:'KNOCKOUT',status:'draft',sequence:1}],roundLinks:[{id:8,stageId:5,roundId:10,roundName:'Fecha 1',roundStatus:'draft'}]}))};
   const league=setupFamilies[0], info=familyReadiness(filled,league);
   expect(info.structurallyPrepared).toBe(true);
   expect(info.label).toMatch(/Revisar sorteo y cupos/);
   const html=renderToStaticMarkup(createElement(AdminSeasonCenter,{season:filled,onSelectFamily:noop,onSelectCompetition:noop,onManageSeason:noop}));
   expect(html).toContain('6 de 6 con etapas y Fechas vinculadas');
   expect(html).toContain('todavía requieren revisar cupos, sorteos y cruces');
 });
 it('shows missing steps and picks the first incomplete family',()=>{
   expect(familyReadiness(season,setupFamilies[0]).label).toBe('Faltan etapas');
   expect(firstPendingFamily(season).key).toBe('liga');
 });
 it('provides sub-editions A, B and Promotion from the same Liga family',()=>{
   const html=renderToStaticMarkup(createElement(AdminFamilyOverview,{season,family:setupFamilies[0],onBack:noop,onSelectCompetition:noop}));
   expect(html).toContain('LIGA A');
   expect(html).toContain('LIGA B');
   expect(html).toContain('PROMOCION');
   expect(html).toContain('Fase final de Liga');
 });
 it('does not falsely confirm a draw in the review',()=>{
   const html=renderToStaticMarkup(createElement(AdminSetupReview,{season,competition:season.competitions[2],onStep:noop}));
   expect(html).toContain('Sorteos y cupos: verificar manualmente');
   expect(html).toContain('No se activa automáticamente ninguna competición');
 });
});

import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect} from 'vitest';
import {CompetitionDirectory,SportingEncounter,KnockoutPreview} from '../src/ParticipantCompetitions';
import {visibleCompetitions} from '../src/CompetitionExperience';
import {LeagueTable} from '../src/LeagueView';
import {participantRoute} from '../src/participant-navigation';
import {entryName,participation} from '../src/participant-competitions';
import {previewOverview,previewLeague} from '../src/design/competition-fixtures';
const render=(component:any,props:any)=>renderToStaticMarkup(createElement(component,props));
it('renders both divisions and both cups for every participant',()=>{const html=render(CompetitionDirectory,{data:previewOverview});expect((html.match(/class="cx-card cx-card--/g)??[])).toHaveLength(8);expect(html).toContain('División A');expect(html).toContain('Copa A');expect(html).toContain('href="#/competiciones/copa-b?season=99"');expect(html).not.toContain('href="#/competiciones/promocion?season=99"');expect(html).toContain('No participás');});
it('shows no-season state without a dead-end league link',()=>{const html=render(CompetitionDirectory,{data:{...previewOverview,season:null}});expect(html).toContain('Todavía no hay una temporada activa');expect(html).not.toContain('Consultar Liga');});
it('marks only confirmed winners',()=>{const s=previewOverview.season!;expect(render(SportingEncounter,{s,e:s.encounters[0],user:'demo-1'})).toContain('Ganador');expect(render(SportingEncounter,{s,e:{...s.encounters[0],confirmedAt:null},user:'demo-1'})).not.toContain('Ganador');});
it('keeps historical duo members correct at substitution boundary',()=>{const s={...previewOverview.season!,members:[{...previewOverview.season!.members[0],fullName:'Anterior',validTo:20},{...previewOverview.season!.members[0],fullName:'Nuevo',validFrom:20,validTo:null}]};expect(entryName(s,1,19)).toBe('Anterior');expect(entryName(s,1,20)).toBe('Nuevo');});
it('league names link to a refresh-safe basic profile',()=>{const html=render(LeagueTable,{rows:previewLeague.standings,user:'demo-1',season:99});expect(html).toContain('#/club/participante/demo-1?season=99');expect(html).not.toContain('aria-expanded');expect(participantRoute('#/club/participante/demo-1?season=99')).toBe('club/participante/demo-1?season=99');});
it('accepts each competition route including historical edition',()=>{for(const slug of ['liga-a','liga-b','copa-a','copa-b','copa-total','duos','campeones','papa','promocion'])expect(participantRoute(`#/competiciones/${slug}?season=31`)).toBe(`competiciones/${slug}?season=31`);});
it('uses explicit elimination status without deriving sporting outcomes',()=>{const s=previewOverview.season!;expect(participation(s,s.competitions[2],'demo-2')).toBe('Eliminado');});
import {leagueZone} from '../worker/league-display-zones';
it('retains league reference zones without reclassifying participants',()=>{expect(leagueZone(1,16,'A')?.label).toBe('Campeón');expect(leagueZone(7,16,'A')?.label).toBe('Copa Campeones');expect(leagueZone(13,16,'A')?.label).toBe('Promoción');expect(leagueZone(16,16,'A')?.label).toBe('Descenso');expect(leagueZone(1,16,'B')?.label).toBe('Ascenso');});
import {GroupTable,CompetitionHistory} from '../src/ParticipantCompetitions';
it('shows empty history without inventing champions',()=>{expect(render(CompetitionHistory,{s:previewOverview.season,c:previewOverview.season!.competitions[2]})).toContain('ediciones anteriores');});
it('shows group statistics supplied by backend',()=>{const html=render(GroupTable,{s:previewOverview.season,user:'demo-1',rows:[{entryId:1,position:2,fullName:'Persona',points:6,gf:5,gd:2,won:2}]});expect(html).toContain('Persona');expect(html).toContain('DG');expect(html).toContain('GF');});
it('selects Liga B and Copa B for a participant in division B',()=>{const s=previewOverview.season!;const updated={...s,people:s.people.map(p=>({...p,divisionId:2,division:'B'})),members:s.members.filter(m=>!(m.userId==='demo-1'&&m.competitionId===3))};const entries=visibleCompetitions(updated,'demo-1');expect(entries.filter(c=>c.family==='LEAGUE').map(c=>c.code)).toEqual(['LIGA_A','LIGA_B']);expect(entries.filter(c=>c.code==='COPA_A'||c.code==='COPA_B').map(c=>c.code)).toEqual(['COPA_A','COPA_B']);});

it('highlights historical duo members from the table snapshot',()=>{const rows=[{entryId:1,position:1,points:5,members:[{userId:'replacement',fullName:'Nuevo'}]}];expect(render(GroupTable,{s:previewOverview.season,user:'demo-1',rows})).not.toContain('sport-mine');expect(render(GroupTable,{s:previewOverview.season,user:'replacement',rows})).toContain('sport-mine');});

it('shows the full existing knockout when a cup reaches an elimination phase',()=>{const s=previewOverview.season!;const html=render(KnockoutPreview,{s,stages:s.stages,encounters:s.encounters,user:'demo-1'});expect(html).toContain('Llave de la competencia');expect(html).toContain('Semifinal');expect(html).toContain('Final');expect(html).toContain('Participante Dos');});

import {papaNextRound,papaSourceEntry} from '../src/participant-competitions';
import {MiniFixtures,PapaProgression,ChampionsProgression} from '../src/CompetitionReadViews';
it('shows planned Total mini-fixtures with stable identities before a Fecha exists',()=>{
 const s=previewOverview.season!;
 const html=render(MiniFixtures,{s,fixtures:[{id:99,segmentId:null,slotKey:'A-M4-1',entryAId:1,entryBId:2,scoreA:0,scoreB:0,complete:false}]});
 expect(html).toContain('F4');expect(html).toContain('Partidos 1 a 4');expect(html).toContain('Fecha 2 de Copas');expect(html).toContain('VS');expect(html).not.toContain('0 – 0');expect(html).toContain('asset-image');
});
it('Papa previews byes in next round without confirming the unresolved opponent',()=>{
 const base=previewOverview.season!,c={...base.competitions[2],code:'COPA_PAPA'};
 const stages=[{...base.stages[0],id:90,competitionId:c.id,type:'KNOCKOUT',sequence:1,name:'Octavos'},{...base.stages[0],id:91,competitionId:c.id,type:'KNOCKOUT',sequence:2,name:'Cuartos'}];
 const encounters=[{...base.encounters[0],id:101,stageId:90,entryAId:1,entryBId:2,confirmedAt:null,winnerEntryId:null,slot:'PAPA-R1-01'}, {...base.encounters[0],id:102,stageId:90,entryAId:3,entryBId:null,confirmedAt:null,winnerEntryId:null,slot:'PAPA-R1-02'}];
 const s={...base,stages,encounters};const pairs=papaNextRound(s,c);
 expect(pairs).toHaveLength(1);expect(pairs[0].stage.id).toBe(91);expect(papaSourceEntry(encounters[0])).toBeNull();expect(papaSourceEntry(encounters[1])).toBe(3);
 const html=render(PapaProgression,{s,c});expect(html).toContain('Cuartos');expect(html).toContain('Ganador de');expect(html).toContain('Esperando');expect(s.encounters).toHaveLength(2);
});
it('Champions follows node dependencies in round columns without rebuilding a 16-entry draw',()=>{
 const source=(entryId:number|null,ref:string)=>({entryId,source:ref,displayName:null});
 const nodes=[{id:1,code:'U1',label:'Primer cruce',sourceA:source(1,'A'),sourceB:source(2,'B'),stageId:null,round:null,encounter:null},{id:2,code:'F1',label:'Final',sourceA:source(null,'U1'),sourceB:source(3,'C'),stageId:null,round:null,encounter:null}];
 const html=render(ChampionsProgression,{s:previewOverview.season,nodes});expect(html).toContain('Ronda 1');expect(html).toContain('Final');expect(html).toContain('Ganador de');expect(html).toContain('sport-champions-tree');expect(html).toContain('Cruce 1');
});

import {CompetitionBody} from '../src/ParticipantCompetitions';
it('participant Duos table is visible before scheduling and alongside configured semifinals',()=>{
 const base=previewOverview.season!,competition={...base.competitions[0],id:900,code:'COPA_DUOS',family:'CUP',displayName:'Copa Dúos'};
 const members=base.members.slice(0,2).map(m=>({...m,competitionId:900,entryId:901,entryType:'DUO',validTo:null}));
 const stage={...base.stages[0],id:902,competitionId:900,type:'KNOCKOUT'};
 const s={...base,competitions:[competition],members,stages:[stage],duoEntries:[{entryId:901,displayName:'Dúo confirmado'}],encounters:[{...base.encounters[0],stageId:902,entryAId:901}]};
 const html=render(CompetitionBody,{s,c:competition,user:members[0].userId});
 expect(html).toContain('Tabla de Dúos');expect(html).toContain('Dúo confirmado');expect(html).toContain('posiciones y puntos disponibles al vincular una Fecha');expect(html).toContain('sport-table');
});

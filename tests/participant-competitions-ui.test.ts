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
it('renders six visual blocks: one Liga and one Copa A/B for the participant',()=>{const html=render(CompetitionDirectory,{data:previewOverview});expect((html.match(/class="cx-card cx-card--/g)??[])).toHaveLength(6);expect(html).toContain('División A');expect(html).toContain('Copa A');expect(html).not.toContain('href="#/competiciones/copa-b?season=99"');expect(html).not.toContain('href="#/competiciones/promocion?season=99"');expect(html).toContain('No participás');});
it('shows no-season state without a dead-end league link',()=>{const html=render(CompetitionDirectory,{data:{...previewOverview,season:null}});expect(html).toContain('Todavía no hay una temporada activa');expect(html).not.toContain('Consultar Liga');});
it('marks only confirmed winners',()=>{const s=previewOverview.season!;expect(render(SportingEncounter,{s,e:s.encounters[0],user:'demo-1'})).toContain('Ganador');expect(render(SportingEncounter,{s,e:{...s.encounters[0],confirmedAt:null},user:'demo-1'})).not.toContain('Ganador');});
it('keeps historical duo members correct at substitution boundary',()=>{const s={...previewOverview.season!,members:[{...previewOverview.season!.members[0],fullName:'Anterior',validTo:20},{...previewOverview.season!.members[0],fullName:'Nuevo',validFrom:20,validTo:null}]};expect(entryName(s,1,19)).toBe('Anterior');expect(entryName(s,1,20)).toBe('Nuevo');});
it('league names link to a refresh-safe basic profile',()=>{const html=render(LeagueTable,{rows:previewLeague.standings,user:'demo-1',season:99});expect(html).toContain('#/club/participante/demo-1?season=99');expect(html).not.toContain('aria-expanded');expect(participantRoute('#/club/participante/demo-1?season=99')).toBe('club/participante/demo-1?season=99');});
it('accepts each competition route including historical edition',()=>{for(const slug of ['liga-a','liga-b','copa-a','copa-b','copa-total','duos','campeones','papa','promocion'])expect(participantRoute(`#/competiciones/${slug}?season=31`)).toBe(`competiciones/${slug}?season=31`);});
it('uses explicit elimination status without deriving sporting outcomes',()=>{const s=previewOverview.season!;expect(participation(s,s.competitions[2],'demo-2')).toBe('Eliminado');});
import {leagueZone} from '../worker/league-display-zones';
it('retains league reference zones without reclassifying participants',()=>{expect(leagueZone(1,16,'A')?.label).toBe('Campeón');expect(leagueZone(7,16,'A')?.label).toBe('Copa Campeones');expect(leagueZone(13,16,'A')?.label).toBe('Promoción');expect(leagueZone(16,16,'A')?.label).toBe('Descenso');expect(leagueZone(1,16,'B')?.label).toBe('Ascenso');});
import {GroupTable,CompetitionHistory} from '../src/ParticipantCompetitions';
it('shows empty history without inventing champions',()=>{expect(render(CompetitionHistory,{s:previewOverview.season,c:previewOverview.season!.competitions[2]})).toContain('Todavía no hay historial cargado');});
it('shows group statistics supplied by backend',()=>{const html=render(GroupTable,{s:previewOverview.season,user:'demo-1',rows:[{entryId:1,position:2,fullName:'Persona',points:6,gf:5,gd:2,won:2}]});expect(html).toContain('Persona');expect(html).toContain('DG');expect(html).toContain('GF');});
it('selects Liga B and Copa B for a participant in division B',()=>{const s=previewOverview.season!;const updated={...s,people:s.people.map(p=>({...p,divisionId:2,division:'B'}))};const entries=visibleCompetitions(updated,'demo-1');expect(entries.filter(c=>c.family==='LEAGUE').map(c=>c.code)).toEqual(['LIGA_B']);expect(entries.filter(c=>c.code==='COPA_A'||c.code==='COPA_B').map(c=>c.code)).toEqual(['COPA_B']);});

it('highlights historical duo members from the table snapshot',()=>{const rows=[{entryId:1,position:1,points:5,members:[{userId:'replacement',fullName:'Nuevo'}]}];expect(render(GroupTable,{s:previewOverview.season,user:'demo-1',rows})).not.toContain('sport-mine');expect(render(GroupTable,{s:previewOverview.season,user:'replacement',rows})).toContain('sport-mine');});

it('shows the full existing knockout when a cup reaches an elimination phase',()=>{const s=previewOverview.season!;const html=render(KnockoutPreview,{s,stages:s.stages,encounters:s.encounters,user:'demo-1'});expect(html).toContain('Llave de la competencia');expect(html).toContain('Semifinal');expect(html).toContain('Final');expect(html).toContain('Participante Dos');});

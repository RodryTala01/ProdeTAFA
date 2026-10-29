// @vitest-environment happy-dom
import {act,createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRoot} from 'react-dom/client';
import {it,expect,vi,afterEach} from 'vitest';
import ParticipantClubPage,{ClubProfile,HeadToHead} from '../src/ParticipantClub';
import {HistoryList,HistoricalMatchRow,HistoryDetail} from '../src/ParticipantHistory';
import {ParticipantState} from '../src/ParticipantState';
import {clubExample,historyExample} from '../src/design/club-fixtures';
import {participantRoute} from '../src/participant-navigation';
import type {TeamPageData} from '../src/MiEquipo';
import {LeagueTable} from '../src/LeagueView';
const render=(component:any,props:any)=>renderToStaticMarkup(createElement(component,props));
afterEach(()=>vi.unstubAllGlobals());
const teamFixture:TeamPageData={
 identity:{id:'demo-1',participantName:'Participante de ejemplo',teamName:'Mi Club Original',shieldUrl:null,foundedSeason:20},
 division:{name:'Liga A',seasonNumber:33},stats:{dates:8,points:125,fulls:17,partials:70,errors:9,extras:4,predictions:96},
 titles:[{code:'COPA_TOTAL',name:'Copa Total',seasonNumber:31}],
 rankings:{general:{current:7,best:{position:2,seasonNumber:30}},iffhs:{current:4,best:{position:1,seasonNumber:31},throughSeason:33}},
 encounters:[],
};
it('unifica la identidad, rankings e historial de Mi Equipo con el recorrido del Mi Club existente',()=>{
 const html=render(ClubProfile,{data:clubExample,own:true,team:teamFixture});
 expect(html).toContain('Mi Club Original');
 expect(html).toContain('TABLA GENERAL');
 expect(html).toContain('RANKING IFFHS');
 expect(html).toContain('HISTORIAL DE ENFRENTAMIENTOS');
 expect(html).toContain('id="club-detalles"');
 expect(html).toContain('Historial de Fechas');
 expect(html).toContain('Últimas Fechas');
 expect(html).toContain('Envíos y cambios');
 expect(html).not.toContain('href="#/equipo"');
 expect(html).not.toContain('>Palmarés individual</h2>');
 expect(html).not.toContain('>Mi Equipo</a>');
});
it('rutas anteriores de Mi Equipo llegan al mismo Mi Club, también para otros participantes',()=>{
 expect(participantRoute('#/equipo')).toBe('club');
 expect(participantRoute('#/equipo/demo-1')).toBe('club/participante/demo-1');
});
it('Mi Club shows real summary fields and separates history and encounters',()=>{const html=render(ClubProfile,{data:clubExample,own:true});expect(html).toContain('Participante de ejemplo');expect(html).toContain('18');expect(html).toContain('#/club/historial');expect(html).toContain('#/club/enfrentamientos');expect(html).toContain('Fechas');});
it('Mi Club lists a promotion participant only under Liga · Fecha 6',()=>{
  const s=clubExample.overview.season!;
  const promoted=s.competitions.find(c=>c.code==='PROMOCION')??{id:987,code:'PROMOCION',displayName:'Promoción',family:'PROMOTION',status:'active',divisionId:null};
  const member={entryId:987,competitionId:promoted.id,status:'active',entryType:'INDIVIDUAL',userId:'demo-1',fullName:'Participante de ejemplo',validFrom:null,validTo:null};
  const data={...clubExample,overview:{...clubExample.overview,season:{...s,competitions:s.competitions.some(c=>c.code==='PROMOCION')?s.competitions:[...s.competitions,promoted],members:[...s.members,member]}}};
  const html=render(ClubProfile,{data,own:true});
  expect(html).toContain('Liga · Fecha 6 · Promoción');
  expect(html).not.toContain('>Promoción</strong>');
  expect(html).toContain('#/competiciones/liga-a?season=99');
});
it('Mi Club explains no season or finished history without fake zero tables',()=>{const data={...clubExample,overview:{...clubExample.overview,season:null},profile:{...clubExample.profile,rounds:[]},league:null};const html=render(ClubProfile,{data,own:true});expect(html).toContain('Todavía no hay una temporada disponible.');expect(html).toContain('Todavía no jugaste ninguna Fecha finalizada.');expect(html).not.toContain('<dd>0</dd>');});
it('another participant profile has public identity and links to their finalized history',()=>{const data={...clubExample,profile:{...clubExample.profile,participant:{id:'other',fullName:'Otra persona',phone:'private-phone',password:'private-pass'}}};const html=render(ClubProfile,{data,own:false});expect(html).toContain('Otra persona');expect(html).toContain('user=other');expect(html).not.toMatch(/private-phone|private-pass|Envíos y cambios/);});
it('history list handles empty and loaded rounds with a reading link',()=>{expect(render(HistoryList,{rounds:[]})).toContain('Todavía no jugaste');const html=render(HistoryList,{rounds:clubExample.profile.rounds});expect(html).toContain('#/club/historial/8');expect(html).toContain('4 plenos');expect(html).not.toContain('<input');});
it.each([[0,'PLENO'],[4,'PARCIAL'],[10,'ERROR']])('renders backend outcome %s without deriving scores', (i,label)=>{const index=Number(i);const html=render(HistoricalMatchRow,{match:historyExample.matches[index],prediction:historyExample.participants[0].predictions[index],own:true});expect(html).toContain(label);expect(html).toContain('Tu pronóstico');expect(html).toContain('2 – 1');if(index===0)expect(html).toContain('+1 por penales');});
it('does not label an absent score or prediction as an error',()=>{const match=historyExample.matches[0];expect(render(HistoricalMatchRow,{match,own:true})).toContain('SIN PRONÓSTICO');expect(render(HistoricalMatchRow,{match,prediction:{...historyExample.participants[0].predictions[0],score:null},own:true})).toContain('PUNTAJE NO DISPONIBLE');});
it('head-to-head is an honest empty state without internal language',()=>{const html=render(HeadToHead,{});expect(html).toContain('Próximamente vas a poder consultar');expect(html).not.toContain('Falta definir');expect(html).not.toContain('<table');});
it('league links navigate to profiles and historical routes survive refresh',()=>{expect(render(LeagueTable,{rows:clubExample.league!.standings,user:'demo-1',season:99})).toContain('#/club/participante/demo-1?season=99');for(const path of ['club/historial/8?user=other','club/enfrentamientos','club/envios','club/participante/other?season=99'])expect(participantRoute('#/'+path)).toBe(path);});
it('history uses one participant selector and no editable prediction inputs',()=>{const html=render(HistoryDetail,{data:historyExample,participantId:'demo-1',currentUserId:'demo-1',onSelect:()=>{}});expect(html.match(/<select/g)).toHaveLength(1);expect(html).not.toMatch(/<input|Enviar pronóstico/);});
it('human error includes a working retry that recovers the profile',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});let fail=true;
 vi.stubGlobal('fetch',vi.fn(async (url:string)=>{if(fail)throw Error('SQLITE private detail');return Response.json(url.includes('/profiles/')?clubExample.profile:url.includes('/teams/')?teamFixture:url.includes('/overview')?{...clubExample.overview,season:null}:clubExample.league);}));
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try {await act(async()=>{root.render(createElement(ParticipantClubPage,{user:{id:'demo-1',fullName:'Participante'},route:'club'}));});expect(host.textContent).toContain('No pudimos cargar');expect(host.textContent).not.toContain('SQLITE');fail=false;await act(async()=>{Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Reintentar')!.click();});expect(host.textContent).toContain('Participante de ejemplo');expect(host.querySelector('[role="alert"]')).toBeNull();}finally{await act(async()=>root.unmount());host.remove();}
});
it('short loading and empty states remain accessible',()=>{expect(render(ParticipantState,{loading:true})).toContain('role="status"');expect(render(ParticipantState,{empty:'Todavía no hay datos disponibles.'})).toContain('Todavía no hay datos disponibles.');});

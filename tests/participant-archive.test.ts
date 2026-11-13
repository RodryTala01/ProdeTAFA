// @vitest-environment happy-dom
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {SeasonDetail,historicalExtras} from '../src/ParticipantArchive';
import {participantRoute} from '../src/participant-navigation';
import {archiveStandingZone,historicalMatchLayout,visibleArchiveCompetitions} from '../src/archive-history-view';
import {importedSummary} from '../worker/season-history';
import type {HistoryDetail} from '../src/history-types';
const detail:HistoryDetail={summary:{number:1,name:'Brasil 2021',source:'imported',participantCount:1,competitions:[{code:'COPA_AMERICA_2021',name:'Copa América',kind:'TOURNAMENT',champions:[]}]},data:{version:1,season:{number:1,name:'Brasil 2021',kind:'TOURNAMENT',notes:''},participants:[{key:'p',name:'Nombre real',userId:'public-user',division:null}],competitions:[{code:'COPA_AMERICA_2021',name:'Copa América',kind:'TOURNAMENT'}],standings:[{competitionCode:'COPA_AMERICA_2021',participantKey:'p',position:1,points:51,fulls:10,partials:10,errors:null,extras:null}],results:[],rounds:[],matches:[],movements:[],iffhs:[],statistics:[]},officialLinks:[],unavailable:[]};
it('rutas Historia preservan navegación y rechazan rutas inválidas',()=>{for(const path of ['historia','historia/1','historia/1/COPA_AMERICA_2021'])expect(participantRoute('#/'+path)).toBe(path);expect(participantRoute('#/historia/abc')).toBe('inicio');});
it('una tabla ganada no inventa un título y datos ausentes se identifican',()=>{const html=renderToStaticMarkup(createElement(SeasonDetail,{detail,view:'competiciones'}));expect(html).toContain('Copa América');expect(html).not.toContain('Liga A');expect(html).toContain('Sin resultados finales declarados');expect(html).toContain('Sin enfrentamientos oficiales');expect(html).toContain('#/club/participante/public-user');expect(html).toContain('>51<');expect(html).toContain('>11<');});
it('Extras usa datos oficiales sin inventar distribución cuando faltan contadores',()=>{expect(historicalExtras({points:51,fulls:10,partials:10,extras:null})).toBe(11);expect(historicalExtras({points:51,fulls:null,partials:10,extras:null})).toBeNull();expect(historicalExtras({points:51,fulls:10,partials:10,extras:7})).toBe(7);});

const historyLeague:HistoryDetail={
 summary:{number:4,name:'Temporada 4',source:'imported',participantCount:4,competitions:[
  {code:'LIGA_A',name:'Liga A',kind:'LEAGUE',champions:['Ana']},
  {code:'COPA_A',name:'Copa A',kind:'CUP',champions:['Ana']},
 ]},
 data:{version:1,season:{number:4,name:'Temporada 4',kind:'MIXTA',notes:''},
  participants:['ana','beto','ceci','dani'].map(name=>({key:name,name,userId:null,division:null})),
  competitions:[{code:'LIGA_A',name:'Liga A',kind:'LEAGUE'},{code:'COPA_A',name:'Copa A',kind:'CUP'},{code:'PROMOCION',name:'Promoción',kind:'PROMOTION'}],
  statistics:[],
  standings:[
   {competitionCode:'LIGA_A',participantKey:'ana',position:1,points:40,fulls:10,partials:10,errors:0,extras:0},
   {competitionCode:'LIGA_A',participantKey:'beto',position:2,points:30,fulls:8,partials:6,errors:0,extras:0},
   {competitionCode:'LIGA_A',participantKey:'ceci',position:3,points:20,fulls:5,partials:5,errors:0,extras:0},
   {competitionCode:'LIGA_A',participantKey:'dani',position:4,points:10,fulls:2,partials:4,errors:0,extras:0},
  ],
  rounds:[],
  results:[{competitionCode:'LIGA_A',participantKey:'ana',position:1,resultCode:'CHAMPION',teamLabel:null}],
  matches:[
   {matchId:'r16',competitionCode:'COPA_A',stage:'Octavos de final',round:null,aKey:'ana',bKey:'beto',pointsA:3,pointsB:4,plenosA:null,plenosB:null,scoreBasis:'INDIVIDUAL'},
   {matchId:'sem',competitionCode:'COPA_A',stage:'Semifinales',round:null,aKey:'ana',bKey:'ceci',pointsA:5,pointsB:3,plenosA:null,plenosB:null,scoreBasis:'INDIVIDUAL'},
   {matchId:'fin-1',competitionCode:'COPA_A',stage:'Final · partido registrado en LIGA',round:'Fuente: hoja LIGA',aKey:'ana',bKey:'dani',pointsA:9,pointsB:10,plenosA:null,plenosB:null,scoreBasis:'INDIVIDUAL'},
   {matchId:'fin-2',competitionCode:'COPA_A',stage:'Final · partido registrado en COPA A',round:'Fuente: hoja COPA A',aKey:'ana',bKey:'dani',pointsA:3,pointsB:4,plenosA:null,plenosB:null,scoreBasis:'INDIVIDUAL'},
   {matchId:'prom',competitionCode:'PROMOCION',stage:'Promoción 1',round:null,aKey:'ceci',bKey:'dani',pointsA:6,pointsB:4,plenosA:null,plenosB:null,scoreBasis:'INDIVIDUAL'}
  ],
  movements:[
   {participantKey:'beto',fromDivision:'A',toDivision:'B',type:'DESCENSO',detail:'Descenso confirmado'},
   {participantKey:'ceci',fromDivision:'A',toDivision:'A',type:'PERMANENCIA',detail:'Permanencia por regla'},
   {participantKey:'dani',fromDivision:'B',toDivision:'A',type:'ASCENSO',detail:'Ascenso confirmado'}
  ],
  iffhs:[]},
 officialLinks:[],unavailable:[]
};
it('las copas históricas se renderizan como llave de fases, con dos finales diferentes y marcadores exactos',()=>{
 const html=renderToStaticMarkup(createElement(SeasonDetail,{detail:historyLeague,competition:'COPA_A'}));
 expect(html).toContain('Llave de eliminación directa');
 expect(html).toContain('Llave histórica de la competición');
 for(const label of ['Octavos','Semifinales','Final','Fuente: hoja LIGA','Fuente: hoja COPA A','9','10','3','4'])expect(html).toContain(label);
 expect(html.match(/class="archive-bracket-node/g)).toHaveLength(4);
 expect(html).not.toContain('Ganador'); // The old source does not provide advancement edges.
 expect(html).not.toContain('Sin enfrentamientos oficiales');
});
it('la llave separa fase de grupos, desempate y final sin perder encuentros',()=>{
 const matches=[
  {...historyLeague.data.matches[0],stage:'Fase de grupos',round:'Grupo 1 · Fecha 1'},
  {...historyLeague.data.matches[0],stage:'Octavos'},
  {...historyLeague.data.matches[0],stage:'Desempate de octavos'},
  {...historyLeague.data.matches[0],stage:'Final · resultado oficial (LIGA)'},
  {...historyLeague.data.matches[0],stage:'Desempate de la final'},
 ];
 const layout=historicalMatchLayout(matches);
 expect(layout.groups).toHaveLength(1);
 expect(layout.bracket.map(s=>s.label)).toEqual(['Octavos','Desempate · Octavos','Final','Desempate · Final']);
 expect(layout.bracket.reduce((n,s)=>n+s.matches.length,0)+layout.groups.length+layout.other.length).toBe(5);
});
it('color rojo indica descenso declarado; permanencia no se convierte en descenso por posición',()=>{
 const data=historyLeague.data,league=data.competitions[0];
 const beto=archiveStandingZone(data,league,data.standings[1],'imported');
 const ceci=archiveStandingZone(data,league,data.standings[2],'imported');
 expect(beto).toMatchObject({code:'relegation',label:'Descenso confirmado'});
 expect(ceci).toMatchObject({code:'survived',label:'Permanencia confirmada'});
 const html=renderToStaticMarkup(createElement(SeasonDetail,{detail:historyLeague,competition:'LIGA_A'}));
 expect(html).toContain('archive-zone--relegation');
 expect(html).toContain('archive-zone--survived');
 expect(html).toContain('archive-zone--champion');
});
it('T2 sin movimientos documentados no inventa descensos en los últimos puestos',()=>{
 const data={...historyLeague.data,movements:[],results:[]};
 expect(archiveStandingZone(data,data.competitions[0],data.standings[3],'imported')).toBeNull();
});
it('Promoción no es torneo con campeón: se muestra debajo de Liga, no en tarjetas, filtros ni pestañas',()=>{
 const summary=importedSummary(historyLeague.data);
 expect(summary.competitions.map(c=>c.code)).toEqual(['LIGA_A','COPA_A']);
 expect(visibleArchiveCompetitions(historyLeague.data.competitions).map(c=>c.code)).toEqual(['LIGA_A','COPA_A']);
 const html=renderToStaticMarkup(createElement(SeasonDetail,{detail:{...historyLeague,summary},competition:'LIGA_A'}));
 expect(html).toContain('Promoción · Ascensos y descensos');
 expect(html).toContain('No constituyen una copa ni otorgan un campeón');
 expect(html).toContain('Promoción 1');
 expect(html).toContain('Descenso confirmado');
 expect(html).not.toContain('href="#/historia/4/PROMOCION"');
 const catalog=renderToStaticMarkup(createElement(SeasonDetail,{detail:{...historyLeague,summary},view:'resumen'}));
 expect(catalog).not.toContain('href="#/historia/4/PROMOCION"');
});
it('la versión móvil de la llave conserva scroll accesible y tarjetas visibles',()=>{
 const html=renderToStaticMarkup(createElement(SeasonDetail,{detail:historyLeague,competition:'COPA_A'}));
 expect(html).toContain('tabindex="0"');
 expect(html).toContain('role="region"');
 expect(html).toContain('archive-bracket-stage');
});

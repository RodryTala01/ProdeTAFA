// @vitest-environment happy-dom
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {SeasonDetail,historicalExtras} from '../src/ParticipantArchive';
import {participantRoute} from '../src/participant-navigation';
import {archiveStandingZone,archiveHistoryGroups,archivePublicDescription,historicalMatchLayout,visibleArchiveCompetitions} from '../src/archive-history-view';
import {importedSummary} from '../worker/season-history';
import type {HistoryDetail} from '../src/history-types';
const detail:HistoryDetail={summary:{number:1,name:'Brasil 2021',source:'imported',participantCount:1,competitions:[{code:'COPA_AMERICA_2021',name:'Copa América',kind:'TOURNAMENT',champions:[]}]},data:{version:1,season:{number:1,name:'Brasil 2021',kind:'TOURNAMENT',notes:''},participants:[{key:'p',name:'Nombre real',userId:'public-user',division:null}],competitions:[{code:'COPA_AMERICA_2021',name:'Copa América',kind:'TOURNAMENT'}],standings:[{competitionCode:'COPA_AMERICA_2021',participantKey:'p',position:1,points:51,fulls:10,partials:10,errors:null,extras:null}],results:[],rounds:[],matches:[],movements:[],iffhs:[],statistics:[]},officialLinks:[],unavailable:[]};
it('rutas Historia preservan navegación y rechazan rutas inválidas',()=>{for(const path of ['historia','historia/1','historia/1/COPA_AMERICA_2021'])expect(participantRoute('#/'+path)).toBe(path);expect(participantRoute('#/historia/abc')).toBe('inicio');});
it('una tabla ganada no inventa un título y datos ausentes se identifican',()=>{const html=renderToStaticMarkup(createElement(SeasonDetail,{detail,view:'competiciones'}));expect(html).toContain('Copa América');expect(html).not.toContain('Liga A');expect(html).toContain('Sin resultados finales declarados');expect(html).not.toContain('Tabla final');expect(html).not.toContain('Sin enfrentamientos oficiales');expect(html).not.toContain('Tabla final');expect(html).not.toContain('>51<');expect(html).not.toContain('>11<');});
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
it('la final principal usa el marcador de Liga sin mencionar fuentes y conserva el otro encuentro en detalle',()=>{
 const html=renderToStaticMarkup(createElement(SeasonDetail,{detail:historyLeague,competition:'COPA_A'}));
 expect(html).toContain('Llave de eliminación directa');
 expect(html).toContain('Llave histórica de la competición');
 for(const label of ['Octavos','Semifinales','Final','9','10'])expect(html).toContain(label);
 expect(html.match(/class="archive-bracket-node"/g)).toHaveLength(3);
 expect(html).toContain('Otros encuentros de la final · 1');
 expect(html).not.toContain('Fuente: hoja LIGA');
 expect(html).not.toContain('Fuente: hoja COPA A');
 expect(html).not.toContain('Final · partido registrado en LIGA');
 expect(html).not.toContain('Ganador'); // No se inventa quién avanzó.
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
 expect(beto).toMatchObject({code:'relegation',label:'Descenso'});
 expect(ceci).toMatchObject({code:'survived',label:'Permanencia'});
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
 expect(html).toContain('>Descenso<');
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

it('en T4 los grupos de Copa A existen aunque las hojas auxiliares no sean parte del payload JSON',()=>{
 const keys=['t1-rodri-sebastian','t2-nico-avalos','t1-jhose','t1-pancho-muzzio',
  't1-mario-talarico','t1-luciano-hufschmid','t1-anubis','t1-lautaro-scocier',
  't1-matheo-olivera','t1-joel-marasco','t3-valentina-scocier','t1-aylen-benedetti',
  't1-kevin-sivori','t1-rodrigo-talarico','t1-facu-montes'];
 const data={...historyLeague.data,participants:keys.map(key=>({key,name:key,userId:null,division:null}))};
 const groups=archiveHistoryGroups(data,'COPA_A',[]);
 expect(groups).toHaveLength(4);
 expect(groups.map(g=>g.entries.length)).toEqual([4,4,4,3]);
 expect(groups[0].entries[0]).toMatchObject({participantKey:'t1-rodri-sebastian',points:26,position:1});
 const uiDetail={...historyLeague,data};
 const html=renderToStaticMarkup(createElement(SeasonDetail,{detail:uiDetail,competition:'COPA_A'}));
 expect(html).toContain('Fases de Copa A');
 expect(html).toContain('Grupos');
 expect(html).toContain('Eliminatorias');
 expect(html).toContain('Grupo 4');
 expect(html).toContain('>26<');
 expect(html).not.toContain('Llave de eliminación directa'); // La llave pertenece a la otra pestaña.
});
it('T3 Copa Total muestra todos los ocho grupos, cruces y puntos oficiales sin recalcular',()=>{
 const names=[
  't3-leandro-montes','t2-nico-avalos','t3-pablo-aquino','t1-rodri-sebastian',
  't1-aylen-benedetti','t1-pancho-muzzio','t1-matias-varela','t1-luciano-hufschmid','t1-anubis',
  't1-facu-montes','t2-martin-bustos','t1-gabriel-talarico','t3-nahuel-ponce',
  't1-joel-marasco','t1-kevin-sivori','t3-valentina-scocier','t1-rodrigo-talarico','t1-el-diego',
  't1-jhose','t1-nahuel-scocier','t1-mario-talarico','t1-lautaro-scocier','t1-matheo-olivera',
  't1-joaco-fernandez','t1-nahir-gomezz'
 ];
 const groupMatch={...historyLeague.data.matches[0],competitionCode:'COPA_TOTAL',
  stage:'Fase de grupos',round:'Grupo 1 · Fecha 1',aKey:names[0],bKey:names[2],matchId:'T3-G1'};
 const data={...historyLeague.data,season:{...historyLeague.data.season,number:3},
  participants:names.map(key=>({key,name:key,userId:null,division:null}))};
 const groups=archiveHistoryGroups(data,'COPA_TOTAL',[groupMatch]);
 expect(groups).toHaveLength(8);
 expect(groups.map(g=>g.entries.length)).toEqual([4,3,3,3,3,3,3,3]);
 expect(groups[0].matches).toHaveLength(1);
 expect(groups[0].entries.find(e=>e.participantKey==='t3-pablo-aquino')?.points).toBe(14);
 expect(groups[0].entries.find(e=>e.participantKey==='t2-nico-avalos')?.points).toBe(7);
});
it('en T4 Copa B muestra sus cinco grupos y las puntuaciones originales',()=>{
 const keys=['t3-nico-luchetti','t4-tomas-hon','t3-helyy','t3-aaron-rodas',
  't3-valium','t4-pollo','t1-matias-varela','t1-gabriel-talarico','t4-eze',
  't3-bruno-alonso','t1-joaco-fernandez','t4-natanael','t1-nahuel-scocier','t3-fede-gerez',
  't3-santi','t1-el-diego','t4-juli-boetsch','t2-martin-bustos'];
 const data={...historyLeague.data,participants:keys.map(key=>({key,name:key,userId:null,division:null}))};
 const groups=archiveHistoryGroups(data,'COPA_B',[]);
 expect(groups).toHaveLength(5);
 expect(groups.map(g=>g.entries.length)).toEqual([4,4,4,3,3]);
 expect(groups[4].entries[0].points).toBe(19);
});
it('una Copa sin tabla de grupos presenta la llave; no inventa equipos o grupos',()=>{
 const data={...historyLeague.data,season:{...historyLeague.data.season,number:7}};
 const groups=archiveHistoryGroups(data,'COPA_A',data.matches);
 expect(groups).toHaveLength(0);
 const html=renderToStaticMarkup(createElement(SeasonDetail,{detail:{...historyLeague,data},competition:'COPA_A'}));
 expect(html).toContain('Llave de eliminación directa');
 expect(html).not.toContain('Grupo 1');
});
it('la llave de octavos a final se ordena arriba sin alturas falsas, independientemente de la cantidad de cruces',()=>{
 const html=renderToStaticMarkup(createElement(SeasonDetail,{detail:historyLeague,competition:'COPA_A'}));
 expect(html).toContain('archive-bracket-encounters');
 expect(html).not.toContain('min-height:'); // Antes usaba altura máxima para espaciar las últimas rondas
});

it('las copas muestran solo Grupos y Eliminatorias, sin tabla final ni resultados por Fecha',()=>{
 const html=renderToStaticMarkup(createElement(SeasonDetail,{detail:historyLeague,competition:'COPA_A'}));
 expect(html).not.toContain('Tabla final');
 expect(html).not.toContain('Resultados por Fecha');
 expect(html).not.toContain('Puestos de Copa A');
 expect(html).toContain('Llave de eliminación directa');
 const league=renderToStaticMarkup(createElement(SeasonDetail,{detail:historyLeague,competition:'LIGA_A'}));
 expect(league).toContain('Tabla final');
 expect(league).toContain('archive-zone--relegation');
});
it('la descripción pública omite fuentes Excel, nombres de hojas y aclaraciones entre paréntesis sin tocar nombres propios',()=>{
 expect(archivePublicDescription('Ascenso a Primera División (lista oficial de TEMPORADA 4.xlsx, LIGA, columna CK)')).toBe('Ascenso a Primera División');
 expect(archivePublicDescription('Permanencia (por regla T4)')).toBe('Permanencia');
 expect(archivePublicDescription('Final · partido registrado en LIGA')).toBe('Final');
 expect(archivePublicDescription('Fuente: hoja COPA A')).toBe('');
 expect(archivePublicDescription('Reclasificación · archivo Excel T3')).toBe('Reclasificación');
 const changed:HistoryDetail={...historyLeague,data:{...historyLeague.data,
  participants:[...historyLeague.data.participants,{key:'nicol',name:'Nico Luchetti (R)',userId:null,division:null}],
  movements:historyLeague.data.movements.map(m=>({...m,detail:m.participantKey==='dani'?'Ascenso a Primera División (lista oficial de TEMPORADA 4.xlsx, LIGA, columna CK)':m.detail}))
 }};
 const html=renderToStaticMarkup(createElement(SeasonDetail,{detail:changed,competition:'LIGA_A'}));
 expect(html).toContain('Ascenso a Primera División');
 expect(html).not.toContain('TEMPORADA 4.xlsx');
 expect(html).not.toContain('columna CK');
 expect(html).not.toContain('Descenso confirmado');
 expect(html).not.toContain('Permanencia confirmada');
});

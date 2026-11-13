// @vitest-environment happy-dom
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect} from 'vitest';
import {composeHistoricalTotals} from '../worker/historical-totals';
import {HistoricalTotalsView} from '../src/ParticipantHistoricalTotals';
import {MiEquipoProfile,historicalSeasonAverage,type TeamPageData} from '../src/MiEquipo';

const archive={
 seasonNumber:4,data:{
  version:1,season:{number:4,name:'T4',kind:'LIGA',notes:''},
  participants:[{key:'a',name:'Ana',userId:'A',division:'A'},
   {key:'b',name:'Beto histórico',userId:null,division:'B'}],
  competitions:[{code:'LIGA_A',name:'Liga A',kind:'LEAGUE'},
   {code:'COPA_A',name:'Copa A',kind:'CUP'},
   {code:'PROMOCION',name:'Promoción',kind:'PROMOTION'}],
  statistics:[{participantKey:'a',points:48,fulls:5,partials:33,errors:54,extras:0,dates:null,predictions:null},
   {participantKey:'b',points:32,fulls:2,partials:26,errors:12,extras:0,dates:4,predictions:48}],
  standings:[{competitionCode:'LIGA_A',participantKey:'a',position:1,points:32,fulls:4,partials:20,errors:10,extras:0}],
  rounds:[],
  results:[{competitionCode:'COPA_A',participantKey:'a',position:1,resultCode:'CHAMPION',teamLabel:null},
   {competitionCode:'COPA_A',participantKey:'b',position:2,resultCode:'RUNNER_UP',teamLabel:null},
   {competitionCode:'PROMOCION',participantKey:'a',position:null,resultCode:'CHAMPION',teamLabel:null}],
  matches:[],movements:[],iffhs:[{participantKey:'a',points:281.15,position:3},{participantKey:'b',points:90,position:5}]
 }};
const officialScores=[{userId:'A',fullName:'Ana',dates:2,points:10,fulls:2,partials:4,errors:5,extras:0,predictions:24}];
const awards=[{seasonNumber:4,code:'COPA_A',name:'Copa A',userId:'A',fullName:'Ana',resultCode:'CHAMPION'},
 {seasonNumber:3,code:'COPA_A',name:'Copa A',userId:'A',fullName:'Ana',resultCode:'RUNNER_UP'}];
const members=[{seasonNumber:4,code:'COPA_A',name:'Copa A',userId:'A',fullName:'Ana'}];
const dataset=()=>composeHistoricalTotals([archive] as never,officialScores,awards,members,
 [{seasonNumber:3,userId:'A',fullName:'Ana',pointsScaled:10000}],[]);
it('palmares conserva campeonatos y subcampeonatos, sin duplicar el título oficial importado',()=>{
 const d=dataset();
 const ana=d.palmares.find(r=>r.userId==='A')!;
 expect(ana).toMatchObject({championships:1,runnerUps:1});
 expect(d.perCompetition.COPA_A.find(r=>r.userId==='A')).toMatchObject({championships:1,runnerUps:1});
 expect(d.competitions.some(c=>c.code==='PROMOCION')).toBe(false);
 expect(d.palmares.some(r=>r.fullName==='Beto histórico')).toBe(true);
});
it('IFFHS Oficial mira cinco temporadas y Total suma todas, respetando puntos por temporada',()=>{
 const d=dataset(),row=d.iffhsTotal.find(r=>r.userId==='A')!;
 expect(row.totalPoints).toBeCloseTo(381.15);
 expect(d.iffhsOfficial.seasons).toEqual([4,3,2,1]);
 expect(d.iffhsOfficial.ranking.find(r=>r.userId==='A')?.breakdown.find(r=>r.seasonNumber===2)?.points).toBeNull();
 const withOfficial=composeHistoricalTotals([archive] as never,[],[],[],
  [{seasonNumber:4,userId:'A',fullName:'Ana',pointsScaled:30000}],[]);
 expect(withOfficial.iffhsTotal.find(r=>r.userId==='A')?.totalPoints).toBe(300);
});
it('PTS manda en la tabla total, fechas desconocidas no generan promedios ficticios',()=>{
 const d=dataset();
 expect(d.general[0]).toMatchObject({userId:'A',points:58,dates:null,averagePoints:58/103,averageFulls:null});
 const beto=d.general.find(r=>r.userId.startsWith('hist:'))!;
 expect(beto).toMatchObject({points:32,dates:4,averagePoints:0.8});
 expect(d.general.every((r,i,a)=>i===0||a[i-1].points>=r.points)).toBe(true);
});
it('la interfaz de rankings tiene tabla limpia sin resultados de ejemplo ni duplicar fuentes',()=>{
 const html=renderToStaticMarkup(createElement(HistoricalTotalsView,{data:dataset()}));
 expect(html).toContain('TABLAS TOTALES');
 for(const name of ['Palmarés Oficial','Palmarés Total','Por competencia','IFFHS Oficial','IFFHS Total','Tabla general'])expect(html).toContain(name);
 expect(html).toContain('Campeonatos');
 expect(html).toContain('Subcampeonatos');
 expect(html).toContain('Ana');
 expect(html).not.toContain('PROMOCION');
});
it('la ficha de Mi Club presenta promedios fiables y resumen histórico con trofeos y estados en castellano',()=>{
 expect(historicalSeasonAverage({points:48,fulls:0,partials:0,errors:0})).toBeNull();
 expect(historicalSeasonAverage({points:48,fulls:null,partials:33,errors:54})).toBeNull();
 expect(historicalSeasonAverage({points:48,fulls:5,partials:33,errors:54})).toBeCloseTo(0.521739);
 const model:TeamPageData={
  identity:{id:'A',participantName:'Ana',teamName:'Equipo Ana',shieldUrl:null,foundedSeason:4},
  division:null,stats:{points:48,dates:0,fulls:5,partials:33,errors:54,extras:0,predictions:0,averagePoints:null},
  titles:[],rankings:{general:{current:1,best:null},iffhs:{current:1,best:null,throughSeason:4}},encounters:[],
  historicalSeasons:[{seasonNumber:4,seasonName:'T4',kind:'LIGA',name:'Ana',division:'A',
   statistics:{points:48,dates:null,fulls:5,partials:33,errors:54,extras:0},
   standings:[{competitionCode:'LIGA_A',competitionName:'Liga A',position:9,points:32}],rounds:[],
   results:[{competitionCode:'COPA_A',competitionName:'Copa A',resultCode:'RUNNER_UP',position:2},
    {competitionCode:'COPA_CAMPEONES',competitionName:'Copa Campeones',resultCode:'CHAMPION',position:1}],
   movements:[],iffhs:{points:281.15,position:3}}]
 };
 const html=renderToStaticMarkup(createElement(MiEquipoProfile,{data:model}));
 expect(html).toContain('Promedio de puntaje total');
 expect(html).toContain('equipo-season-metrics');
 expect(html).toContain('Subcampeón');
 expect(html).toContain('Campeón');
 expect(html).toContain('Copa Campeones');
 expect(html).not.toContain('>RUNNER_UP<');
 expect(html).not.toContain('>CHAMPION<');
});

it('históricos sin cuenta se unifican solo por la misma clave inequívoca, jamás por nombre parecido',()=>{
 const previous={...archive,seasonNumber:3,data:{...archive.data,season:{...archive.data.season,number:3}}};
 const combined=composeHistoricalTotals([previous,archive] as never,[],[],[],[],[]);
 const beto=combined.general.filter(r=>r.fullName==='Beto histórico');
 expect(beto).toHaveLength(1);
 expect(beto[0]).toMatchObject({points:64,dates:8,averagePoints:0.8});
 const another={...previous,data:{...previous.data,
  participants:previous.data.participants.map(p=>p.key==='b'?{...p,name:'Otra persona'}:p)}};
 const safe=composeHistoricalTotals([another,archive] as never,[],[],[],[],[]);
 expect(safe.general.filter(r=>r.fullName==='Beto histórico')).toHaveLength(1);
 expect(safe.general.filter(r=>r.fullName==='Otra persona')).toHaveLength(1);
});

it('separa las participaciones y títulos oficiales de los totales sin duplicar ediciones',()=>{
 const extra=[{seasonNumber:1,code:'COPA_AMERICA_2021',name:'Copa América Brasil 2021',userId:'A',fullName:'Ana',resultCode:'CHAMPION'},
 {seasonNumber:1,code:'COPA_AMERICA',name:'Copa América',userId:'A',fullName:'Ana',resultCode:'CHAMPION'},
 {seasonNumber:2,code:'MUNDIAL_DE_CLUBES',name:'Mundial de Clubes',userId:'A',fullName:'Ana',resultCode:'CHAMPION'}];
 const totals=composeHistoricalTotals([],[],extra,extra,[]);
 expect(totals.palmaresOfficial[0]).toMatchObject({championships:1,participations:1});
 expect(totals.palmares[0]).toMatchObject({championships:2,participations:2});
 expect(totals.perCompetition.MUNDIAL_DE_CLUBES[0].championships).toBe(1);
});

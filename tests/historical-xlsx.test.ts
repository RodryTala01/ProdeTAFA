// @vitest-environment happy-dom
import {it,expect} from 'vitest';
import {createHistoricalTemplate,parseHistoricalWorkbook} from '../src/historical-xlsx';
import type {ArchivePayload} from '../src/historical-schema';

it('crea una plantilla Excel real y la lee sin inventar copas, resultados ni participantes',async()=>{
 const blob=createHistoricalTemplate(1);
 expect(blob.type).toContain('spreadsheetml');
 expect(blob.size).toBeGreaterThan(2000);
 const file=new File([blob],'TAFA_T1.xlsx',{type:blob.type});
 const payload=await parseHistoricalWorkbook(file);
 expect(payload.version).toBe(1);
 expect(payload.season).toMatchObject({number:1,name:'Temporada 1'});
 expect(payload.competitions).toEqual([]);
 expect(payload.matches).toEqual([]);
 expect(payload.participants).toEqual([]);
});

it('exporta e importa una temporada histórica con todas las hojas en XLSX',async()=>{
 const data:ArchivePayload={version:1,season:{number:11,name:'T11 · Mundial',kind:'MUNDIAL',notes:'Sin ligas'},
 participants:[{key:'UNO',name:'Ejemplo',userId:null,division:null}],
 competitions:[{code:'MUNDIAL',name:'Mundial',kind:'TOURNAMENT'}],
 statistics:[{participantKey:'UNO',points:45,fulls:13,partials:6,errors:5,extras:0,dates:2,predictions:24}],
 standings:[{competitionCode:'MUNDIAL',participantKey:'UNO',position:1,points:45,fulls:13,partials:6,errors:5,extras:0}],
 rounds:[],results:[{competitionCode:'MUNDIAL',participantKey:'UNO',position:1,resultCode:'CHAMPION',teamLabel:null}],
 matches:[],movements:[],iffhs:[{participantKey:'UNO',points:150.5,position:1}]};
 const blob=createHistoricalTemplate(11,data);
 const parsed=await parseHistoricalWorkbook(new File([blob],'TAFA_T11.xlsx'));
 expect(parsed.season).toMatchObject({number:11,kind:'MUNDIAL'});
 expect(parsed.participants).toHaveLength(1);
 expect(parsed.statistics[0].points).toBe(45);
 expect(parsed.results[0].resultCode).toBe('CHAMPION');
 expect(parsed.iffhs[0].points).toBe(150.5);
});
it('plantilla conserva competitionCode, cuatro matchId distintos y controles de Excel',async()=>{
 const data:ArchivePayload={version:1,season:{number:4,name:'T4',kind:'MIXTA',notes:''},participants:[{key:'A1',name:'A1',userId:null,division:null},{key:'A2',name:'A2',userId:null,division:null},{key:'B1',name:'B1',userId:null,division:null},{key:'B2',name:'B2',userId:null,division:null}],competitions:[{code:'LIGA_A',name:'Liga A',kind:'LEAGUE'},{code:'COPA_DUOS',name:'Copa Dúos',kind:'CUP'}],statistics:[],standings:[],results:[],movements:[],iffhs:[],rounds:['LIGA_A','COPA_DUOS'].map(competitionCode=>({competitionCode,round:'Fecha 1',participantKey:'A1',points:4,fulls:null,partials:null,errors:null,extras:null})),matches:['A1:B1','A1:B2','A2:B1','A2:B2'].map((pair,i)=>({matchId:'FINAL-'+i,competitionCode:'COPA_DUOS',stage:'Final',round:'Fecha 1',aKey:pair.split(':')[0],bKey:pair.split(':')[1],pointsA:4,pointsB:0,plenosA:null,plenosB:null,scoreBasis:'DUO'}))};
 const blob=createHistoricalTemplate(4,data),parsed=await parseHistoricalWorkbook(new File([blob],'T4.xlsx'));
 expect(parsed.rounds.map(r=>r.competitionCode)).toEqual(['LIGA_A','COPA_DUOS']);expect(parsed.matches.map(m=>m.matchId)).toEqual(['FINAL-0','FINAL-1','FINAL-2','FINAL-3']);
 const raw=await blob.text();expect(raw).toContain('<autoFilter');expect(raw).toContain('<dataValidations');expect(raw).toContain('styles.xml');expect(raw).toContain('matchId obligatorio');
 const missing=structuredClone(data);missing.rounds[0].competitionCode='';
 await expect(parseHistoricalWorkbook(new File([createHistoricalTemplate(4,missing)],'bad.xlsx'))).rejects.toThrow('competitionCode obligatorio');
});

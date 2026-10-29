// @vitest-environment happy-dom
import {it,expect} from 'vitest';
import {createHistoricalTemplate,parseHistoricalWorkbook} from '../src/historical-xlsx';
import type {ArchivePayload} from '../worker/historical-archive';

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

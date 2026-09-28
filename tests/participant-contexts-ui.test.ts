import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {CompetitionContextList} from '../src/ParticipantCompetitionContexts';
import {contextLabel,type CompetitionContext} from '../src/competition-contexts';
const base={id:'one',competition:{id:1,code:'LIGA_A',displayName:'Liga A',family:'LEAGUE'},stage:null,roundLink:{id:1,sequence:2,purpose:'NORMAL',label:null}};
describe('Contextos participante UI',()=>{
 it('varios contextos son informativos, sin inputs ni envío adicional',()=>{const contexts:CompetitionContext[]=[{...base,kind:'LEAGUE',division:{id:1,code:'A',name:'Liga A'}},{...base,id:'two',kind:'TIEBREAK',entryId:1,competition:{...base.competition,displayName:'Copa B'},tiebreak:{id:1,status:'active',originalEncounterId:1,sequence:1,winnerEntryId:null,opponents:[{entryId:2,name:'Carlos'}]}}];const html=renderToStaticMarkup(createElement(CompetitionContextList,{contexts}));expect(html).toContain('Liga A · Fecha 2');expect(html).toContain('Desempate Copa B · vs Carlos');expect(html).not.toMatch(/<input|<form|<button/);expect(html).toContain('Un único pronóstico de 12 partidos');});
 it('muestra todos los rivales de TAFA múltiple',()=>{const c:CompetitionContext={...base,kind:'TIEBREAK',entryId:1,tiebreak:{id:1,status:'active',originalEncounterId:null,sequence:1,winnerEntryId:null,opponents:[{entryId:2,name:'Carlos'},{entryId:3,name:'Vero'}]}};expect(contextLabel(c)).toContain('Carlos / Vero');});
});

import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {CompetitionContextList} from '../src/ParticipantCompetitionContexts';
import {contextLabel,type CompetitionContext} from '../src/competition-contexts';
const base={id:'one',competition:{id:1,code:'LIGA_A',displayName:'Liga A',family:'LEAGUE'},stage:null,roundLink:{id:1,sequence:2,purpose:'NORMAL',label:null}};
describe('Contextos participante UI',()=>{
 it('varios contextos son informativos, sin inputs ni envío adicional',()=>{const contexts:CompetitionContext[]=[{...base,kind:'LEAGUE',division:{id:1,code:'A',name:'Liga A'}},{...base,id:'two',kind:'TIEBREAK',entryId:1,competition:{...base.competition,displayName:'Copa B'},tiebreak:{id:1,status:'active',originalEncounterId:1,sequence:1,winnerEntryId:null,opponents:[{entryId:2,name:'Carlos'}]}}];const html=renderToStaticMarkup(createElement(CompetitionContextList,{contexts}));expect(html).toContain('Liga A · Fecha 2');expect(html).toContain('Desempate Copa B · vs Carlos');expect(html).not.toMatch(/<input|<form|<button/);expect(html).not.toContain('Estás jugando esta Fecha en:');});
 it('muestra todos los rivales de TAFA múltiple',()=>{const c:CompetitionContext={...base,kind:'TIEBREAK',entryId:1,tiebreak:{id:1,status:'active',originalEncounterId:null,sequence:1,winnerEntryId:null,opponents:[{entryId:2,name:'Carlos'},{entryId:3,name:'Vero'}]}};expect(contextLabel(c)).toContain('Carlos / Vero');});
});
import {PredictionContextCard} from '../src/PredictionContextCard';
import type {Overview} from '../src/participant-competitions';
it('Dúos muestra cuatro escudos con vigencia de la Fecha, sin ranking',()=>{
 const context:CompetitionContext={...base,competition:{...base.competition,code:'COPA_DUOS',displayName:'Copa Dúos'},kind:'KNOCKOUT',entryId:10,encounter:{id:1,slotKey:'SF',opponentEntryId:20,opponentName:'Rivales',scoreSelf:12,scoreOpponent:10,status:'finished',winnerEntryId:10,resolution:null,adminConfirmedAt:'2026-10-01'}};
 const members=[{entryId:10,userId:'old',fullName:'Anterior',validFrom:1,validTo:5},{entryId:10,userId:'new',fullName:'Vigente',validFrom:5,validTo:null},{entryId:10,userId:'mate',fullName:'Compañero',validFrom:1,validTo:null},{entryId:20,userId:'r1',fullName:'Rival Uno',validFrom:1,validTo:null},{entryId:20,userId:'r2',fullName:'Rival Dos',validFrom:1,validTo:null}];
 const overview={currentUserId:'new',season:{competitions:[context.competition],members}} as unknown as Overview;
 const html=renderToStaticMarkup(createElement(PredictionContextCard,{context,overview,roundId:5}));
 expect(html).toContain('Vigente');expect(html).not.toContain('Anterior');expect(html.match(/prediction-context-person/g)).toHaveLength(4);expect(html).toContain('Clasificado');expect(html).not.toContain('Tu posición');
 const historical=renderToStaticMarkup(createElement(PredictionContextCard,{context,overview,roundId:4}));expect(historical).toContain('Anterior');expect(historical).not.toContain('Vigente');
});
it('sin tabla no inventa métricas de Liga ni grupos',()=>{
 for(const context of [{...base,kind:'LEAGUE',division:{id:1,code:'A',name:'Primera'}},{...base,kind:'ACCUMULATIVE_GROUP',entryId:1,group:{id:1,code:'A',name:'Grupo A'}}] as CompetitionContext[]){
 const html=renderToStaticMarkup(createElement(PredictionContextCard,{context,overview:null,roundId:1}));expect(html).not.toContain('<dd>');expect(html).toContain(context.competition.displayName);
 }
});

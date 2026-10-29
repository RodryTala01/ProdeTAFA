// @vitest-environment happy-dom
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {SeasonDetail,historicalExtras} from '../src/ParticipantArchive';
import {participantRoute} from '../src/participant-navigation';
import type {HistoryDetail} from '../src/history-types';
const detail:HistoryDetail={summary:{number:1,name:'Brasil 2021',source:'imported',participantCount:1,competitions:[{code:'COPA_AMERICA_2021',name:'Copa América',kind:'TOURNAMENT',champions:[]}]},data:{version:1,season:{number:1,name:'Brasil 2021',kind:'TOURNAMENT',notes:''},participants:[{key:'p',name:'Nombre real',userId:'public-user',division:null}],competitions:[{code:'COPA_AMERICA_2021',name:'Copa América',kind:'TOURNAMENT'}],standings:[{competitionCode:'COPA_AMERICA_2021',participantKey:'p',position:1,points:51,fulls:10,partials:10,errors:null,extras:null}],results:[],rounds:[],matches:[],movements:[],iffhs:[],statistics:[]},officialLinks:[],unavailable:[]};
it('rutas Historia preservan navegación y rechazan rutas inválidas',()=>{for(const path of ['historia','historia/1','historia/1/COPA_AMERICA_2021'])expect(participantRoute('#/'+path)).toBe(path);expect(participantRoute('#/historia/abc')).toBe('inicio');});
it('una tabla ganada no inventa un título y datos ausentes se identifican',()=>{const html=renderToStaticMarkup(createElement(SeasonDetail,{detail}));expect(html).toContain('Copa América');expect(html).not.toContain('Liga A');expect(html).toContain('Sin resultados finales declarados');expect(html).toContain('Sin enfrentamientos oficiales');expect(html).toContain('#/club/participante/public-user');expect(html).toContain('>51<');expect(html).toContain('>11<');});
it('Extras usa datos oficiales sin inventar distribución cuando faltan contadores',()=>{expect(historicalExtras({points:51,fulls:10,partials:10,extras:null})).toBe(11);expect(historicalExtras({points:51,fulls:null,partials:10,extras:null})).toBeNull();expect(historicalExtras({points:51,fulls:10,partials:10,extras:7})).toBe(7);});

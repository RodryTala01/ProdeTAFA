import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {SubmissionLists} from '../src/AdminRoundSubmissions';
it('distingue envío oficial, pendiente e inactivo sin contar borradores',()=>{
 const html=renderToStaticMarkup(createElement(SubmissionLists,{participants:[
 {id:'1',name:'Enviado',active:1,lastAt:'2026-10-16 15:30:00',count:2},
 {id:'2',name:'Pendiente',active:1,lastAt:null,count:0},
 {id:'3',name:'Inactivo',active:0,lastAt:'2026-10-16 15:30:00',count:1},
 ]}));
 expect(html).toContain('1 enviaron');expect(html).toContain('1 no enviaron');expect(html).toContain('2 participantes activos');expect(html).toContain('12:30');expect(html).toContain('Reenviado');expect(html).toContain('Participantes inactivos · 1');
});
it('lista vacía no afirma que todos enviaron',()=>{
 const html=renderToStaticMarkup(createElement(SubmissionLists,{participants:[]}));expect(html).toContain('No hay participantes activos.');expect(html).not.toContain('Todos los participantes activos enviaron.');
});

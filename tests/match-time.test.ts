import {expect,it} from 'vitest';
import {argentinaDateTime,utcDate} from '../src/match-time';
it('UTC ISO y timestamps D1 muestran el mismo horario argentino',()=>{
 for(const timestamp of ['2026-10-17T00:30:00Z','2026-10-17 00:30:00','2026-10-17T00:30:00','2026-10-16T21:30:00-03:00']){
  expect(argentinaDateTime(timestamp)).toContain('16/10');
  expect(argentinaDateTime(timestamp)).toContain('21:30');
  expect(utcDate(timestamp).toISOString()).toBe('2026-10-17T00:30:00.000Z');
 }
});
it('medianoche argentina usa 00 y no 24',()=>{
 expect(argentinaDateTime('2026-10-17T03:00:00Z')).toContain('00:00');
});

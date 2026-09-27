import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CompetitionConfigPanel from '../src/CompetitionConfigPanel';
import { cupApi } from '../src/cup-ab-api';
import { IffhsBreakdown } from '../src/AdminIffhs';

afterEach(() => vi.unstubAllGlobals());

describe('Errores recuperables de competiciones', () => {
  it('explica fallas de conexión y respuestas HTML sin exponer errores de JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(cupApi('/api/test')).rejects.toThrow('Revisá tu conexión');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Error</html>', {status:503})));
    await expect(cupApi('/api/test')).rejects.toThrow('Volvé a intentar en unos momentos');
  });
  it('distingue sesión vencida y conserva los detalles de validación deportiva', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({error:'No autorizado'}, {status:401})));
    await expect(cupApi('/api/test')).rejects.toThrow('Tu sesión venció');
    const data = {error:'Hay un corte empatado', tiedEntryIds:[1,2]};
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(data, {status:409})));
    await expect(cupApi('/api/test')).rejects.toMatchObject({data});
  });
});

describe('UX de cierre y resultados', () => {
  const competition = {id:1,code:'COPA_PAPA',canonicalName:'Copa Papa',displayName:'Copa Homenaje',status:'active',stages:[{id:1,code:'FINAL',name:'Final',stageType:'KNOCKOUT',sequence:1,status:'draft'}],roundLinks:[]};
  const render = (status:string) => renderToStaticMarkup(createElement(CompetitionConfigPanel,{competition:{...competition,status},onChanged:()=>{}}));
  it('mantiene consulta pero bloquea edición y eliminación de etapas cerradas', () => {
    for (const status of ['finished','archived']) {
      const html=render(status);
      expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Editar Final/);
      expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Eliminar Final/);
      expect(html).toContain('Sus etapas y Fechas se conservan para consulta');
    }
    expect(render('active').match(/<button[^>]*>Editar Final/)?.[0]).not.toContain('disabled');
  });
  it('muestra nombres de edición y componentes comprensibles en IFFHS', () => {
    const row={userId:'p',fullName:'Prueba',totalPoints:10,totalSource:'calculated',components:[{competitionCode:'COPA_PAPA',componentCode:'SPORT_POINTS',baseValue:10,multiplier:1,points:10,source:'calculated'}]};
    const html=renderToStaticMarkup(createElement(IffhsBreakdown,{row,competitionNames:{COPA_PAPA:'Copa Homenaje'}}));
    expect(html).toContain('Copa Homenaje');
    expect(html).toContain('Puntos deportivos');
    expect(html).not.toMatch(/SPORT_POINTS|calculated|COPA_PAPA/);
  });
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { competitionRows, emptyHome, loadHome, predictionState, timeRemaining, type HomeData, type HomeRound } from '../src/participant-home';
import { participantRoute } from '../src/participant-navigation';
import { ParticipantNavigation } from '../src/ParticipantDashboard';
import ParticipantHome, { HomeErrors, NextRound, ParticipantClub, ParticipantCompetitions } from '../src/ParticipantHome';

const prediction = { homeScore: null, awayScore: null, extraTeamId: null };
const round: HomeRound = { id: 7, name: 'Jornada publicada', status: 'open', submitted: false, serverNow: '2030-01-01T00:00:00Z', matches: [{ kickoffAt: '2030-01-02T00:00:00Z', lockedAt: '2030-01-02T00:01:00Z', isLocked: false, prediction, officialPrediction: prediction }] };
const liga = { id: 2, code: 'LIGA_B', displayName: 'Liga B', family: 'LEAGUE', status: 'active' };
const copa = { id: 3, code: 'COPA_A', displayName: 'Copa A', family: 'CUP', status: 'active' };
const data: HomeData = { ...emptyHome, round, season: { id: 1, name: 'Temporada actual', seasonNumber: 33, division: { code: 'B', name: 'Liga B' }, competitions: [liga], competitionCatalog: [copa, liga] }, league: { competition: liga, currentUserId: 'me', provisional: false, standings: [{ userId: 'me', position: 5, points: 18 }] } };
afterEach(() => vi.unstubAllGlobals());

describe('Participante: Home y navegación', () => {
  it('default y hashes inválidos abren Inicio; las cuatro secciones y subrutas sobreviven al refresco', () => {
    expect(participantRoute('')).toBe('inicio');
    expect(participantRoute('#/admin')).toBe('inicio');
    for (const path of ['inicio', 'pronosticos', 'competiciones', 'club', 'club/historial', 'competiciones/liga-b']) expect(participantRoute('#/' + path)).toBe(path);
  });
  it('navegación tiene cuatro links, iconos accesibles y un destino activo', () => {
    const html = renderToStaticMarkup(createElement(ParticipantNavigation, { route: 'club/historial' }));
    expect(html.match(/<a /g)).toHaveLength(4);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain('href="#/club" aria-current="page"');
    for (const label of ['Inicio','Pronósticos','Competiciones','Mi Club']) expect(html).toContain(label);
  });
  it('Mi Club conserva accesos a historial y pronósticos por Fecha', () => {
    const html = renderToStaticMarkup(createElement(ParticipantClub, { name: 'Persona de prueba', data }));
    expect(html).toContain('#/club/historial'); expect(html).toContain('#/pronosticos');
  });
  it('sin Fecha no ofrece CTA de carga y no usa una Fecha finalizada como próxima', async () => {
    const html = renderToStaticMarkup(createElement(NextRound, { round: null }));
    expect(html).toContain('Todavía no hay una próxima Fecha publicada.'); expect(html).not.toContain('href=');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url.includes('current') ? { season: null } : { round: { ...round, status: 'finished' } })));
    expect((await loadHome()).round).toBeNull();
  });
  it('distingue borrador, enviado, cambios de marcador y cambios de Penales', () => {
    expect(predictionState(round)).toContain('Todavía no');
    const edited = { ...round, matches: [{ ...round.matches[0], prediction: { ...prediction, homeScore: 1 } }] };
    expect(predictionState(edited)).toContain('borrador');
    expect(predictionState({ ...edited, submitted: true })).toContain('pendientes de reenviar');
    expect(predictionState({ ...round, submitted: true })).toBe('Pronóstico enviado');
    expect(predictionState({ ...round, submitted: true, matches: [{ ...round.matches[0], prediction: { ...prediction, extraTeamId: 'a' } }] })).toContain('pendientes');
    expect(predictionState({ ...edited, submitted: true, matches: [{ ...edited.matches[0], isLocked: true }] })).toBe('Pronóstico enviado');
  });
  it('Home usa nombre/posición reales recibidos, no fixtures personales', () => {
    const html = renderToStaticMarkup(createElement(ParticipantHome, { name: 'Nombre real recibido', data }));
    expect(html).toContain('Nombre real recibido'); expect(html).toContain(round.name);
    expect(html).toContain('18'); expect(html).toContain('5');
    expect(html).not.toMatch(/Rodrigo|Azul|Carlos|Vero|FECHA 3/);
  });
  it('liga propia primero, otras competiciones visibles sin participar y destino de división explícito', () => {
    const rows = competitionRows(data);
    expect(rows[0].code).toBe('LIGA_B'); expect(rows[1].status).toBe('No participa');
    const html = renderToStaticMarkup(createElement(ParticipantCompetitions, { data }));
    expect(html).toContain('No participa'); expect(html).toContain('#/competiciones/liga-b');
  });
  it('membresía histórica de Dúos no se presenta como vigencia actual', () => {
    const duo = { ...copa, code: 'COPA_DUOS', displayName: 'Copa Dúos' };
    const rows = competitionRows({ ...data, season: { ...data.season!, competitions: [duo], competitionCatalog: [duo] } });
    expect(rows[0].status).toBe('Participación registrada'); expect(rows[0].detail).not.toContain('compañero');
  });
  it('el loader usa GET de datos reales y división B sin reconstruir tabla', async () => {
    const fetcher = vi.fn(async (url: string) => Response.json(url.includes('/current') ? { season: data.season } : url.includes('/standings') ? data.league : url.includes('/competition-contexts') ? { contexts: [] } : { round }));
    vi.stubGlobal('fetch', fetcher);
    const result = await loadHome(); expect(result.league).toEqual(data.league);
    expect(fetcher.mock.calls.map(c => c[0])).toContain('/api/competition-engine/leagues/LIGA_B/standings');
    expect(fetcher.mock.calls.map(c => c[0])).toContain('/api/participant/rounds/7/competition-contexts');
  });
  it('errores de API son humanos, reintentables y no exponen SQL ni status interno', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('SQLITE_ERROR secret', { status: 500 })));
    const result = await loadHome();
    const html = renderToStaticMarkup(createElement(HomeErrors, { errors: result.errors, retry: () => {} }));
    expect(html).toContain('No pudimos cargar las competiciones.'); expect(html).toContain('Reintentar'); expect(html).not.toContain('SQLITE');
    expect(renderToStaticMarkup(createElement(ParticipantHome, { name: 'Persona', data: result }))).not.toContain('Todavía no hay una próxima Fecha');
  });
  it('contador usa días u horas y no valores negativos', () => {
    expect(timeRemaining(90061000, 0)).toBe('Faltan 1 días 1 h'); expect(timeRemaining(61000, 0)).toBe('Faltan 00:01:01'); expect(timeRemaining(0, 1)).toBe('El horario ya llegó');
  });
  it('login enruta a Inicio, logout limpia ruta y PWA prompt no está montado', () => {
    const app = readFileSync('src/AppV2.tsx','utf8');
    expect(app).toContain("loggedUser.role === 'participant' ? '#/inicio'");
    expect(app).toContain("api('/api/auth/logout'");
    expect(app).toContain("window.history.replaceState(null, '', window.location.pathname); setUser(null)");
    const main = readFileSync('src/main.tsx','utf8');
    expect(main).not.toContain('PwaInstallPrompt'); expect(main).toContain('serviceWorker');
    const shell = readFileSync('src/ParticipantDashboard.tsx','utf8');
    expect(shell).toContain('<ParticipantHistory />'); expect(shell).toContain('<PredictionHistoryBrowser own />'); expect(shell).toContain('onClick={onLogout}');
  });
});

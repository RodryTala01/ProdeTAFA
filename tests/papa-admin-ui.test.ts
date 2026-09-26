import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PapaProposalView, PapaPairEditor } from '../src/AdminCupPapa';
import {
  papaPairErrors,
  papaReady,
  papaLosers,
  papaEligible,
  loadPapa,
  type PapaProposal,
} from '../src/papa-admin';
const proposal: PapaProposal = {
  previousSeasonNumber: 32,
  previousSeasonFound: true,
  participantCount: 3,
  bracketSize: 32,
  byesNeeded: 29,
  recommendedStart: 'ROUND_OF_16',
  proposedPairs: [
    {
      userA: { id: 'a', name: 'Ana', previousPosition: 1 },
      userB: { id: 'b', name: 'Beto', previousPosition: 9 },
    },
  ],
  unpaired: [{ id: 'c', name: 'Caro' }],
  initial: {
    stageId: null,
    roundLinkId: null,
    editable: false,
    hasEncounters: false,
    pairs: [],
  },
};
afterEach(() => vi.unstubAllGlobals());
describe('Copa Papa Admin UI', () => {
  it('presenta espejo histórico, vacantes y byes sin asignarlos automáticamente', () => {
    const html = renderToStaticMarkup(
      createElement(PapaProposalView, { proposal }),
    );
    expect(html).toContain('Mejor Liga A vs peor Liga B');
    expect(html).toContain('Ana (A, 1.º) vs Beto (B, 9.º)');
    expect(html).toContain('Caro');
    expect(html).toContain('byes de referencia 29');
  });
  it('valida todos una vez y permite rival null', () => {
    const people = papaEligible(proposal);
    expect(
      papaPairErrors(
        [
          { userAId: 'a', userBId: 'b' },
          { userAId: 'c', userBId: null },
        ],
        people,
      ),
    ).toEqual([]);
    expect(
      papaPairErrors([{ userAId: 'a', userBId: 'a' }], people).join(),
    ).toContain('una sola vez');
    expect(
      papaPairErrors([{ userAId: 'x', userBId: null }], people).join(),
    ).toContain('válidos');
    expect(
      papaPairErrors([{ userAId: 'a', userBId: 'b' }], people).join(),
    ).toContain('Caro');
  });
  it('muestra controles manuales y cantidad de pases libres', () => {
    const html = renderToStaticMarkup(
      createElement(PapaPairEditor, {
        pairs: [{ userAId: 'a', userBId: null }],
        people: papaEligible(proposal),
        disabled: false,
        onChange: () => {},
      }),
    );
    expect(html).toContain('Libre (bye)');
    expect(html).toContain('Byes cargados: 1');
    expect(html).toContain('Agregar cruce');
  });
  it('requiere ganadores confirmados y mantiene orden de perdedores', () => {
    const es: any[] = [
      {
        status: 'finished',
        adminConfirmedAt: 'now',
        winner: { id: 1, name: 'A' },
        entryA: { id: 1, name: 'A' },
        entryB: { id: 2, name: 'B' },
      },
      {
        status: 'finished',
        adminConfirmedAt: 'now',
        winner: { id: 4, name: 'D' },
        entryA: { id: 3, name: 'C' },
        entryB: { id: 4, name: 'D' },
      },
    ];
    expect(papaReady(es)).toBe(true);
    expect(papaLosers(es).map((e) => e?.name)).toEqual(['B', 'C']);
    es[0].adminConfirmedAt = null;
    expect(papaReady(es)).toBe(false);
    expect(papaReady([])).toBe(false);
  });
  it('lee propuesta específica y refresca knockout sin reconstrucción genérica', async () => {
    const requests: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      requests.push(url);
      return new Response(
        JSON.stringify(
          url.endsWith('seeding-proposal') ? proposal : { encounters: [] },
        ),
      );
    });
    const c: any = { id: 100, stages: [{ id: 201, stageType: 'KNOCKOUT' }] };
    const data = await loadPapa(c);
    expect(data.proposal.participantCount).toBe(3);
    expect(requests).toEqual([
      '/api/competition-engine/competitions/100/papa/seeding-proposal',
      '/api/competition-engine/stages/201/knockout',
    ]);
  });
});

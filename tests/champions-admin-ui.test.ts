import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ChampionSlots, ChampionNodeCard } from '../src/AdminCupChampions';
import {
  initialChoices,
  choiceErrors,
  loadChampions,
  type ChampionSlot,
  type ChampionNode,
} from '../src/champions-admin';
const slots: ChampionSlot[] = Array.from({ length: 14 }, (_, i) => ({
  slotCode: `S${i}`,
  slotName: `Cupo ${i}`,
  source: { previousSeasonNumber: 32, competitionCode: 'LIGA_A' },
  proposedUser: { id: `P${i}`, name: `Persona ${i}` },
  confirmedUser: null,
  confirmedEntryId: null,
  status: 'proposed',
  replacementReason: null,
}));
const eligible = slots.map((s) => s.proposedUser!);
const node: ChampionNode = {
  code: 'U2',
  label: 'Ganador U1 vs Campeón Liga B',
  branch: 'UPPER',
  sequence: 2,
  readyToActivate: false,
  stageId: null,
  sourceA: { ready: false, entryId: null, displayName: null, source: 'U1' },
  sourceB: {
    ready: true,
    entryId: 8,
    displayName: 'Persona 8',
    source: 'LIGA_B_CHAMPION',
  },
  encounter: null,
};
afterEach(() => vi.unstubAllGlobals());
describe('Campeones Admin UI', () => {
  it('muestra propuesta y confirmación separadas, fuente y motivo', () => {
    const data = [
      {
        ...slots[0],
        confirmedUser: eligible[1],
        status: 'replaced',
        replacementReason: 'Vacante resuelta',
      },
    ];
    const html = renderToStaticMarkup(
      createElement(ChampionSlots, {
        slots: data,
        choices: initialChoices(data),
        eligible,
        disabled: false,
        onChange: () => {},
      }),
    );
    expect(html).toContain('Propuesto: Persona 0');
    expect(html).toContain('Confirmado: Persona 1');
    expect(html).toContain('Vacante resuelta');
    expect(html).toContain('temporada 32');
  });
  it('no acepta duplicados ni vacantes ni reemplazos sin motivo', () => {
    const choices = initialChoices(slots);
    expect(choiceErrors(slots, choices, eligible)).toEqual([]);
    choices[1].userId = 'P0';
    expect(choiceErrors(slots, choices, eligible).join()).toContain(
      'duplicado',
    );
    expect(choiceErrors(slots, choices, eligible).join()).toContain('motivo');
    choices[1].userId = '';
    expect(choiceErrors(slots, choices, eligible).join()).toContain('vacante');
  });
  it('conserva confirmados al editar y valida elegibilidad', () => {
    const data = slots.map((s) => ({
      ...s,
      confirmedUser: s.proposedUser,
      confirmedEntryId: 1,
      status: 'confirmed',
    }));
    const choices = initialChoices(data);
    expect(choices[0].userId).toBe('P0');
    expect(choiceErrors(data, choices, eligible.slice(1)).join()).toContain(
      'no elegible',
    );
  });
  it('un nodo pendiente no ofrece activación ni etapa seleccionable', () => {
    const html = renderToStaticMarkup(
      createElement(ChampionNodeCard, {
        node,
        competition: {
          id: 1,
          code: 'COPA_CAMPEONES',
          displayName: 'Campeones',
          status: 'draft',
          divisionCode: null,
          stages: [],
          roundLinks: [],
        },
        slots,
        rounds: [],
        disabled: false,
        onChanged: async () => {},
        onActivate: async () => {},
      }),
    );
    expect(html).toContain('Esperando las dos fuentes confirmadas');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Activar U2/);
    expect(html).toContain('Ganador U1 pendiente');
  });
  it('refresca encuentros antes de volver a consultar fuentes para no habilitar ganadores obsoletos', async () => {
    const paths: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        paths.push(url);
        return new Response(
          JSON.stringify(
            url.endsWith('/slots')
              ? { slots }
              : url.endsWith('/knockout')
                ? { encounters: [{ id: 77 }] }
                : {
                    bracket: [{ ...node, stageId: 20, encounter: { id: 77 } }],
                  },
          ),
          { status: 200 },
        );
      }),
    );
    const d = await loadChampions(1);
    expect(paths).toEqual([
      '/api/competition-engine/competitions/1/champions/slots',
      '/api/competition-engine/competitions/1/champions/bracket',
      '/api/competition-engine/stages/20/knockout',
      '/api/competition-engine/competitions/1/champions/bracket',
    ]);
    expect(d.encounters[0].id).toBe(77);
  });
});

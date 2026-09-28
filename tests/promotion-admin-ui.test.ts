import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PromotionSlots, PromotionMovements } from '../src/AdminPromotion';
import {
  promotionChoices,
  promotionErrors,
  promotionPreview,
  loadPromotion,
  type PromotionSlot,
} from '../src/promotion-admin';
const slots: PromotionSlot[] = [
  'A_HIGH_PROMO',
  'A_LOW_PROMO',
  'B_HIGH_PROMO',
  'B_LOW_PROMO',
].map((slotCode, i) => ({
  slotCode,
  slotName: slotCode,
  source: {
    competitionCode: i < 2 ? 'LIGA_A' : 'LIGA_B',
    position: i < 2 ? i + 3 : i,
  },
  proposedUser: { id: `P${i}`, name: `Persona ${i}` },
  confirmedUser: null,
  confirmedEntryId: null,
  status: 'proposed',
  replacementReason: null,
}));
const eligible = slots.map((s) => s.proposedUser!);
afterEach(() => vi.unstubAllGlobals());
describe('Promoción Admin UI', () => {
  it('muestra posiciones base, propuesta y confirmación separadas', () => {
    const html = renderToStaticMarkup(
      createElement(PromotionSlots, {
        slots,
        choices: promotionChoices(slots),
        eligible,
        disabled: false,
        onChange: () => {},
      }),
    );
    expect(html).toContain('Posición base: Liga A · 3.º');
    expect(html).toContain('Posición base: Liga B · 2.º');
    expect(html).toContain('Propuesto: Persona 0');
    expect(html).toContain('Confirmado: Pendiente');
  });
  it('bloquea duplicados y exige motivo para corrimientos o vuelta a propuesta', () => {
    const choices = promotionChoices(slots);
    expect(promotionErrors(slots, choices, eligible)).toEqual([]);
    choices[0].userId = 'P1';
    expect(promotionErrors(slots, choices, eligible).join()).toContain(
      'duplicado',
    );
    expect(promotionErrors(slots, choices, eligible).join()).toContain(
      'motivo',
    );
    const changed = [
      { ...slots[0], confirmedUser: eligible[1] },
      ...slots.slice(1),
    ];
    expect(
      promotionErrors(changed, promotionChoices(slots), eligible).join(),
    ).toContain('motivo');
  });
  it('vista previa requiere ambos ganadores confirmados y misma Fecha', () => {
    const es: any[] = [0, 1].map((i) => ({
      id: i,
      slotKey: `PROMO-${i + 1}`,
      entryA: { id: i * 2, name: `G${i}` },
      entryB: { id: i * 2 + 1, name: `P${i}` },
      winner: { id: i * 2, name: `G${i}` },
      status: 'finished',
      adminConfirmedAt: 'now',
      round: { id: 1 },
    }));
    expect(promotionPreview(es).map((m) => m.toDivision)).toEqual([
      'A',
      'B',
      'A',
      'B',
    ]);
    es[1].adminConfirmedAt = null;
    expect(promotionPreview(es)).toEqual([]);
    es[1].adminConfirmedAt = 'now';
    es[1].round.id = 2;
    expect(promotionPreview(es)).toEqual([]);
  });
  it('muestra movimientos persistidos con nombres y divisiones, sin IDs', () => {
    const html = renderToStaticMarkup(
      createElement(PromotionMovements, {
        movements: [
          {
            id: 99,
            userId: 'internal',
            fullName: 'Ana',
            fromDivision: 'B',
            toDivision: 'A',
            status: 'proposed',
            reason: 'PROMOCION:1:WINNER',
          },
        ],
      }),
    );
    expect(html).toContain('Ana · Liga B → Liga A · Propuesto');
    expect(html).not.toContain('internal');
  });
  it('carga movimientos guardados y encuentros usando endpoints existentes', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      return new Response(
        JSON.stringify(
          url.endsWith('/slots')
            ? { slots, movements: [] }
            : { encounters: [] },
        ),
      );
    });
    const c: any = { id: 100, stages: [{ id: 200, stageType: 'KNOCKOUT' }] };
    const d = await loadPromotion(c);
    expect(d.slots).toHaveLength(4);
    expect(urls).toEqual([
      '/api/competition-engine/competitions/100/promotion/slots',
      '/api/competition-engine/stages/200/knockout',
    ]);
  });
});

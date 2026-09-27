import { cupApi, type CupCompetition, type Encounter } from './cup-ab-api';
export type PromotionPerson = { id: string; name: string };
export type PromotionSlot = {
  slotCode: string;
  slotName: string;
  source: { competitionCode: string; position: number } | null;
  proposedUser: PromotionPerson | null;
  confirmedUser: PromotionPerson | null;
  confirmedEntryId: number | null;
  status: string;
  replacementReason: string | null;
};
export type PromotionChoice = {
  slotCode: string;
  userId: string;
  reason: string;
};
export type PromotionMovement = {
  id: number;
  userId: string;
  fullName: string;
  fromDivision: string | null;
  toDivision: string;
  status: string;
  reason: string;
};
export function promotionChoices(slots: PromotionSlot[]): PromotionChoice[] {
  return slots.map((s) => ({
    slotCode: s.slotCode,
    userId: s.confirmedUser?.id ?? s.proposedUser?.id ?? '',
    reason: s.replacementReason ?? '',
  }));
}
export function promotionErrors(
  slots: PromotionSlot[],
  choices: PromotionChoice[],
  eligible: PromotionPerson[],
) {
  const errors: string[] = [];
  if (slots.length !== 4 || choices.length !== 4)
    errors.push('Generá los cuatro cupos.');
  const ids = choices.map((c) => c.userId);
  for (const s of slots) {
    const c = choices.find((c) => c.slotCode === s.slotCode);
    if (!c?.userId || !eligible.some((p) => p.id === c.userId))
      errors.push(
        `${s.slotName}: elegí un participante activo de la temporada.`,
      );
    else if (ids.filter((id) => id === c.userId).length > 1)
      errors.push(`${s.slotName}: participante duplicado.`);
    if (
      c?.userId &&
      (c.userId !== s.proposedUser?.id ||
        (!!s.confirmedUser && c.userId !== s.confirmedUser.id)) &&
      !c.reason.trim()
    )
      errors.push(`${s.slotName}: indicá el motivo del cambio.`);
  }
  return errors;
}
export function promotionPreview(encounters: Encounter[]) {
  if (
    encounters.length !== 2 ||
    new Set(encounters.map((e) => e.slotKey)).size !== 2 ||
    encounters.some(
      (e) =>
        !['PROMO-1', 'PROMO-2'].includes(e.slotKey) ||
        !e.entryA ||
        !e.entryB ||
        e.status !== 'finished' ||
        !e.adminConfirmedAt ||
        !e.winner ||
        ![e.entryA?.id, e.entryB?.id].includes(e.winner.id),
    ) ||
    !encounters[0].round ||
    encounters[0].round.id !== encounters[1].round?.id
  )
    return [];
  return encounters.flatMap((e) => [
    { name: e.winner!.name, toDivision: 'A', result: 'Ganador' },
    {
      name: (e.entryA?.id === e.winner!.id ? e.entryB : e.entryA)!.name,
      toDivision: 'B',
      result: 'Perdedor',
    },
  ]);
}
export async function loadPromotion(c: CupCompetition) {
  const [slots, ...stages] = await Promise.all([
    cupApi<{ slots: PromotionSlot[]; movements: PromotionMovement[] }>(
      `/api/competition-engine/competitions/${c.id}/promotion/slots`,
    ),
    ...c.stages
      .filter((s) => s.stageType === 'KNOCKOUT')
      .map(async (s) => ({
        stageId: s.id,
        ...(await cupApi<{ encounters: Encounter[] }>(
          `/api/competition-engine/stages/${s.id}/knockout`,
        )),
      })),
  ]);
  return { ...slots, stages, encounters: stages.flatMap((s) => s.encounters) };
}

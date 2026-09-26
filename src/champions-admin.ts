import { cupApi, type Encounter } from './cup-ab-api';
export type Person = { id: string; name: string };
export type ChampionSlot = {
  slotCode: string;
  slotName: string;
  source: { previousSeasonNumber: number; competitionCode: string } | null;
  proposedUser: Person | null;
  confirmedUser: Person | null;
  confirmedEntryId: number | null;
  status: string;
  replacementReason: string | null;
};
export type SlotChoice = { slotCode: string; userId: string; reason: string };
export type ChampionNode = {
  code: string;
  label: string;
  branch: string;
  sequence: number;
  readyToActivate: boolean;
  stageId: number | null;
  sourceA: {
    ready: boolean;
    entryId: number | null;
    displayName: string | null;
    source: string;
  };
  sourceB: ChampionNode['sourceA'];
  encounter: { id: number } | null;
};
export function initialChoices(slots: ChampionSlot[]): SlotChoice[] {
  return slots.map((s) => ({
    slotCode: s.slotCode,
    userId: s.confirmedUser?.id ?? s.proposedUser?.id ?? '',
    reason: s.replacementReason ?? '',
  }));
}
export function choiceErrors(
  slots: ChampionSlot[],
  choices: SlotChoice[],
  eligible: Person[],
) {
  const errors: string[] = [];
  const ids = choices.map((c) => c.userId);
  if (slots.length !== 14 || choices.length !== 14)
    errors.push('Primero generá los 14 cupos.');
  for (const s of slots) {
    const c = choices.find((c) => c.slotCode === s.slotCode);
    if (!c?.userId) errors.push(`${s.slotName}: vacante.`);
    else if (!eligible.some((p) => p.id === c.userId))
      errors.push(`${s.slotName}: participante no elegible.`);
    else if (ids.filter((id) => id === c.userId).length > 1)
      errors.push(`${s.slotName}: participante duplicado.`);
    if (c?.userId && c.userId !== s.proposedUser?.id && !c.reason.trim())
      errors.push(`${s.slotName}: indicá el motivo del reemplazo o vacante.`);
  }
  return errors;
}
export async function loadChampions(id: number) {
  const base = `/api/competition-engine/competitions/${id}/champions`;
  const [s, b] = await Promise.all([
    cupApi<{ slots: ChampionSlot[] }>(base + '/slots'),
    cupApi<{ bracket: ChampionNode[] }>(base + '/bracket'),
  ]);
  const stages = [
    ...new Set(
      b.bracket.flatMap((n) => (n.stageId === null ? [] : [n.stageId])),
    ),
  ];
  const results = await Promise.all(
    stages.map((stage) =>
      cupApi<{ encounters: Encounter[] }>(
        `/api/competition-engine/stages/${stage}/knockout`,
      ),
    ),
  );
  // Knockout refresh may invalidate a winner; read sources after refreshing all active stages.
  const refreshed = stages.length
    ? await cupApi<{ bracket: ChampionNode[] }>(base + '/bracket')
    : b;
  return {
    slots: s.slots,
    nodes: refreshed.bracket,
    encounters: results.flatMap((r) => r.encounters),
  };
}

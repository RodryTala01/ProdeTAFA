import { cupApi, type CupCompetition, type Encounter } from './cup-ab-api';
export type PapaPerson = {
  id: string;
  name: string;
  previousDivision?: string | null;
  previousPosition?: number | null;
};
export type PapaPair = { userAId: string; userBId: string | null };
export type PapaProposal = {
  previousSeasonNumber: number;
  previousSeasonFound: boolean;
  participantCount: number;
  bracketSize: number;
  byesNeeded: number;
  recommendedStart: string;
  proposedPairs: { userA: PapaPerson; userB: PapaPerson }[];
  unpaired: PapaPerson[];
  initial: {
    stageId: number | null;
    roundLinkId: number | null;
    editable: boolean;
    hasEncounters: boolean;
    pairs: PapaPair[];
  };
};
export function papaEligible(p: PapaProposal) {
  return [
    ...new Map(
      [
        ...p.proposedPairs.flatMap((x) => [x.userA, x.userB]),
        ...p.unpaired,
      ].map((x) => [x.id, x]),
    ).values(),
  ];
}
export function papaPairErrors(pairs: PapaPair[], people: PapaPerson[]) {
  const ids = pairs.flatMap((p) =>
    p.userBId ? [p.userAId, p.userBId] : [p.userAId],
  );
  const errors: string[] = [];
  if (!pairs.length) errors.push('Cargá al menos un cruce.');
  if (ids.some((id) => !people.some((p) => p.id === id)))
    errors.push('Elegí participantes válidos en todos los cruces.');
  if (new Set(ids).size !== ids.length)
    errors.push('Cada participante debe aparecer una sola vez.');
  const missing = people.filter((p) => !ids.includes(p.id));
  if (missing.length)
    errors.push('Faltan: ' + missing.map((p) => p.name).join(', '));
  return errors;
}
export function papaReady(encounters: Encounter[]) {
  return (
    encounters.length >= 2 &&
    encounters.every(
      (e) => e.status === 'finished' && e.adminConfirmedAt && e.winner,
    )
  );
}
export function papaLosers(encounters: Encounter[]) {
  return encounters.flatMap((e) =>
    [e.entryA, e.entryB].filter((p) => p && p.id !== e.winner?.id),
  );
}
export async function loadPapa(c: CupCompetition) {
  const [proposal, ...stages] = await Promise.all([
    cupApi<PapaProposal>(
      `/api/competition-engine/competitions/${c.id}/papa/seeding-proposal`,
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
  return { proposal, stages };
}

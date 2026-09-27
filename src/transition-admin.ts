import { cupApi, cupAdmin } from './cup-ab-api';
export type TransitionAssignment = {
  userId: string;
  fullName: string;
  isActive: boolean;
  fromDivisionCode: string;
  proposedDivisionCode: string;
  confirmedDivisionCode: string | null;
  proposalSource: string;
  proposalReason: string | null;
  requiresReview: boolean;
  confirmationReason: string | null;
};
export type TransitionIssue = {
  code: string;
  message: string;
  userIds?: string[];
};
export type TransitionTarget = {
  id: number;
  seasonNumber: number;
  status: string;
};
export type TransitionPlan = {
  id: number;
  sourceSeasonId: number;
  sourceSeasonNumber: number;
  targetSeasonNumber: number;
  status: string;
  issues: TransitionIssue[];
  applicationBlockers: TransitionIssue[];
  targetSeason: TransitionTarget | null;
  assignments: TransitionAssignment[];
};
export type TransitionChoice = {
  userId: string;
  divisionCode: string;
  reason: string;
};
export function transitionChoices(plan: TransitionPlan): TransitionChoice[] {
  return plan.assignments.map((a) => ({
    userId: a.userId,
    divisionCode: a.confirmedDivisionCode ?? a.proposedDivisionCode,
    reason: a.confirmationReason ?? '',
  }));
}
export function transitionErrors(
  plan: TransitionPlan,
  choices: TransitionChoice[],
) {
  const errors: string[] = [];
  if (
    choices.length !== plan.assignments.length ||
    new Set(choices.map((c) => c.userId)).size !== choices.length
  )
    errors.push('Incluí exactamente a todos los participantes del plan.');
  for (const a of plan.assignments) {
    const c = choices.find((c) => c.userId === a.userId);
    if (!c || !['A', 'B'].includes(c.divisionCode))
      errors.push(`${a.fullName}: elegí destino A/B.`);
    else if (
      (a.requiresReview || c.divisionCode !== a.proposedDivisionCode) &&
      !c.reason.trim()
    )
      errors.push(`${a.fullName}: indicá el motivo de la revisión/cambio.`);
  }
  return errors;
}
export const transitionOrigin = (source: string) =>
  source
    .split('+')
    .map(
      (s) =>
        (
          ({
            LEAGUE_STAY: 'Permanencia por Liga',
            LEAGUE_DIRECT_RELEGATION: 'Descenso directo por Liga',
            LEAGUE_DIRECT_PROMOTION: 'Ascenso directo por Liga',
            PROMOTION_RESULT: 'Resultado de Promoción',
            COPA_A_GUARANTEE_OVERRIDE: 'Permanencia por Copa A con corrimiento',
            COPA_B_GUARANTEE_OVERRIDE: 'Ascenso por Copa B con corrimiento',
            COPA_A_GUARANTEE: 'Garantía Copa A',
            COPA_B_GUARANTEE: 'Garantía Copa B',
          }) as Record<string, string>
        )[s] ?? s.replaceAll('_', ' '),
    )
    .join(' + ');
export const transitionApi = {
  load: (seasonId: number) =>
    cupApi<{ plan: TransitionPlan | null }>(
      `${cupAdmin}/seasons/${seasonId}/transition-plan`,
    ),
  generate: (seasonId: number) =>
    cupApi<{ plan: TransitionPlan }>(
      `${cupAdmin}/seasons/${seasonId}/transition-plan`,
      'POST',
      {},
    ),
  confirm: (id: number, assignments: TransitionChoice[]) =>
    cupApi<{ plan: TransitionPlan }>(
      `${cupAdmin}/transition-plans/${id}/confirm`,
      'PUT',
      { assignments },
    ),
  apply: (id: number) =>
    cupApi<{ plan: TransitionPlan; targetSeason: TransitionTarget }>(
      `${cupAdmin}/transition-plans/${id}/apply`,
      'POST',
      {},
    ),
};

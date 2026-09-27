import { cupApi, type CupCompetition } from './cup-ab-api';
export const resultLabels: Record<string, string> = {
  CHAMPION: 'Campeón',
  RUNNER_UP: 'Subcampeón',
  THIRD: 'Tercero',
  SEMIFINAL: 'Semifinal',
  QUARTERFINAL: 'Cuartos',
  ROUND_OF_16: 'Octavos',
  ROUND_OF_32: '16avos',
  ROUND_OF_64: '32avos',
  GROUP_STAGE: 'Grupos',
  PHASE_5: 'Fase 5',
  PHASE_4: 'Fase 4',
  PHASE_3: 'Fase 3',
  PHASE_2: 'Fase 2',
  ELIMINATED: 'Eliminado (sin aporte de fase)',
  POSITION: 'Posición final',
};
export type ResultRow = {
  entryId: number;
  stageId: number | null;
  resultCode: string;
  finalPosition: number | null;
  detail: Record<string, unknown>;
  confirmedAt?: string;
  confirmedBy?: string;
};
export type ResultEntry = {
  entryId: number;
  entryName: string;
  entryType: string;
  members: {
    userId: string;
    fullName: string;
    validFrom: number | null;
    validTo: number | null;
  }[];
};
export type ResultEvidence = {
  results: ResultRow[];
  entries: ResultEntry[];
  encounters: {
    id: number;
    stageId: number;
    stageCode: string;
    sequence: number;
    slotKey: string;
    entryAId: number;
    entryBId: number | null;
    winnerId: number | null;
    status: string;
    confirmedAt: string | null;
  }[];
  survival: {
    entryId: number;
    stageId: number;
    sequence: number;
    decision: string;
  }[];
  groups: { entryId: number; stageId: number }[];
};
export function resultCodes(code: string) {
  if (code.startsWith('LIGA_')) return ['POSITION'];
  if (code === 'COPA_DUOS')
    return [
      'CHAMPION',
      'RUNNER_UP',
      'PHASE_5',
      'PHASE_4',
      'PHASE_3',
      'PHASE_2',
      'ELIMINATED',
    ];
  return [
    'CHAMPION',
    'RUNNER_UP',
    ...(['COPA_TOTAL', 'COPA_PAPA'].includes(code) ? ['THIRD'] : []),
    'SEMIFINAL',
    'QUARTERFINAL',
    'ROUND_OF_16',
    ...(['COPA_PAPA', 'COPA_CAMPEONES'].includes(code)
      ? ['ROUND_OF_32', 'ROUND_OF_64']
      : []),
    ...(['COPA_A', 'COPA_B', 'COPA_TOTAL'].includes(code)
      ? ['GROUP_STAGE']
      : []),
  ];
}
export function suggestResults(
  c: CupCompetition,
  d: ResultEvidence,
  stageCodes: Record<number, string>,
  league?: {
    standings: { userId: string; position: number }[];
    provisional: boolean;
    linkedRounds: { status: string }[];
  },
) {
  const rows: ResultRow[] = d.entries.map((e) => ({
    entryId: e.entryId,
    stageId: null,
    resultCode: '',
    finalPosition: null,
    detail: {},
  }));
  const set = (
    id: number | null,
    code: string,
    stageId: number,
    position: number | null = null,
  ) => {
    const row = rows.find((r) => r.entryId === id);
    if (row && resultCodes(c.code).includes(code))
      Object.assign(row, {
        resultCode: code,
        stageId,
        finalPosition: position,
      });
  };
  for (const g of d.groups) set(g.entryId, 'GROUP_STAGE', g.stageId);
  for (const s of d.survival)
    if (s.decision === 'ELIMINATED')
      set(
        s.entryId,
        s.sequence >= 2 && s.sequence <= 5
          ? `PHASE_${s.sequence}`
          : 'ELIMINATED',
        s.stageId,
      );
  if (
    league &&
    !league.provisional &&
    league.linkedRounds.length === 5 &&
    league.linkedRounds.every((r) => r.status === 'finished')
  )
    for (const e of d.entries) {
      const p = league.standings.find((p) =>
        e.members.some((m) => m.userId === p.userId),
      );
      if (p)
        set(
          e.entryId,
          'POSITION',
          c.stages.find((s) => s.stageType === 'LEAGUE_TABLE')?.id ?? 0,
          p.position,
        );
    }
  for (const e of d.encounters) {
    if (
      e.status !== 'finished' ||
      !e.confirmedAt ||
      !e.winnerId ||
      ![e.entryAId, e.entryBId].includes(e.winnerId)
    )
      continue;
    const phase = stageCodes[e.stageId];
    const loser = e.winnerId === e.entryAId ? e.entryBId : e.entryAId;
    if (phase === 'FINAL') {
      set(e.winnerId, 'CHAMPION', e.stageId, 1);
      set(loser, 'RUNNER_UP', e.stageId, 2);
    } else if (phase === 'THIRD') {
      set(e.winnerId, 'THIRD', e.stageId, 3);
      set(loser, 'SEMIFINAL', e.stageId, 4);
    } else if (phase) set(loser, phase, e.stageId);
  }
  return rows;
}
export function resultErrors(
  c: CupCompetition,
  d: ResultEvidence,
  rows: ResultRow[],
) {
  const errors: string[] = [];
  if (
    !rows.length ||
    rows.length !== d.entries.length ||
    new Set(rows.map((r) => r.entryId)).size !== d.entries.length
  )
    errors.push('Falta el snapshot completo.');
  if (
    d.encounters.some(
      (e) => e.status !== 'finished' || !e.confirmedAt || !e.winnerId,
    )
  )
    errors.push('Hay encuentros sin ganador confirmado.');
  for (const e of d.entries) {
    const r = rows.find((r) => r.entryId === e.entryId);
    if (!r || !resultCodes(c.code).includes(r.resultCode))
      errors.push(`${e.entryName}: indicá el resultado/fase.`);
    if (c.code.startsWith('LIGA_') && !r?.finalPosition)
      errors.push(`${e.entryName}: falta posición final.`);
    if (
      e.entryType === 'DUO' &&
      new Set(e.members.map((m) => m.userId)).size > 2
    ) {
      const chosen = r?.detail?.iffhsUserIds;
      if (
        !Array.isArray(chosen) ||
        !chosen.length ||
        chosen.some((id) => !e.members.some((m) => m.userId === id))
      )
        errors.push(`${e.entryName}: elegí destinatarios IFFHS.`);
    }
  }
  for (const code of ['CHAMPION', 'RUNNER_UP', 'THIRD'])
    if (rows.filter((r) => r.resultCode === code).length > 1)
      errors.push(`Hay más de un ${resultLabels[code].toLowerCase()}.`);
  const positions = rows.map((r) => r.finalPosition).filter((p) => p != null);
  if (
    positions.some((p) => !Number.isInteger(p) || p! <= 0) ||
    new Set(positions).size !== positions.length
  )
    errors.push('Las posiciones deben ser enteros positivos sin duplicados.');
  return errors;
}
export async function loadResultEvidence(c: CupCompetition) {
  return cupApi<ResultEvidence>(
    `/api/competition-engine/competitions/${c.id}/results`,
  );
}
export function initialStageCodes(c: CupCompetition) {
  const aliases: Record<string, string> = {
    FINAL: 'FINAL',
    F: 'FINAL',
    THIRD: 'THIRD',
    THIRD_PLACE: 'THIRD',
    SF: 'SEMIFINAL',
    SEMIFINAL: 'SEMIFINAL',
    QF: 'QUARTERFINAL',
    QUARTERFINAL: 'QUARTERFINAL',
    R16: 'ROUND_OF_16',
    ROUND_OF_16: 'ROUND_OF_16',
    R32: 'ROUND_OF_32',
    R64: 'ROUND_OF_64',
  };
  return Object.fromEntries(
    c.stages.map((s) => [
      s.id,
      aliases[(s as typeof s & { code?: string }).code ?? ''] ?? '',
    ]),
  );
}

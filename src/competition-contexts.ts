export type ContextBase = {
  id: string;
  competition: {
    id: number;
    code: string;
    displayName: string;
    family: string;
  };
  stage: { id: number; code: string; name: string; stageType: string } | null;
  roundLink: {
    id: number;
    sequence: number;
    purpose: string;
    label: string | null;
  } | null;
};
export type ContextOpponent = { entryId: number; name: string };
export type CompetitionContext = ContextBase &
  (
    | { kind: 'LEAGUE'; division: { id: number; code: string; name: string } }
    | {
        kind: 'ACCUMULATIVE_GROUP';
        entryId: number;
        group: { id: number; code: string; name: string };
      }
    | {
        kind: 'TOTAL_GROUP';
        entryId: number;
        group: { id: number; code: string; name: string };
        miniFixtures: {
          encounterId: number;
          segmentId: number;
          miniDay: number;
          opponentEntryId: number;
          opponentName: string;
          scoreSelf: number;
          scoreOpponent: number;
          complete: boolean;
        }[];
      }
    | {
        kind: 'DUO_SURVIVAL';
        entryId: number;
        duoName: string;
        partner: { userId: string; fullName: string } | null;
        bonusPoints: number;
      }
    | {
        kind: 'KNOCKOUT';
        entryId: number;
        partner?: { userId: string; fullName: string } | null;
        encounter: {
          id: number;
          slotKey: string;
          opponentEntryId: number | null;
          opponentName: string | null;
          scoreSelf: number | null;
          scoreOpponent: number | null;
          status: string;
          winnerEntryId: number | null;
          resolution: string | null;
          adminConfirmedAt: string | null;
        };
        championNode?: { code: string; label: string; branch: string };
      }
    | {
        kind: 'TIEBREAK';
        entryId: number;
        tiebreak: {
          id: number;
          status: string;
          originalEncounterId: number | null;
          sequence: number;
          winnerEntryId: number | null;
          opponents: ContextOpponent[];
        };
      }
  );
export type RoundContexts = {
  round: { id: number; name: string; status: string; category: string };
  contexts: CompetitionContext[];
};
export function contextLabel(c: CompetitionContext): string {
  const name = c.competition.displayName;
  switch (c.kind) {
    case 'LEAGUE':
      return `${name} · Fecha ${c.roundLink?.sequence}`;
    case 'ACCUMULATIVE_GROUP':
      return `${name} · ${c.group.name} · Fecha ${c.roundLink?.sequence}`;
    case 'TOTAL_GROUP':
      return `${name} · ${c.group.name}`;
    case 'DUO_SURVIVAL':
      return `${name} · ${c.stage?.name} · Fecha ${c.roundLink?.sequence}${c.partner ? ` · con ${c.partner.fullName}` : ''} · bonus ${c.bonusPoints}`;
    case 'KNOCKOUT':
      return `${name} · ${c.stage?.name ?? 'Eliminatoria'}${c.partner ? ` · con ${c.partner.fullName}` : ''} · ${c.encounter.opponentName ? `vs ${c.encounter.opponentName}` : 'Pase libre'}${c.championNode ? ` · ${c.championNode.label}` : ''}`;
    case 'TIEBREAK':
      return `Desempate ${name} · ${c.tiebreak.opponents.length ? 'vs ' + c.tiebreak.opponents.map((o) => o.name).join(' / ') : 'Pendiente de rivales'}`;
  }
}

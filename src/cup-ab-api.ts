export const cupAdmin = "/api/admin/competition-engine";
export async function cupApi<T>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data as T;
}
export type CupStage = {
  id: number;
  name: string;
  stageType: string;
  sequence: number;
  status: string;
};
export type CupLink = {
  id: number;
  stageId: number;
  roundId: number;
  roundName: string;
  roundStatus: string;
  purpose: string;
  sequence: number;
};
export type CupRound = {
  id: number;
  name: string;
  status: string;
  category: string;
};
export type CupCompetition = {
  id: number;
  code: string;
  displayName: string;
  status: string;
  divisionCode: string | null;
  stages: CupStage[];
  roundLinks: CupLink[];
};
export type Entry = {
  entryId: number;
  displayName: string;
  position?: number;
  groupCode?: string;
};
export type Encounter = {
  id: number;
  slotKey: string;
  entryA: { id: number; name: string } | null;
  entryB: { id: number; name: string } | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: { id: number; name: string } | null;
  status: string;
  resolution: string | null;
  adminConfirmedAt: string | null;
  round: { id: number; name: string; status: string } | null;
};

export const STAGE_OPTIONS = [
  { value: 'LEAGUE_TABLE', label: 'Tabla de Liga' },
  { value: 'ACCUMULATIVE_GROUPS', label: 'Grupos acumulativos' },
  { value: 'ROUND_ROBIN_GROUPS', label: 'Grupos con enfrentamientos' },
  { value: 'SURVIVAL_TABLE', label: 'Tabla eliminatoria' },
  { value: 'KNOCKOUT', label: 'Eliminación directa' },
] as const;
export type StageType = typeof STAGE_OPTIONS[number]['value'];
export function stageTypeLabel(value: string) {
  return STAGE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
export function statusLabel(value: string) {
  return ({ draft: 'Borrador', active: 'Activa', finished: 'Finalizada', archived: 'Archivada', open: 'Abierta' } as Record<string, string>)[value] ?? value;
}
export function initialSeasonId(seasons: { id: number; status: string }[]) {
  return seasons.find((season) => season.status === 'active')?.id ?? seasons[0]?.id ?? null;
}

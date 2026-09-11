export function publicationPolicy(
  status: string,
  matchCount: number,
  hasOtherOpenRound: boolean,
) {
  if (status === 'open') return { ok: true as const, alreadyOpen: true as const };
  if (status !== 'draft') return { ok: false as const, status: 409, error: 'Esta fecha ya no puede publicarse' };
  if (matchCount !== 12) {
    return { ok: false as const, status: 409, error: 'La fecha debe tener exactamente 12 partidos para publicarse' };
  }
  if (hasOtherOpenRound) {
    return {
      ok: false as const,
      status: 409,
      error: 'Ya hay otra fecha publicada. Cerrala antes de publicar una nueva',
    };
  }
  return { ok: true as const, alreadyOpen: false as const };
}

export function participantPasswordResetPolicy(role: string) {
  if (role !== 'participant') {
    return {
      ok: false as const,
      status: 409,
      error: 'Este endpoint sólo permite cambiar la contraseña de participantes',
    };
  }
  return { ok: true as const };
}

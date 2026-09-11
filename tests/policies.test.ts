import { describe, expect, it } from 'vitest';
import { participantPasswordResetPolicy, publicationPolicy } from '../worker/policies';

describe('publicationPolicy', () => {
  it('allows an already-open round idempotently', () => {
    expect(publicationPolicy('open', 12, true)).toEqual({ ok: true, alreadyOpen: true });
  });

  it('requires exactly 12 matches', () => {
    expect(publicationPolicy('draft', 11, false)).toMatchObject({
      ok: false,
      status: 409,
      error: 'La fecha debe tener exactamente 12 partidos para publicarse',
    });
  });

  it('blocks publishing while another round is open', () => {
    expect(publicationPolicy('draft', 12, true)).toMatchObject({
      ok: false,
      status: 409,
      error: 'Ya hay otra fecha publicada. Cerrala antes de publicar una nueva',
    });
  });

  it('allows a complete draft when no other round is open', () => {
    expect(publicationPolicy('draft', 12, false)).toEqual({ ok: true, alreadyOpen: false });
  });
});

describe('participantPasswordResetPolicy', () => {
  it('allows participant password resets', () => {
    expect(participantPasswordResetPolicy('participant')).toEqual({ ok: true });
  });

  it('does not allow the participant endpoint to reset an admin password', () => {
    expect(participantPasswordResetPolicy('admin')).toMatchObject({
      ok: false,
      status: 409,
    });
  });
});

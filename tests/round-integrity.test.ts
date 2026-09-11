import { describe, expect, it } from 'vitest';
import { protectPublishedRoundMatches } from '../worker/entry';
import type { Env } from '../worker/index';

function envWithRoundStatus(status: string | null): Env {
  const DB = {
    prepare: () => ({
      bind: () => ({
        first: async () => status ? { status } : null,
      }),
    }),
  };
  return { DB } as unknown as Env;
}

describe('published round integrity', () => {
  it('allows adding matches while the round is still a draft', async () => {
    const request = new Request('https://prode.test/api/admin/rounds/7/matches', { method: 'POST' });
    expect(await protectPublishedRoundMatches(request, envWithRoundStatus('draft'))).toBeNull();
  });

  it('blocks adding matches after the round is published', async () => {
    const request = new Request('https://prode.test/api/admin/rounds/7/matches', { method: 'POST' });
    const response = await protectPublishedRoundMatches(request, envWithRoundStatus('open'));
    expect(response?.status).toBe(409);
    await expect(response?.json()).resolves.toMatchObject({
      error: 'Una fecha publicada o finalizada ya no puede cambiar sus partidos',
    });
  });

  it('blocks removing matches from a finished round', async () => {
    const request = new Request('https://prode.test/api/admin/rounds/7/matches/23', { method: 'DELETE' });
    const response = await protectPublishedRoundMatches(request, envWithRoundStatus('finished'));
    expect(response?.status).toBe(409);
  });

  it('does not interfere with unrelated API routes', async () => {
    const request = new Request('https://prode.test/api/admin/users', { method: 'POST' });
    expect(await protectPublishedRoundMatches(request, envWithRoundStatus('open'))).toBeNull();
  });
});

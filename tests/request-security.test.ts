import { describe, expect, it } from 'vitest';
import { mutationAllowed } from '../worker/entry';

function request(method: string, headers: Record<string, string> = {}) {
  return new Request('https://prode-tafa.example/api/test', { method, headers });
}

describe('mutationAllowed', () => {
  it('allows safe methods', () => {
    expect(mutationAllowed(request('GET', { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }))).toBe(true);
    expect(mutationAllowed(request('HEAD', { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }))).toBe(true);
  });

  it('allows same-origin API mutations', () => {
    expect(mutationAllowed(request('POST', {
      origin: 'https://prode-tafa.example',
      'sec-fetch-site': 'same-origin',
    }))).toBe(true);
  });

  it('rejects a different Origin', () => {
    expect(mutationAllowed(request('POST', {
      origin: 'https://evil.example',
      'sec-fetch-site': 'cross-site',
    }))).toBe(false);
  });

  it('rejects cross-site browser mutations even without Origin', () => {
    expect(mutationAllowed(request('DELETE', { 'sec-fetch-site': 'cross-site' }))).toBe(false);
  });

  it('allows non-browser tools without Origin metadata', () => {
    expect(mutationAllowed(request('PUT'))).toBe(true);
  });
});

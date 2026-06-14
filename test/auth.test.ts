import { describe, expect, it } from 'vitest';
import { requireAuth } from '../src/server/auth';

const env = {
  QUOTA_API_TOKEN: 'test-token',
};

function request(headers: HeadersInit = {}): Request {
  return new Request('https://quota.test/api/quotes', {
    headers,
  });
}

describe('requireAuth', () => {
  it('rejects requests without Authorization', () => {
    expect(requireAuth(request(), env)).toBe(false);
  });

  it('rejects requests with the wrong bearer token', () => {
    expect(requireAuth(request({ Authorization: 'Bearer wrong' }), env)).toBe(false);
  });

  it('accepts requests with the configured bearer token', () => {
    expect(requireAuth(request({ Authorization: 'Bearer test-token' }), env)).toBe(true);
  });

  it('accepts requests that already passed Cloudflare Access', () => {
    expect(requireAuth(request({ 'Cf-Access-Jwt-Assertion': 'jwt' }), env)).toBe(true);
  });
});

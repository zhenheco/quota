import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';

describe('workers test pool', () => {
  it('provides configured Cloudflare bindings', () => {
    expect(env.DB).toBeDefined();
    expect(env.FILES).toBeDefined();
  });

  it('runs ordinary assertions inside vitest', () => {
    expect(1 + 1).toBe(2);
  });
});

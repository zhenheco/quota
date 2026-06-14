import { describe, expect, it } from 'vitest';
import { GET as health } from '../src/pages/api/health';
import { context, json } from './helpers';

describe('health API route', () => {
  it('returns ok without authentication', async () => {
    const response = await health(context('/api/health'));
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });
});

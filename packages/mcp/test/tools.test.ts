import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../src/api-client';

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts quotes with bearer auth and a JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        id: 12,
        quote_no: '20260614-01',
        view_url: '/q/12',
        xlsx_url: '/api/quotes/12/xlsx',
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient({ baseUrl: 'https://quota.example.workers.dev/', token: 'machine-token' });
    const result = await client.postQuote({
      client_name: 'Acme',
      quote_date: '2026-06-14',
      tax_rate: 0.05,
      items: [{ name: 'Strategy', qty: 1, unit_price: 1000 }],
    });

    expect(fetchMock).toHaveBeenCalledWith('https://quota.example.workers.dev/api/quotes', {
      method: 'POST',
      headers: {
        authorization: 'Bearer machine-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        client_name: 'Acme',
        quote_date: '2026-06-14',
        tax_rate: 0.05,
        items: [{ name: 'Strategy', qty: 1, unit_price: 1000 }],
      }),
    });
    expect(result).toEqual({
      id: 12,
      quote_no: '20260614-01',
      view_url: '/q/12',
      xlsx_url: '/api/quotes/12/xlsx',
    });
  });

  it('throws an error containing the status for non-2xx responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Unauthorized' }, { status: 401 })));

    const client = createApiClient({ baseUrl: 'https://quota.example.workers.dev', token: 'bad-token' });

    await expect(
      client.postQuote({
        client_name: 'Acme',
        quote_date: '2026-06-14',
        tax_rate: 0.05,
        items: [{ name: 'Strategy', qty: 1, unit_price: 1000 }],
      })
    ).rejects.toThrow('Quota API request failed with status 401: Unauthorized');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../src/api-client';
import { readConfig } from '../src/index';
import { createQuotaTools } from '../src/tools';

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

describe('server config', () => {
  it('requires QUOTA_API_URL and QUOTA_API_TOKEN', () => {
    expect(() => readConfig({ QUOTA_API_TOKEN: 'token' })).toThrow('QUOTA_API_URL is required');
    expect(() => readConfig({ QUOTA_API_URL: 'https://quota.example.workers.dev' })).toThrow('QUOTA_API_TOKEN is required');
  });

  it('reads API config from env', () => {
    expect(
      readConfig({
        QUOTA_API_URL: 'https://quota.example.workers.dev',
        QUOTA_API_TOKEN: 'token',
      })
    ).toEqual({
      baseUrl: 'https://quota.example.workers.dev',
      token: 'token',
    });
  });
});

describe('create_quote tool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses company default tax rate and matches an existing client by exact name', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          company: {
            id: 1,
            name: 'Quota Co',
            address: null,
            phone: null,
            bank_info: null,
            default_tax_rate: 0.05,
            default_notes: 'Default transfer note',
            logo_key: null,
            stamp_key: null,
            bank_image_key: null,
          },
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          clients: [
            {
              id: 7,
              name: 'Acme',
              contact: 'Amy',
              phone: '0912-345-678',
              email: null,
              address: null,
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          id: 12,
          quote_no: '20260614-01',
          view_url: '/q/12',
          xlsx_url: '/api/quotes/12/xlsx',
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const api = createApiClient({ baseUrl: 'https://quota.example.workers.dev', token: 'machine-token' });
    const result = await createQuotaTools(api).create_quote.handler({
      client: 'Acme',
      subject: 'Strategy',
      quote_date: '2026-06-14',
      items: [{ name: 'Planning', qty: 2, unit: 'hr', unit_price: 1000 }],
    });

    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toMatchObject({
      client_id: 7,
      client_name: 'Acme',
      client_contact: 'Amy',
      client_phone: '0912-345-678',
      subject: 'Strategy',
      quote_date: '2026-06-14',
      tax_rate: 0.05,
      notes: 'Default transfer note',
      created_via: 'chat',
      items: [{ name: 'Planning', qty: 2, unit: 'hr', unit_price: 1000 }],
    });
    expect(result.content[0]?.text).toContain('20260614-01');
    expect(result.content[0]?.text).toContain('https://quota.example.workers.dev/q/12');
    expect(result.content[0]?.text).toContain('https://quota.example.workers.dev/api/quotes/12/xlsx');
  });

  it('sends a client snapshot without client_id when no existing client matches', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          company: {
            id: 1,
            name: 'Quota Co',
            address: null,
            phone: null,
            bank_info: null,
            default_tax_rate: 0.05,
            default_notes: null,
            logo_key: null,
            stamp_key: null,
            bank_image_key: null,
          },
        })
      )
      .mockResolvedValueOnce(Response.json({ clients: [{ id: 7, name: 'Acme', contact: null, phone: null }] }))
      .mockResolvedValueOnce(
        Response.json({
          id: 13,
          quote_no: '20260614-02',
          view_url: 'https://quota.example.workers.dev/q/13',
          xlsx_url: 'https://quota.example.workers.dev/api/quotes/13/xlsx',
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const api = createApiClient({ baseUrl: 'https://quota.example.workers.dev', token: 'machine-token' });
    await createQuotaTools(api).create_quote.handler({
      client: 'New Co',
      subject: 'Website',
      quote_date: '2026-06-14',
      tax_rate: 0.08,
      notes: 'Custom note',
      items: [{ name: 'Build', qty: 1, unit_price: 5000 }],
    });

    const body = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body));
    expect(body).toMatchObject({
      client_name: 'New Co',
      subject: 'Website',
      tax_rate: 0.08,
      notes: 'Custom note',
    });
    expect(body).not.toHaveProperty('client_id');
  });
});

describe('read tools', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('list_quotes forwards filters and returns structured quotes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        quotes: [
          {
            id: 12,
            quote_no: '20260614-01',
            status: 'draft',
            client_name: 'Acme',
          },
        ],
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const api = createApiClient({ baseUrl: 'https://quota.example.workers.dev', token: 'machine-token' });
    const result = await createQuotaTools(api).list_quotes.handler({
      status: 'draft',
      client: 'Acme',
      date: '2026-06-14',
    });

    expect(fetchMock).toHaveBeenCalledWith('https://quota.example.workers.dev/api/quotes?status=draft&client=Acme&date=2026-06-14', {
      method: 'GET',
      headers: {
        authorization: 'Bearer machine-token',
      },
    });
    expect(result.structuredContent).toEqual({
      quotes: [
        {
          id: 12,
          quote_no: '20260614-01',
          status: 'draft',
          client_name: 'Acme',
        },
      ],
    });
  });

  it('get_quote reads a quote by id and returns the quote payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        quote: {
          id: 12,
          quote_no: '20260614-01',
          items: [{ name: 'Planning', qty: 2 }],
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const api = createApiClient({ baseUrl: 'https://quota.example.workers.dev', token: 'machine-token' });
    const result = await createQuotaTools(api).get_quote.handler({ id: 12 });

    expect(fetchMock).toHaveBeenCalledWith('https://quota.example.workers.dev/api/quotes/12', {
      method: 'GET',
      headers: {
        authorization: 'Bearer machine-token',
      },
    });
    expect(result.structuredContent).toEqual({
      quote: {
        id: 12,
        quote_no: '20260614-01',
        items: [{ name: 'Planning', qty: 2 }],
      },
    });
  });

  it('list_clients returns the clients payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        clients: [
          {
            id: 7,
            name: 'Acme',
            contact: 'Amy',
            phone: '0912-345-678',
          },
        ],
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const api = createApiClient({ baseUrl: 'https://quota.example.workers.dev', token: 'machine-token' });
    const result = await createQuotaTools(api).list_clients.handler({});

    expect(fetchMock).toHaveBeenCalledWith('https://quota.example.workers.dev/api/clients', {
      method: 'GET',
      headers: {
        authorization: 'Bearer machine-token',
      },
    });
    expect(result.structuredContent).toEqual({
      clients: [
        {
          id: 7,
          name: 'Acme',
          contact: 'Amy',
          phone: '0912-345-678',
        },
      ],
    });
  });
});

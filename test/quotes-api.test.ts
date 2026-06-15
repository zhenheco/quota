import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { DELETE as deleteQuote, GET as getQuote, PUT as updateQuote } from '../src/pages/api/quotes/[id]';
import { POST as regenerateXlsx } from '../src/pages/api/quotes/[id]/regenerate';
import { GET as downloadXlsx } from '../src/pages/api/quotes/[id]/xlsx';
import { GET as listQuotes, POST as createQuote } from '../src/pages/api/quotes/index';
import { GET as publicAsset } from '../src/pages/q/[id]/asset';
import { GET as publicDownloadXlsx } from '../src/pages/q/[id]/download';
import { authHeaders, context, json } from './helpers';

async function resetDb(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM quote_items'),
    env.DB.prepare('DELETE FROM quotes'),
    env.DB.prepare('DELETE FROM clients'),
    env.DB.prepare(
      `UPDATE company_profile
       SET name = '範例客戶', tax_id = '24536806', address = '台北市中山區南京東路一段 1 號',
           phone = '02-1234-5678', contact = '王小姐',
           bank_info = '玉山銀行 808 / 1234-567-890123 / 範例客戶有限公司',
           default_tax_rate = 0.05, default_notes = '匯款後請提供末五碼。',
           logo_key = NULL, stamp_key = NULL, bank_image_key = NULL
       WHERE id = 1`
    ),
  ]);
}

function quotePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    client_name: '安可整合行銷',
    client_contact: '王小姐',
    client_tax_id: '53536206',
    client_phone: '0912-345-678',
    subject: '行銷',
    quote_date: '2026-06-14',
    valid_until: '2026-06-30',
    tax_rate: 0.05,
    notes: '本報價含稅，實際執行細節依雙方確認為準。',
    items: [{ name: '策略規劃', description: '品牌與行銷策略', qty: 2, unit: '式', unit_price: 48000 }],
    ...overrides,
  };
}

async function createValidQuote(): Promise<Record<string, unknown>> {
  const response = await createQuote(
    context('/api/quotes', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(quotePayload()),
    })
  );

  expect(response.status).toBe(201);

  return json(response);
}

describe('quotes API routes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('rejects POST /api/quotes without a token', async () => {
    const response = await createQuote(
      context('/api/quotes', {
        method: 'POST',
        body: JSON.stringify(quotePayload()),
      })
    );

    expect(response.status).toBe(401);
  });

  it('creates a quote, writes xlsx to R2, updates DB xlsx_key, and returns URLs', async () => {
    const body = await createValidQuote();

    expect(body).toMatchObject({
      id: expect.any(Number),
      quote_no: '20260614-01',
      view_url: `/q/${body.id}`,
      xlsx_url: `/api/quotes/${body.id}/xlsx`,
    });

    const key = `quotes/${body.quote_no}/${body.quote_no}.xlsx`;
    const object = await env.FILES.get(key);
    const row = await env.DB.prepare('SELECT xlsx_key FROM quotes WHERE id = ?1')
      .bind(body.id)
      .first<{ xlsx_key: string | null }>();

    expect(object).not.toBeNull();
    expect(row?.xlsx_key).toBe(key);
  });

  it('returns 400 and does not leave a quote row when the company name is blank during creation', async () => {
    await env.FILES.delete('quotes/20260614-01/20260614-01.xlsx');
    await env.DB.prepare("UPDATE company_profile SET name = '' WHERE id = 1").run();

    const response = await createQuote(
      context('/api/quotes', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(quotePayload()),
      })
    );
    const quoteCount = await env.DB.prepare('SELECT COUNT(*) AS count FROM quotes').first<{ count: number }>();
    const itemCount = await env.DB.prepare('SELECT COUNT(*) AS count FROM quote_items').first<{ count: number }>();
    const object = await env.FILES.get('quotes/20260614-01/20260614-01.xlsx');

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toMatch(/company|設定/);
    expect(quoteCount?.count).toBe(0);
    expect(itemCount?.count).toBe(0);
    expect(object).toBeNull();
  });

  it('lists quotes and filters by status', async () => {
    const created = await createValidQuote();

    const allResponse = await listQuotes(context('/api/quotes', { headers: authHeaders() }));
    const allBody = await json(allResponse);

    expect(allResponse.status).toBe(200);
    expect(allBody.quotes).toEqual([
      expect.objectContaining({
        id: created.id,
        quote_no: '20260614-01',
        status: 'draft',
      }),
    ]);

    const filteredResponse = await listQuotes(context('/api/quotes?status=accepted', { headers: authHeaders() }));
    const filteredBody = await json(filteredResponse);

    expect(filteredResponse.status).toBe(200);
    expect(filteredBody.quotes).toEqual([]);
  });

  it('reads, updates totals, deletes, then returns 404 for the deleted quote', async () => {
    const created = await createValidQuote();
    const id = String(created.id);

    const readResponse = await getQuote(context(`/api/quotes/${id}`, { headers: authHeaders() }, { id }));
    const readBody = await json(readResponse);

    expect(readResponse.status).toBe(200);
    expect(readBody.quote).toMatchObject({
      id: created.id,
      subject: '行銷',
      client_tax_id: '53536206',
      items: [expect.objectContaining({ name: '策略規劃' })],
    });

    const updateResponse = await updateQuote(
      context(
        `/api/quotes/${id}`,
        {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(
            quotePayload({
              subject: '網站改版',
              items: [{ name: '專案管理', qty: 4, unit: 'hr', unit_price: 2000 }],
            })
          ),
        },
        { id }
      )
    );
    const updateBody = await json(updateResponse);

    expect(updateResponse.status).toBe(200);
    expect(updateBody.quote).toMatchObject({
      subject: '網站改版',
      subtotal: 8000,
      tax_amount: 400,
      total: 8400,
      items: [expect.objectContaining({ name: '專案管理', amount: 8000 })],
    });

    const pdfKey = `quotes/${created.quote_no}/${created.quote_no}.pdf`;
    await env.FILES.put(pdfKey, new Uint8Array([1, 2, 3]), {
      httpMetadata: {
        contentType: 'application/pdf',
      },
    });
    await env.DB.prepare('UPDATE quotes SET pdf_key = ?1 WHERE id = ?2').bind(pdfKey, id).run();

    const deleteResponse = await deleteQuote(
      context(`/api/quotes/${id}`, { method: 'DELETE', headers: authHeaders() }, { id })
    );
    expect(deleteResponse.status).toBe(204);
    await expect(env.FILES.get(`quotes/${created.quote_no}/${created.quote_no}.xlsx`)).resolves.toBeNull();
    await expect(env.FILES.get(pdfKey)).resolves.toBeNull();

    const missingResponse = await getQuote(context(`/api/quotes/${id}`, { headers: authHeaders() }, { id }));
    expect(missingResponse.status).toBe(404);
  });

  it('streams generated xlsx bytes with download headers', async () => {
    const created = await createValidQuote();
    const id = String(created.id);

    const response = await downloadXlsx(context(`/api/quotes/${id}/xlsx`, { headers: authHeaders() }, { id }));
    const bytes = await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(response.headers.get('Content-Disposition')).toContain('.xlsx');
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it('returns a clean 500 response when public xlsx download storage read fails', async () => {
    const created = await createValidQuote();
    const id = String(created.id);
    const routeContext = context(`/q/${id}/download`, {}, { id });

    routeContext.locals.runtime.env.FILES = {
      get: async () => {
        throw new Error('R2 unavailable');
      },
    } as unknown as R2Bucket;

    const response = await publicDownloadXlsx(routeContext);

    expect(response.status).toBe(500);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    await expect(response.text()).resolves.toBe('Unable to download quote xlsx.');
  });

  it('does not serve public brand assets for a missing quote id', async () => {
    await env.DB.prepare("UPDATE company_profile SET logo_key = 'brand/logo.png' WHERE id = 1").run();
    await env.FILES.put('brand/logo.png', new Uint8Array([1, 2, 3]), {
      httpMetadata: { contentType: 'image/png' },
    });

    const response = await publicAsset(context('/q/999/asset?type=logo', {}, { id: '999' }));

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe('Asset not found.');
  });

  it('regenerates quote xlsx', async () => {
    const created = await createValidQuote();
    const id = String(created.id);

    const response = await regenerateXlsx(
      context(`/api/quotes/${id}/regenerate`, { method: 'POST', headers: authHeaders() }, { id })
    );
    const body = await json(response);
    const row = await env.DB.prepare('SELECT xlsx_key FROM quotes WHERE id = ?1')
      .bind(created.id)
      .first<{ xlsx_key: string | null }>();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: created.id,
      quote_no: '20260614-01',
      xlsx_url: `/api/quotes/${created.id}/xlsx`,
    });
    expect(row?.xlsx_key).toBe('quotes/20260614-01/20260614-01.xlsx');
  });

  it('refreshes the downloadable xlsx after editing a quote', async () => {
    const created = await createValidQuote();
    const id = String(created.id);
    const key = `quotes/${created.quote_no}/${created.quote_no}.xlsx`;
    const originalObject = await env.FILES.get(key);
    const originalBytes = await originalObject?.arrayBuffer();

    const updateResponse = await updateQuote(
      context(
        `/api/quotes/${id}`,
        {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(
            quotePayload({
              subject: '網站改版',
              items: [{ name: '專案管理', qty: 4, unit: 'hr', unit_price: 2000 }],
            })
          ),
        },
        { id }
      )
    );
    const updatedObject = await env.FILES.get(key);
    const updatedBytes = await updatedObject?.arrayBuffer();

    expect(updateResponse.status).toBe(200);
    expect(originalBytes).toBeDefined();
    expect(updatedBytes).toBeDefined();
    expect(bytesEqual(updatedBytes ?? new ArrayBuffer(0), originalBytes ?? new ArrayBuffer(0))).toBe(false);
  });

  it('returns 400 for invalid payloads', async () => {
    const response = await createQuote(
      context('/api/quotes', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(quotePayload({ subject: '' })),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain('subject');
  });
});

function bytesEqual(left: ArrayBuffer, right: ArrayBuffer): boolean {
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);

  return leftBytes.length === rightBytes.length && leftBytes.every((value, index) => value === rightBytes[index]);
}

import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { clientsRepo, quotesRepo } from '../src/server/db';
import { DELETE as deleteClient, GET as getClient, PUT as updateClient } from '../src/pages/api/clients/[id]';
import { GET as listClients, POST as createClient } from '../src/pages/api/clients/index';
import { GET as getCompany, PUT as updateCompany } from '../src/pages/api/company/index';
import { authHeaders, context, json } from './helpers';

async function resetDb(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM quote_items'),
    env.DB.prepare('DELETE FROM quotes'),
    env.DB.prepare('DELETE FROM clients'),
    env.DB.prepare(
      `UPDATE company_profile
       SET name = '', tax_id = '', address = '', phone = '', bank_info = '', default_tax_rate = 0.05,
           default_notes = '', logo_key = NULL, stamp_key = NULL, bank_image_key = NULL
       WHERE id = 1`
    ),
  ]);
}

function clientPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: '安可整合行銷',
    contact: '王小姐',
    tax_id: '24536806',
    phone: '0912-345-678',
    email: 'hello@example.com',
    address: '台北市中山區南京東路一段 1 號',
    ...overrides,
  };
}

describe('clients API routes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('rejects GET /api/clients without a token', async () => {
    const response = await listClients(context('/api/clients'));

    expect(response.status).toBe(401);
  });

  it('creates, lists, reads, updates, and deletes a client', async () => {
    const createResponse = await createClient(
      context('/api/clients', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(clientPayload()),
      })
    );
    const createBody = await json(createResponse);
    const createdClient = createBody.client as { id: number };
    const id = String(createdClient.id);

    expect(createResponse.status).toBe(201);
    expect(createBody.client).toMatchObject({
      id: expect.any(Number),
      name: '安可整合行銷',
      tax_id: '24536806',
      phone: '0912-345-678',
    });

    const listResponse = await listClients(context('/api/clients', { headers: authHeaders() }));
    const listBody = await json(listResponse);

    expect(listResponse.status).toBe(200);
    expect(listBody.clients).toEqual([
      expect.objectContaining({
        id: createdClient.id,
        name: '安可整合行銷',
        tax_id: '24536806',
      }),
    ]);

    const readResponse = await getClient(context(`/api/clients/${id}`, { headers: authHeaders() }, { id }));
    const readBody = await json(readResponse);

    expect(readResponse.status).toBe(200);
    expect(readBody.client).toMatchObject({
      id: createdClient.id,
      contact: '王小姐',
      tax_id: '24536806',
    });

    const updateResponse = await updateClient(
      context(
        `/api/clients/${id}`,
        {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ name: '範例客戶', tax_id: '53536206', phone: '02-1234-5678' }),
        },
        { id }
      )
    );
    const updateBody = await json(updateResponse);

    expect(updateResponse.status).toBe(200);
    expect(updateBody.client).toMatchObject({
      name: '範例客戶',
      tax_id: '53536206',
      phone: '02-1234-5678',
      email: 'hello@example.com',
    });

    const deleteResponse = await deleteClient(
      context(`/api/clients/${id}`, { method: 'DELETE', headers: authHeaders() }, { id })
    );
    expect(deleteResponse.status).toBe(204);

    const missingResponse = await getClient(context(`/api/clients/${id}`, { headers: authHeaders() }, { id }));
    expect(missingResponse.status).toBe(404);
  });

  it('returns 400 when creating a client with an empty name', async () => {
    const response = await createClient(
      context('/api/clients', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(clientPayload({ name: '   ' })),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain('name');
  });

  it('deletes a referenced client without changing the historical quote snapshot', async () => {
    const client = await clientsRepo(env.DB).create({
      name: '安可整合行銷',
      contact: '王小姐',
      tax_id: '24536806',
      phone: '0912-345-678',
    });
    const quote = await quotesRepo(env.DB).create(
      {
        client_id: client.id,
        subject: '行銷',
        quote_date: '2026-06-14',
        tax_rate: 0.05,
      },
      [{ name: '策略規劃', qty: 1, unit_price: 1000 }]
    );

    const response = await deleteClient(
      context(`/api/clients/${client.id}`, { method: 'DELETE', headers: authHeaders() }, { id: String(client.id) })
    );
    const storedQuote = await quotesRepo(env.DB).get(quote.id);

    expect(response.status).toBe(204);
    expect(storedQuote).toMatchObject({
      id: quote.id,
      client_id: null,
      client_name: '安可整合行銷',
      client_contact: '王小姐',
      client_tax_id: '24536806',
      client_phone: '0912-345-678',
    });
  });
});

describe('company API route', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('rejects GET /api/company without a token', async () => {
    const response = await getCompany(context('/api/company'));

    expect(response.status).toBe(401);
  });

  it('reads the seeded single company profile with blank factory values', async () => {
    const response = await getCompany(context('/api/company', { headers: authHeaders() }));
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.company).toMatchObject({
      id: 1,
      name: '',
      tax_id: '',
      address: '',
      phone: '',
      bank_info: '',
      default_tax_rate: 0.05,
      default_notes: '',
      logo_key: null,
      stamp_key: null,
      bank_image_key: null,
    });
  });

  it('updates a partial company patch and preserves omitted fields', async () => {
    const updateResponse = await updateCompany(
      context('/api/company', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ name: '範例客戶', tax_id: '24536806', bank_info: '玉山銀行 808 / 1234' }),
      })
    );
    const updateBody = await json(updateResponse);

    expect(updateResponse.status).toBe(200);
    expect(updateBody.company).toMatchObject({
      name: '範例客戶',
      tax_id: '24536806',
      address: '',
      phone: '',
      bank_info: '玉山銀行 808 / 1234',
      default_tax_rate: 0.05,
      default_notes: '',
    });

    const readResponse = await getCompany(context('/api/company', { headers: authHeaders() }));
    const readBody = await json(readResponse);

    expect(readResponse.status).toBe(200);
    expect(readBody.company).toMatchObject(updateBody.company as Record<string, unknown>);
  });

  it('updates company brand asset keys', async () => {
    const updateResponse = await updateCompany(
      context('/api/company', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          logo_key: 'brand/logo.png',
          stamp_key: 'brand/stamp.png',
          bank_image_key: 'brand/bank.jpg',
        }),
      })
    );
    const updateBody = await json(updateResponse);

    expect(updateResponse.status).toBe(200);
    expect(updateBody.company).toMatchObject({
      logo_key: 'brand/logo.png',
      stamp_key: 'brand/stamp.png',
      bank_image_key: 'brand/bank.jpg',
    });
  });
});

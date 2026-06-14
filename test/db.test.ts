import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { clientsRepo, companyRepo, quotesRepo } from '../src/server/db';

async function resetDb(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM quote_items'),
    env.DB.prepare('DELETE FROM quotes'),
    env.DB.prepare('DELETE FROM clients'),
    env.DB.prepare(
      `UPDATE company_profile
       SET name = '', address = '', phone = '', bank_info = '', default_tax_rate = 0.05,
           default_notes = '', logo_key = NULL, stamp_key = NULL, bank_image_key = NULL
       WHERE id = 1`
    ),
  ]);
}

describe('companyRepo', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('reads and updates the seeded company profile', async () => {
    const companies = companyRepo(env.DB);

    await expect(companies.get()).resolves.toMatchObject({
      id: 1,
      name: '',
      address: '',
      phone: '',
      bank_info: '',
      default_tax_rate: 0.05,
      default_notes: '',
    });

    await companies.update({
      name: '範例客戶',
      phone: '02-1234-5678',
      default_tax_rate: 0.1,
      default_notes: 'Valid for 14 days.',
    });

    await expect(companies.get()).resolves.toMatchObject({
      id: 1,
      name: '範例客戶',
      phone: '02-1234-5678',
      default_tax_rate: 0.1,
      default_notes: 'Valid for 14 days.',
    });
  });
});

describe('clientsRepo', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates, lists, reads, updates, and deletes clients', async () => {
    const clients = clientsRepo(env.DB);

    const created = await clients.create({
      name: 'Acme Co.',
      contact: 'Amy',
      phone: '0912-345-678',
      email: 'amy@example.com',
      address: 'Taipei',
    });

    expect(created.id).toBeGreaterThan(0);
    await expect(clients.list()).resolves.toHaveLength(1);
    await expect(clients.get(created.id)).resolves.toMatchObject({
      name: 'Acme Co.',
      contact: 'Amy',
      phone: '0912-345-678',
    });

    const updated = await clients.update(created.id, {
      name: 'Acme Taiwan',
      phone: '02-2222-3333',
    });

    expect(updated).toMatchObject({
      id: created.id,
      name: 'Acme Taiwan',
      contact: 'Amy',
      phone: '02-2222-3333',
    });

    await clients.delete(created.id);
    await expect(clients.get(created.id)).resolves.toBeNull();
    await expect(clients.list()).resolves.toEqual([]);
  });
});

describe('quotesRepo', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates quotes with items, totals, quote number, status updates, and item cleanup on delete', async () => {
    const clients = clientsRepo(env.DB);
    const quotes = quotesRepo(env.DB);
    const client = await clients.create({
      name: 'Client A',
      contact: 'Chris',
      phone: '0911-111-111',
    });

    const created = await quotes.create(
      {
        client_id: client.id,
        subject: 'Website build',
        quote_date: '2026-06-14',
        valid_until: '2026-06-30',
        tax_rate: 0.05,
        notes: 'Thanks.',
        created_via: 'web',
      },
      [
        { name: 'Design', description: 'Layout', qty: 2, unit: 'hr', unit_price: 1500 },
        { name: 'Build', qty: 3, unit: 'hr', unit_price: 1000 },
      ]
    );

    expect(created).toMatchObject({
      quote_no: '20260614-01',
      client_id: client.id,
      client_name: 'Client A',
      client_contact: 'Chris',
      client_phone: '0911-111-111',
      subtotal: 6000,
      tax_amount: 300,
      total: 6300,
      status: 'draft',
    });
    expect(created.items).toHaveLength(2);
    expect(created.items[0]).toMatchObject({ sort_order: 1, name: 'Design', amount: 3000 });

    await expect(quotes.get(created.id)).resolves.toMatchObject({
      id: created.id,
      quote_no: '20260614-01',
      items: expect.arrayContaining([
        expect.objectContaining({ name: 'Design', amount: 3000 }),
        expect.objectContaining({ name: 'Build', amount: 3000 }),
      ]),
    });

    await expect(quotes.updateStatus(created.id, 'sent')).resolves.toMatchObject({
      id: created.id,
      status: 'sent',
    });

    await quotes.delete(created.id);
    await expect(quotes.get(created.id)).resolves.toBeNull();

    const itemCount = await env.DB.prepare('SELECT COUNT(*) AS count FROM quote_items WHERE quote_id = ?1')
      .bind(created.id)
      .first<{ count: number }>();

    expect(itemCount?.count).toBe(0);
  });

  it('keeps client snapshot fields unchanged when the client is updated later', async () => {
    const clients = clientsRepo(env.DB);
    const quotes = quotesRepo(env.DB);
    const client = await clients.create({
      name: 'Original Client',
      contact: 'Olivia',
      phone: '0900-000-001',
    });

    const created = await quotes.create(
      {
        client_id: client.id,
        subject: 'Snapshot quote',
        quote_date: '2026-06-14',
        tax_rate: 0.05,
      },
      [{ name: 'Consulting', qty: 1, unit_price: 48000 }]
    );

    await clients.update(client.id, {
      name: 'Renamed Client',
      contact: 'Riley',
      phone: '0900-000-002',
    });

    await expect(quotes.get(created.id)).resolves.toMatchObject({
      client_name: 'Original Client',
      client_contact: 'Olivia',
      client_phone: '0900-000-001',
    });
  });
});

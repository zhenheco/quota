import { describe, expect, it } from 'vitest';
import { validateQuoteInput } from '../src/server/validation';

function validPayload(): unknown {
  return {
    client_name: ' Acme Co. ',
    client_contact: ' Amy ',
    client_tax_id: ' 24536806 ',
    client_phone: ' 0912-345-678 ',
    subject: ' Website build ',
    quote_date: '2026-06-14',
    valid_until: '2026-06-30',
    tax_rate: 0.05,
    notes: ' Thanks. ',
    created_via: 'web',
    items: [
      {
        name: ' Design ',
        description: ' Layout ',
        qty: 2,
        unit: ' hr ',
        unit_price: 1500,
      },
    ],
  };
}

describe('validateQuoteInput', () => {
  it('accepts a valid quote payload and normalizes trimmed strings', () => {
    const result = validateQuoteInput(validPayload());

    expect(result).toMatchObject({
      ok: true,
      value: {
        client_name: 'Acme Co.',
        client_contact: 'Amy',
        client_tax_id: '24536806',
        client_phone: '0912-345-678',
        subject: 'Website build',
        quote_date: '2026-06-14',
        tax_rate: 0.05,
        notes: 'Thanks.',
        created_via: 'web',
        items: [
          {
            name: 'Design',
            description: 'Layout',
            qty: 2,
            unit: 'hr',
            unit_price: 1500,
          },
        ],
      },
    });
  });

  it('rejects empty items', () => {
    const payload = validPayload() as { items: unknown[] };
    payload.items = [];

    expect(validateQuoteInput(payload)).toMatchObject({
      ok: false,
      error: expect.stringContaining('items'),
    });
  });

  it('rejects negative unit prices', () => {
    const payload = validPayload() as { items: Array<{ unit_price: number }> };
    payload.items[0].unit_price = -1;

    expect(validateQuoteInput(payload)).toMatchObject({
      ok: false,
      error: expect.stringContaining('unit_price'),
    });
  });

  it('rejects tax rates outside 0 to 1', () => {
    const payload = validPayload() as { tax_rate: number };
    payload.tax_rate = 1.5;

    expect(validateQuoteInput(payload)).toMatchObject({
      ok: false,
      error: expect.stringContaining('tax_rate'),
    });
  });

  it('rejects missing subject', () => {
    const payload = validPayload() as { subject?: string };
    delete payload.subject;

    expect(validateQuoteInput(payload)).toMatchObject({
      ok: false,
      error: expect.stringContaining('subject'),
    });
  });
});

import type { CreatedVia, QuoteCreateInput, QuoteItemInput } from './types';

export interface ValidQuoteInput extends QuoteCreateInput {
  items: QuoteItemInput[];
}

export type ValidationResult =
  | {
      ok: true;
      value: ValidQuoteInput;
    }
  | {
      ok: false;
      error: string;
    };

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const CREATED_VIA_VALUES = new Set<CreatedVia>(['web', 'chat']);

export function validateQuoteInput(payload: unknown): ValidationResult {
  if (!isRecord(payload)) {
    return error('body must be an object');
  }

  const subject = requiredString(payload.subject, 'subject');
  if (!subject.ok) {
    return subject;
  }

  const quoteDate = requiredString(payload.quote_date, 'quote_date');
  if (!quoteDate.ok) {
    return quoteDate;
  }

  const taxRate = requiredNumber(payload.tax_rate, 'tax_rate');
  if (!taxRate.ok) {
    return taxRate;
  }
  if (taxRate.value < 0 || taxRate.value > 1) {
    return error('tax_rate must be between 0 and 1');
  }

  const items = validateItems(payload.items);
  if (!items.ok) {
    return items;
  }

  const createdVia = optionalString(payload.created_via);
  if (createdVia !== null && !CREATED_VIA_VALUES.has(createdVia as CreatedVia)) {
    return error('created_via must be web or chat');
  }

  return {
    ok: true,
    value: {
      client_id: optionalInteger(payload.client_id),
      client_name: optionalString(payload.client_name),
      client_contact: optionalString(payload.client_contact),
      client_phone: optionalString(payload.client_phone),
      subject: subject.value,
      quote_date: quoteDate.value,
      valid_until: optionalString(payload.valid_until),
      tax_rate: taxRate.value,
      notes: optionalString(payload.notes),
      created_via: (createdVia as CreatedVia | null) ?? 'web',
      items: items.value,
    },
  };
}

function validateItems(value: unknown): { ok: true; value: QuoteItemInput[] } | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return error('items must contain at least one item');
  }

  const items: QuoteItemInput[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      return error(`items[${index}] must be an object`);
    }

    const name = requiredString(item.name, `items[${index}].name`);
    if (!name.ok) {
      return name;
    }

    const qty = requiredNumber(item.qty, `items[${index}].qty`);
    if (!qty.ok) {
      return qty;
    }
    if (qty.value < 0) {
      return error(`items[${index}].qty must be greater than or equal to 0`);
    }

    const unitPrice = requiredNumber(item.unit_price, `items[${index}].unit_price`);
    if (!unitPrice.ok) {
      return unitPrice;
    }
    if (unitPrice.value < 0) {
      return error(`items[${index}].unit_price must be greater than or equal to 0`);
    }

    items.push({
      name: name.value,
      description: optionalString(item.description),
      qty: qty.value,
      unit: optionalString(item.unit),
      unit_price: unitPrice.value,
    });
  }

  return { ok: true, value: items };
}

function requiredString(value: unknown, field: string): { ok: true; value: string } | { ok: false; error: string } {
  const stringValue = optionalString(value);

  if (stringValue === null) {
    return error(`${field} is required`);
  }

  return { ok: true, value: stringValue };
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
}

function requiredNumber(value: unknown, field: string): { ok: true; value: number } | { ok: false; error: string } {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return error(`${field} must be a number`);
  }

  return { ok: true, value };
}

function optionalInteger(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return null;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function error(message: string): { ok: false; error: string } {
  return { ok: false, error: message };
}

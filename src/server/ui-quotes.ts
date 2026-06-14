import { computeTotals } from '../shared/calc';
import type { Company, Quote, QuoteItem } from './types';

export function editableQuote(company: Company, quote?: Quote | null): Quote {
  if (quote) {
    return quote;
  }

  const today = new Date().toISOString().slice(0, 10);
  const items: QuoteItem[] = [
    {
      id: -1,
      quote_id: -1,
      sort_order: 1,
      name: '',
      description: '',
      qty: 1,
      unit: '式',
      unit_price: 0,
      amount: 0,
    },
  ];
  const totals = computeTotals(items, company.default_tax_rate);

  return {
    id: -1,
    quote_no: 'PREVIEW',
    client_id: null,
    client_name: '',
    client_contact: '',
    client_phone: '',
    subject: '',
    quote_date: today,
    valid_until: '',
    tax_rate: company.default_tax_rate,
    subtotal: totals.subtotal,
    tax_amount: totals.taxAmount,
    total: totals.total,
    notes: company.default_notes,
    status: 'draft',
    xlsx_key: null,
    pdf_key: null,
    created_via: 'web',
    created_at: today,
    updated_at: today,
    items,
  };
}

export function copyQuote(source: Quote): Quote {
  return {
    ...source,
    id: -1,
    quote_no: 'PREVIEW',
    status: 'draft',
    xlsx_key: null,
    pdf_key: null,
    items: source.items.map((item) => ({
      ...item,
      id: -1,
      quote_id: -1,
    })),
  };
}

export function quoteId(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

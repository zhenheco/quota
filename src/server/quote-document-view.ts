import { computeTotals } from '../shared/calc';
import type { Company, Quote } from './types';

interface QuoteDocumentViewInput {
  quote: Quote;
  company: Company;
}

export interface QuoteDocumentItemView {
  name: string;
  description: string;
  qtyLabel: string;
  unit: string;
  unitPriceLabel: string;
  amountLabel: string;
}

export interface QuoteDocumentView {
  sheetClass: 'quotation-sheet';
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyTaxId: string;
  quoteNo: string;
  subject: string;
  clientName: string;
  clientContact: string;
  clientTaxId: string;
  clientPhone: string;
  quoteDate: string;
  validUntil: string;
  items: QuoteDocumentItemView[];
  subtotalLabel: string;
  showTaxRows: boolean;
  taxRateLabel: string;
  taxAmountLabel: string;
  totalLabel: string;
  notes: string;
  bankInfo: string;
}

export function createQuoteDocumentView({ quote, company }: QuoteDocumentViewInput): QuoteDocumentView {
  const totals = computeTotals(quote.items, quote.tax_rate);

  return {
    sheetClass: 'quotation-sheet',
    companyName: fallback(company.name, '公司名稱'),
    companyAddress: fallback(company.address, ''),
    companyPhone: fallback(company.phone, ''),
    companyTaxId: fallback(company.tax_id, ''),
    quoteNo: quote.quote_no,
    subject: fallback(quote.subject, '報價單'),
    clientName: fallback(quote.client_name, '未指定客戶'),
    clientContact: fallback(quote.client_contact, ''),
    clientTaxId: fallback(quote.client_tax_id, ''),
    clientPhone: fallback(quote.client_phone, ''),
    quoteDate: fallback(quote.quote_date, ''),
    validUntil: fallback(quote.valid_until, ''),
    items: quote.items.map((item) => ({
      name: item.name,
      description: item.description ?? '',
      qtyLabel: formatQuantity(item.qty),
      unit: item.unit ?? '',
      unitPriceLabel: formatMoney(item.unit_price),
      amountLabel: formatMoney(Math.round(item.qty * item.unit_price)),
    })),
    subtotalLabel: formatMoney(totals.subtotal),
    showTaxRows: quote.tax_rate > 0,
    taxRateLabel: `${Math.round(quote.tax_rate * 1000) / 10}%`,
    taxAmountLabel: formatMoney(totals.taxAmount),
    totalLabel: formatMoney(totals.total),
    notes: fallback(quote.notes, company.default_notes ?? ''),
    bankInfo: fallback(company.bank_info, ''),
  };
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('zh-TW', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function fallback(value: string | null | undefined, replacement: string): string {
  const trimmed = value?.trim() ?? '';

  return trimmed === '' ? replacement : trimmed;
}

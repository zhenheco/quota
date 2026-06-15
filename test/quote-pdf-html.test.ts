import { describe, expect, it } from 'vitest';
import { computeTotals } from '../src/server/calc';
import { buildQuoteHtml } from '../src/server/quote-pdf-html';
import type { Company, Quote, QuoteItem } from '../src/server/types';

function makeCompany(): Company {
  return {
    id: 1,
    name: '範例顧問有限公司',
    tax_id: '24536806',
    address: '台北市中山區南京東路一段 1 號',
    phone: '02-1234-5678',
    contact: '王小姐',
    bank_info: '玉山銀行 808 / 1234-567-890123 / 範例顧問有限公司',
    default_tax_rate: 0.05,
    default_notes: '匯款後請提供末五碼。',
    logo_key: null,
    stamp_key: null,
    bank_image_key: null,
  };
}

function makeItems(): QuoteItem[] {
  return [
    {
      id: 1,
      quote_id: 1,
      sort_order: 1,
      name: '策略規劃',
      description: '品牌與行銷策略',
      qty: 2,
      unit: '式',
      unit_price: 48000,
      amount: 96000,
    },
  ];
}

function makeQuote(taxRate: number): Quote {
  const items = makeItems();
  const totals = computeTotals(items, taxRate);

  return {
    id: 1,
    quote_no: '20260614-01',
    client_id: null,
    client_name: '安可整合行銷',
    client_contact: '王小姐',
    client_tax_id: '53536206',
    client_phone: '0912-345-678',
    subject: '品牌策略規劃',
    quote_date: '2026-06-14',
    valid_until: '2026-06-30',
    tax_rate: taxRate,
    subtotal: totals.subtotal,
    tax_amount: totals.taxAmount,
    total: totals.total,
    notes: '本報價含稅，實際執行細節依雙方確認為準。',
    status: 'draft',
    xlsx_key: null,
    pdf_key: null,
    created_via: 'web',
    created_at: '2026-06-14T00:00:00.000Z',
    updated_at: '2026-06-14T00:00:00.000Z',
    items,
  };
}

describe('buildQuoteHtml', () => {
  it('renders Design C shell and keeps tax rows hidden for untaxed quotes', () => {
    const html = buildQuoteHtml({
      quote: makeQuote(0),
      company: makeCompany(),
      brand: {},
    });

    expect(html).toContain('class="quote-sheet"');
    expect(html).not.toContain('quotation-sheet');
    expect(html).toContain('報 價 單');
    expect(html).toContain('王小姐');
    expect(html).toContain('20260614-01');
    expect(html).toContain('安可整合行銷');
    expect(html).toContain('data-preview-subtotal-row hidden');
    expect(html).toContain('data-preview-tax-row hidden');
    expect(html).toContain('總計');
    expect(html).not.toContain('總計（含稅）');
  });

  it('shows Design C tax labels for taxed quotes', () => {
    const html = buildQuoteHtml({
      quote: makeQuote(0.05),
      company: makeCompany(),
      brand: {},
    });

    expect(html).toContain('未稅小計');
    expect(html).toContain('營業稅 <span data-preview="taxRate">5%</span>');
    expect(html).toContain('總計');
    expect(html).not.toContain('總計（含稅）');
    expect(html).not.toContain('data-preview-subtotal-row hidden');
    expect(html).not.toContain('data-preview-tax-row hidden');
  });
});

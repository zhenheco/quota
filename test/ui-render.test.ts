import { describe, expect, it } from 'vitest';
import { createQuoteDocumentView } from '../src/server/quote-document-view';
import { createSettingsView } from '../src/server/settings-view';
import type { Company, Quote } from '../src/server/types';

const company: Company = {
  id: 1,
  name: '範例客戶',
  tax_id: '24536806',
  address: '台北市中山區南京東路一段 1 號',
  phone: '02-1234-5678',
  bank_info: '玉山銀行 808 / 1234-567-890123 / 範例客戶有限公司',
  default_tax_rate: 0.05,
  default_notes: '匯款後請提供末五碼。',
  logo_key: null,
  stamp_key: null,
  bank_image_key: null,
};

const quote: Quote = {
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
  tax_rate: 0.05,
  subtotal: 96000,
  tax_amount: 4800,
  total: 100800,
  notes: '本報價含稅，實際執行細節依雙方確認為準。',
  status: 'draft',
  xlsx_key: null,
  pdf_key: null,
  created_via: 'web',
  created_at: '2026-06-14T00:00:00.000Z',
  updated_at: '2026-06-14T00:00:00.000Z',
  items: [
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
  ],
};

describe('QuoteDocument', () => {
  it('prepares the shared A4 quote document data with quote number, items, and totals', () => {
    const view = createQuoteDocumentView({ quote, company });

    expect(view.sheetClass).toBe('quotation-sheet');
    expect(view.quoteNo).toBe('20260614-01');
    expect(view.companyTaxId).toBe('24536806');
    expect(view.clientTaxId).toBe('53536206');
    expect(view.items).toEqual([
      expect.objectContaining({
        name: '策略規劃',
        amountLabel: '96,000',
      }),
    ]);
    expect(view.totalLabel).toBe('100,800');
  });

  it('marks tax rows hidden for untaxed quote documents', () => {
    const view = createQuoteDocumentView({
      quote: {
        ...quote,
        tax_rate: 0,
        tax_amount: 0,
        total: quote.subtotal,
      },
      company,
    });

    expect(view.showTaxRows).toBe(false);
    expect(view.totalLabel).toBe('96,000');
  });
});

describe('settings view', () => {
  it('shows first-run setup guidance when company identity and brand assets are blank', () => {
    const view = createSettingsView({
      ...company,
      name: ' ',
      logo_key: null,
      stamp_key: null,
      bank_image_key: null,
    });

    expect(view.showFirstRunSetup).toBe(true);
    expect(view.setupSteps).toEqual(['填公司資料', '上傳品牌圖檔', '設定稅率與備註']);
  });

  it('hides first-run setup guidance after company identity is configured', () => {
    const view = createSettingsView({
      ...company,
      name: 'Acme Studio',
      logo_key: null,
      stamp_key: null,
      bank_image_key: null,
    });

    expect(view.showFirstRunSetup).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { buildQuoteBrandUrls } from '../src/shared/quote-brand-urls';
import { createQuoteDocumentView } from '../src/server/quote-document-view';
import {
  renderQuoteDocumentBody,
} from '../src/shared/quote-document-template';
import type { Company, Quote, QuoteItem } from '../src/server/types';

const company: Company = {
  id: 1,
  name: '範例公司有限公司',
  tax_id: '12345678',
  address: '範例市範例路一號',
  phone: '0900-000000',
  contact: '範例負責人',
  bank_info: '範例銀行 範例分行\n戶名：範例公司有限公司',
  default_tax_rate: 0.05,
  default_notes: '專案負責人：範例負責人',
  logo_key: 'brand/logo.png',
  stamp_key: 'brand/stamp.png',
  bank_image_key: 'brand/bank.jpg',
};

const items: QuoteItem[] = [
  {
    id: 1,
    quote_id: 1,
    sort_order: 1,
    name: 'AI 輔助市場驗證分析',
    description: '1. 顧客回饋資料欄位\n2. 通路訪談紀錄格式',
    qty: 1,
    unit: '式',
    unit_price: 450000,
    amount: 450000,
  },
];

const quote: Quote = {
  id: 8,
  quote_no: '20260615-01',
  client_id: null,
  client_name: '範例客戶有限公司',
  client_contact: '範例聯絡人',
  client_tax_id: '87654321',
  client_phone: '0900-111111',
  subject: 'AI 輔助市場驗證分析',
  quote_date: '2026-06-15',
  valid_until: '2026-06-30',
  tax_rate: 0.05,
  subtotal: 450000,
  tax_amount: 22500,
  total: 472500,
  notes: '本報價有效期限至 2026-06-30。',
  status: 'draft',
  xlsx_key: null,
  pdf_key: null,
  created_via: 'web',
  created_at: '2026-06-15T00:00:00.000Z',
  updated_at: '2026-06-15T00:00:00.000Z',
  items,
};

describe('quote document template parity', () => {
  it('renders the same document body for URL and data URI brand sources after src normalization', () => {
    const view = createQuoteDocumentView({ quote, company });
    const urlBrand = buildQuoteBrandUrls(company);
    const dataUriBrand = {
      logo: 'data:image/png;base64,logo',
      stamp: 'data:image/png;base64,stamp',
      bank: 'data:image/jpeg;base64,bank',
    };

    const urlBody = normalizeBrandSrc(renderQuoteDocumentBody(view, urlBrand));
    const dataUriBody = normalizeBrandSrc(renderQuoteDocumentBody(view, dataUriBrand));

    expect(urlBody).toBe(dataUriBody);
  });

  it('builds browser-reachable company brand URLs only for configured company assets', () => {
    expect(buildQuoteBrandUrls(company)).toEqual({
      logo: '/api/company/brand/logo',
      stamp: '/api/company/brand/stamp',
      bank: '/api/company/brand/bank',
    });

    expect(
      buildQuoteBrandUrls({
        ...company,
        logo_key: null,
        bank_image_key: null,
      })
    ).toEqual({
      logo: null,
      stamp: '/api/company/brand/stamp',
      bank: null,
    });
  });
});

function normalizeBrandSrc(html: string): string {
  return html
    .replace(/src="[^"]+"/g, 'src="__BRAND_SRC__"')
    .replace(/\s+/g, ' ')
    .trim();
}

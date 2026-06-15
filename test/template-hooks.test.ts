import { describe, expect, it } from 'vitest';
import {
  renderQuoteDocumentBody,
  renderQuoteItemRows,
} from '../src/shared/quote-document-template';
import type { QuoteDocumentView } from '../src/server/quote-document-view';

function makeView(): QuoteDocumentView {
  return {
    sheetClass: 'quote-sheet',
    companyName: '範例公司有限公司',
    companyAddress: '範例市範例路一號',
    companyPhone: '0900-000000',
    companyContact: '範例負責人',
    companyTaxId: '12345678',
    quoteNo: '20260615-01',
    subject: 'AI 輔助市場驗證分析',
    clientName: '範例客戶有限公司',
    clientContact: '範例聯絡人',
    clientTaxId: '87654321',
    clientPhone: '0900-111111',
    quoteDate: '2026-06-15',
    validUntil: '2026-06-30',
    items: [
      {
        name: 'B2C 顧客回饋資料流程建置',
        description: '1. 顧客回饋資料欄位\n2. 通路訪談紀錄格式',
        qtyLabel: '1',
        unit: '式',
        unitPriceLabel: '450,000',
        amountLabel: '450,000',
      },
    ],
    subtotalLabel: '450,000',
    showTaxRows: true,
    taxRateLabel: '5%',
    taxAmountLabel: '22,500',
    totalLabel: '472,500',
    notes: '專案負責人：範例負責人',
    bankInfo: '範例銀行 範例分行',
  };
}

describe('quote document template hooks', () => {
  it('emits every editor preview hook', () => {
    const html = renderQuoteDocumentBody(makeView(), {
      logo: '/logo.png',
      stamp: '/stamp.png',
      bank: '/bank.jpg',
    });

    for (const name of [
      'subject',
      'clientName',
      'clientContact',
      'clientTaxId',
      'clientPhone',
      'quoteDate',
      'validUntil',
      'notes',
      'subtotal',
      'taxRate',
      'taxAmount',
      'total',
      'quoteNo',
      'companyName',
      'companyContact',
      'items',
    ]) {
      expect(html).toContain(`data-preview="${name}"`);
    }
    expect(html).toContain('data-preview-optional="clientTaxId"');
    expect(html).toContain('data-preview-subtotal-row');
    expect(html).toContain('data-preview-tax-row');
  });

  it('renders item rows with five columns and br descriptions', () => {
    const rows = renderQuoteItemRows(makeView().items);

    expect(rows.match(/<td/g)).toHaveLength(5);
    expect(rows).toContain('B2C 顧客回饋資料流程建置');
    expect(rows).toContain('1. 顧客回饋資料欄位<br>2. 通路訪談紀錄格式');
  });

  it('keeps subtotal + tax rows present but hidden when tax is zero', () => {
    const html = renderQuoteDocumentBody(
      { ...makeView(), showTaxRows: false, taxRateLabel: '0%', taxAmountLabel: '0' },
      { logo: null, stamp: null, bank: null }
    );

    expect(html).toContain('data-preview-subtotal-row hidden');
    expect(html).toContain('data-preview-tax-row hidden');
    expect(html).toContain('data-preview="subtotal"');
    expect(html).toContain('data-preview="taxAmount"');
    expect(html).toContain('總計');
    expect(html).not.toContain('總計（含稅）');
  });

  it('reveals subtotal + tax rows without hidden when tax applies', () => {
    const html = renderQuoteDocumentBody(makeView(), {
      logo: null,
      stamp: null,
      bank: null,
    });

    expect(html).toContain('data-preview-subtotal-row><');
    expect(html).toContain('data-preview-tax-row><');
    expect(html).not.toContain('data-preview-subtotal-row hidden');
    expect(html).not.toContain('data-preview-tax-row hidden');
  });
});

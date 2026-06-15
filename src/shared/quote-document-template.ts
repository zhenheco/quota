import type { QuoteDocumentItemView, QuoteDocumentView } from '../server/quote-document-view';

export const QUOTE_DOCUMENT_CSS = `
@page {
  size: A4;
  margin: 14mm;
}

.quote-sheet,
.quote-sheet * {
  box-sizing: border-box;
}

.quote-sheet {
  --gold: #A6791A;
  --ink: #2f2b27;
  --muted: #8c857b;
  --line: #E7DEC9;
  --soft: #FBF7EF;
  --panel: #FAFAF8;
  width: 100%;
  min-height: calc(297mm - 28mm);
  margin: 0 auto;
  color: var(--ink);
  background: #fff;
  font-family: "Noto Sans TC", system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.7;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.quote-sheet p,
.quote-sheet h1,
.quote-sheet h2 {
  margin: 0;
}

.quote-sheet table {
  width: 100%;
  border-collapse: collapse;
}

.quote-sheet__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  border-bottom: 2px solid var(--gold);
  padding-bottom: 12px;
}

.quote-sheet__logo {
  display: block;
  max-width: 168px;
  max-height: 46px;
  object-fit: contain;
  margin-bottom: 6px;
}

.quote-sheet__company {
  font-size: 15px;
  font-weight: 700;
  color: #3d3b3a;
}

.quote-sheet__seller {
  margin-top: 4px;
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.65;
}

.quote-sheet__label {
  display: inline-block;
  min-width: 64px;
  color: var(--gold);
  font-weight: 500;
}

.quote-sheet__label--inline {
  min-width: 0;
  margin-right: 4px;
}

.quote-sheet__title {
  text-align: center;
  min-width: 170px;
}

.quote-sheet__title h1 {
  color: var(--gold);
  font-family: "Noto Serif TC", serif;
  font-size: 30px;
  font-weight: 900;
  line-height: 1.25;
  letter-spacing: 6px;
}

.quote-sheet__title p {
  margin-top: 6px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}

.quote-sheet__meta {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin: 16px 0;
}

.quote-sheet__meta > div:last-child {
  text-align: right;
}

.quote-sheet__meta-row {
  margin: 2px 0;
}

.quote-sheet__subject {
  margin: 8px 0 14px;
  border-bottom: 2px solid var(--gold);
  padding: 8px 12px 7px;
  background: var(--soft);
  color: #3d3b3a;
  font-weight: 600;
  text-align: center;
}

.quote-sheet__items {
  margin-bottom: 14px;
}

.quote-sheet__items th {
  border-top: 3px solid var(--gold);
  border-bottom: 1px solid var(--line);
  padding: 8px;
  color: var(--gold);
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}

.quote-sheet__items td {
  border-bottom: 1px solid #ECE9E4;
  padding: 8px;
  vertical-align: top;
}

.quote-sheet__item-name {
  display: block;
  color: #3d3b3a;
  font-family: "Noto Serif TC", serif;
  font-weight: 700;
}

.quote-sheet__item-description {
  margin-top: 4px;
  color: #777;
  font-size: 12px;
}

.quote-sheet .num {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.quote-sheet__totals {
  width: 46%;
  margin-left: auto;
  margin-bottom: 14px;
}

.quote-sheet__totals td {
  border-bottom: 1px dashed var(--line);
  padding: 5px 8px;
}

.quote-sheet__totals-label {
  color: var(--gold);
  font-weight: 500;
}

.quote-sheet__totals-grand td {
  border-top: 2px solid var(--gold);
  border-bottom: 0;
  color: #3d3b3a;
  font-size: 16px;
  font-weight: 700;
}

.quote-sheet__notes {
  margin: 6px 0 16px;
  border: 1px solid #ECE9E4;
  border-radius: 4px;
  padding: 10px 12px;
  background: var(--panel);
  font-size: 12px;
  white-space: pre-line;
}

.quote-sheet__foot {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 18px;
  border-top: 1px solid #ECE9E4;
  padding-top: 12px;
  break-inside: avoid;
}

.quote-sheet__bank {
  font-size: 12px;
}

.quote-sheet__bank-title {
  color: var(--gold);
  font-weight: 600;
}

.quote-sheet__stamps {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  gap: 10px;
}

.quote-sheet__stamp {
  display: block;
  max-width: 132px;
  max-height: 96px;
  object-fit: contain;
}

.quote-sheet__bank-image {
  display: block;
  max-width: 180px;
  max-height: 96px;
  object-fit: contain;
}
`;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('zh-TW', {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

export function renderQuoteItemRows(items: QuoteDocumentItemView[]): string {
  return items
    .map(
      (item) => `<tr>
        <td>
          <strong class="quote-sheet__item-name">${escapeHtml(item.name)}</strong>${
            item.description
              ? `<div class="quote-sheet__item-description">${lineBreaks(item.description)}</div>`
              : ''
          }
        </td>
        <td class="num">${escapeHtml(item.qtyLabel)}</td>
        <td>${escapeHtml(item.unit)}</td>
        <td class="num">${escapeHtml(item.unitPriceLabel)}</td>
        <td class="num">${escapeHtml(item.amountLabel)}</td>
      </tr>`
    )
    .join('');
}

export function renderQuoteDocumentBody(
  view: QuoteDocumentView,
  brand: { logo: string | null; stamp: string | null; bank: string | null }
): string {
  return `<article class="quote-sheet" aria-label="報價單預覽">
    <header class="quote-sheet__head">
      <div>
        ${brand.logo ? `<img class="quote-sheet__logo" src="${escapeHtml(brand.logo)}" alt="${escapeHtml(view.companyName)}">` : ''}
        <p class="quote-sheet__company" data-preview="companyName">${escapeHtml(view.companyName)}</p>
        <div class="quote-sheet__seller">
          ${sellerLine('統一編號', view.companyTaxId)}
          ${sellerLine('聯絡人', view.companyContact, 'companyContact', true)}
          ${sellerLine('電話', view.companyPhone)}
          ${sellerLine('地址', view.companyAddress)}
        </div>
      </div>
      <div class="quote-sheet__title">
        <h1>報 價 單</h1>
        <p>QUOTATION</p>
      </div>
    </header>

    <section class="quote-sheet__meta">
      <div>
        <div class="quote-sheet__meta-row"><span class="quote-sheet__label">客戶</span><span data-preview="clientName">${escapeHtml(view.clientName)}</span></div>
        <div class="quote-sheet__meta-row" data-preview-optional="clientTaxId"${view.clientTaxId ? '' : ' hidden'}><span class="quote-sheet__label">統一編號</span><span data-preview="clientTaxId">${escapeHtml(view.clientTaxId)}</span></div>
        <div class="quote-sheet__meta-row"><span class="quote-sheet__label">聯絡人</span><span data-preview="clientContact">${escapeHtml(view.clientContact)}</span></div>
        <div class="quote-sheet__meta-row"><span class="quote-sheet__label">電話</span><span data-preview="clientPhone">${escapeHtml(view.clientPhone)}</span></div>
      </div>
      <div>
        <div class="quote-sheet__meta-row"><span class="quote-sheet__label">報價單號</span><span data-preview="quoteNo">${escapeHtml(view.quoteNo)}</span></div>
        <div class="quote-sheet__meta-row"><span class="quote-sheet__label">報價日期</span><span data-preview="quoteDate">${escapeHtml(view.quoteDate)}</span></div>
        <div class="quote-sheet__meta-row"><span class="quote-sheet__label">有效期限</span><span data-preview="validUntil">${escapeHtml(view.validUntil)}</span></div>
      </div>
    </section>

    <section class="quote-sheet__subject" data-preview="subject">${escapeHtml(view.subject)}</section>

    <table class="quote-sheet__items">
      <thead>
        <tr>
          <th>品項 / 內容</th>
          <th class="num" style="width:52px">數量</th>
          <th style="width:52px">單位</th>
          <th class="num" style="width:92px">單價</th>
          <th class="num" style="width:92px">金額</th>
        </tr>
      </thead>
      <tbody data-preview="items">
        ${renderQuoteItemRows(view.items)}
      </tbody>
    </table>

    ${renderTotals(view)}

    <section class="quote-sheet__notes" data-preview="notes">${lineBreaks(view.notes)}</section>

    <footer class="quote-sheet__foot">
      <div class="quote-sheet__bank">
        <div class="quote-sheet__bank-title">匯款資訊</div>
        <div>${lineBreaks(view.bankInfo)}</div>
      </div>
      <div class="quote-sheet__stamps">
        ${brand.stamp ? `<img class="quote-sheet__stamp" src="${escapeHtml(brand.stamp)}" alt="報價專用章">` : ''}
        ${brand.bank ? `<img class="quote-sheet__bank-image" src="${escapeHtml(brand.bank)}" alt="匯款存摺">` : ''}
      </div>
    </footer>
  </article>`;
}

function renderTotals(view: QuoteDocumentView): string {
  const taxRowsHidden = view.showTaxRows ? '' : ' hidden';

  return `<table class="quote-sheet__totals">
      <tbody>
        <tr data-preview-subtotal-row${taxRowsHidden}><td class="quote-sheet__totals-label">未稅小計</td><td class="num" data-preview="subtotal">${escapeHtml(view.subtotalLabel)}</td></tr>
        <tr data-preview-tax-row${taxRowsHidden}><td class="quote-sheet__totals-label">營業稅 <span data-preview="taxRate">${escapeHtml(view.taxRateLabel)}</span></td><td class="num" data-preview="taxAmount">${escapeHtml(view.taxAmountLabel)}</td></tr>
        <tr class="quote-sheet__totals-grand"><td class="quote-sheet__totals-label">總計</td><td class="num" data-preview="total">${escapeHtml(view.totalLabel)}</td></tr>
      </tbody>
    </table>`;
}

function sellerLine(label: string, value: string, previewName?: string, renderEmpty = false): string {
  if (!value && !renderEmpty) {
    return '';
  }

  const previewAttribute = previewName ? ` data-preview="${escapeHtml(previewName)}"` : '';

  return `<span class="quote-sheet__label quote-sheet__label--inline">${escapeHtml(label)}</span><span${previewAttribute}>${escapeHtml(value)}</span><br>`;
}

function lineBreaks(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

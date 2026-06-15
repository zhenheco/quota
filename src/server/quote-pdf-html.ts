import { createQuoteDocumentView } from './quote-document-view';
import type { Company, Quote } from './types';

export interface QuotePdfBrand {
  logo?: ArrayBuffer | null;
  stamp?: ArrayBuffer | null;
  bank?: ArrayBuffer | null;
}

export interface QuotePdfHtmlInput {
  quote: Quote;
  company: Company;
  brand: QuotePdfBrand;
}

export function buildQuoteHtml({ quote, company, brand }: QuotePdfHtmlInput): string {
  const view = createQuoteDocumentView({ quote, company });
  const logo = brand.logo ? imageDataUri(brand.logo) : null;
  const stamp = brand.stamp ? imageDataUri(brand.stamp) : null;
  const bank = brand.bank ? imageDataUri(brand.bank) : null;

  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Noto+Serif+TC:wght@700;900&display=swap" rel="stylesheet">
    <title>${escapeHtml(view.quoteNo)} ${escapeHtml(view.subject)}</title>
    <style>${css()}</style>
  </head>
  <body>
    <article class="${view.sheetClass}" aria-label="報價單預覽">
      <header class="quotation-sheet__header">
        <div>
          ${logo ? `<img class="brand-asset" src="${logo}" alt="${escapeHtml(view.companyName)}">` : ''}
          <p class="eyebrow">QUOTATION</p>
          <h1 class="quotation-title">${escapeHtml(view.subject)}</h1>
          <p>${escapeHtml(view.companyName)}</p>
          <p class="muted">
            <span>${escapeHtml(view.companyAddress)}</span>${view.companyAddress && view.companyPhone ? ' / ' : ''}<span>${escapeHtml(view.companyPhone)}</span>
          </p>
          ${view.companyTaxId ? `<p class="muted">統編 <span>${escapeHtml(view.companyTaxId)}</span></p>` : ''}
        </div>
        <div class="quote-meta">
          <div><span>報價單號</span><strong>${escapeHtml(view.quoteNo)}</strong></div>
          <div><span>報價日期</span><strong>${escapeHtml(view.quoteDate)}</strong></div>
          <div><span>有效期限</span><strong>${escapeHtml(view.validUntil)}</strong></div>
        </div>
      </header>

      <section class="document-section document-grid">
        <div>
          <p class="eyebrow">CLIENT</p>
          <h2>${escapeHtml(view.clientName)}</h2>
          <p>
            <span>${escapeHtml(view.clientContact)}</span>${view.clientContact && view.clientPhone ? ' / ' : ''}<span>${escapeHtml(view.clientPhone)}</span>
          </p>
          ${view.clientTaxId ? `<p>統編 <span>${escapeHtml(view.clientTaxId)}</span></p>` : ''}
        </div>
        <div>
          <p class="eyebrow">TERMS</p>
          <p>${lineBreaks(view.notes)}</p>
        </div>
      </section>

      <section class="document-section">
        <table class="quote-items">
          <thead>
            <tr>
              <th>品項</th>
              <th>說明</th>
              <th class="num">數量</th>
              <th>單位</th>
              <th class="num">單價</th>
              <th class="num">小計</th>
            </tr>
          </thead>
          <tbody>
            ${view.items
              .map(
                (item) => `<tr>
              <td>${escapeHtml(item.name)}</td>
              <td>${escapeHtml(item.description)}</td>
              <td class="num">${escapeHtml(item.qtyLabel)}</td>
              <td>${escapeHtml(item.unit)}</td>
              <td class="num">${escapeHtml(item.unitPriceLabel)}</td>
              <td class="num">${escapeHtml(item.amountLabel)}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </section>

      <section class="document-section totals">
        <div><span>未稅小計</span><strong>${escapeHtml(view.subtotalLabel)}</strong></div>
        ${
          view.showTaxRows
            ? `<div data-label="稅金"><span>營業稅 <span>${escapeHtml(view.taxRateLabel)}</span><span class="sr-only">稅金</span></span><strong>${escapeHtml(view.taxAmountLabel)}</strong></div>`
            : ''
        }
        <div class="grand"><span>總計</span><strong>${escapeHtml(view.totalLabel)}</strong></div>
      </section>

      <section class="document-section document-grid footer-grid">
        <div>
          <p class="eyebrow">BANK</p>
          <p>${lineBreaks(view.bankInfo)}</p>
          ${bank ? `<img class="brand-asset brand-asset--bank" src="${bank}" alt="匯款資訊">` : ''}
        </div>
        <div class="stamp-box">
          ${stamp ? `<img class="brand-asset brand-asset--stamp" src="${stamp}" alt="公司章">` : ''}
        </div>
      </section>
    </article>
  </body>
</html>`;
}

function css(): string {
  return `
    :root {
      --gold: #B97E19;
      --ink: #2f2c28;
      --muted: #6f6b66;
      --line: #e8e0d4;
      --surface: #ffffff;
      --font-body: "Noto Sans TC", system-ui, sans-serif;
      --font-display: "Noto Serif TC", "Noto Sans TC", serif;
    }

    @page {
      size: A4;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      background: #ffffff;
      color: var(--ink);
      font-family: var(--font-body);
      font-size: 13px;
      line-height: 1.65;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      display: block;
    }

    p,
    h1,
    h2 {
      margin: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      border-bottom: 1px solid var(--line);
      padding: 10px 9px;
      text-align: left;
      vertical-align: top;
    }

    .num {
      text-align: right;
      white-space: nowrap;
    }

    .muted {
      color: var(--muted);
    }

    .eyebrow {
      color: var(--gold);
      font-size: 0.74rem;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .quotation-sheet {
      width: 100%;
      min-height: calc(297mm - 24mm);
      margin: 0;
      padding: 0;
      background: var(--surface);
      color: var(--ink);
    }

    .quotation-sheet__header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 28px;
      border-bottom: 1px solid var(--gold);
      padding-bottom: 26px;
    }

    .quotation-title {
      color: var(--gold);
      font-family: var(--font-display);
      font-size: 2.2rem;
      font-weight: 900;
      line-height: 1.25;
      margin: 2px 0 4px;
    }

    .quote-meta {
      min-width: 220px;
      font-size: 0.86rem;
    }

    .quote-meta div {
      display: flex;
      justify-content: space-between;
      gap: 18px;
    }

    .quote-meta span:first-child {
      color: var(--gold);
      font-weight: 700;
    }

    .document-section {
      margin-top: 28px;
    }

    .document-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }

    .document-grid h2 {
      font-size: 1.24rem;
      line-height: 1.35;
    }

    .quote-items th {
      background: var(--gold);
      color: white;
      font-weight: 900;
    }

    .quote-items td {
      padding-block: 11px;
    }

    .totals {
      width: min(340px, 100%);
      margin-left: auto;
    }

    .totals div {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid var(--line);
      padding: 7px 0;
    }

    .totals .grand {
      border-bottom-color: var(--gold);
      color: var(--gold);
      font-size: 1.35rem;
      font-weight: 900;
    }

    .brand-asset {
      display: block;
      max-width: 180px;
      max-height: 70px;
      object-fit: contain;
      margin-bottom: 8px;
    }

    .brand-asset--bank {
      margin-top: 10px;
      max-width: 240px;
      max-height: 88px;
    }

    .stamp-box {
      display: flex;
      justify-content: flex-end;
      align-items: flex-start;
      min-height: 76px;
    }

    .brand-asset--stamp {
      max-width: 160px;
      max-height: 96px;
      margin-bottom: 0;
    }

    .footer-grid {
      break-inside: avoid;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
    }
  `;
}

function lineBreaks(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function escapeHtml(value: string): string {
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

function imageDataUri(bytes: ArrayBuffer): string {
  const contentType = detectImageContentType(bytes);

  return `data:${contentType};base64,${arrayBufferToBase64(bytes)}`;
}

function detectImageContentType(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);

  if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e && view[3] === 0x47) {
    return 'image/png';
  }

  if (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    view[0] === 0x52 &&
    view[1] === 0x49 &&
    view[2] === 0x46 &&
    view[3] === 0x46 &&
    view[8] === 0x57 &&
    view[9] === 0x45 &&
    view[10] === 0x42 &&
    view[11] === 0x50
  ) {
    return 'image/webp';
  }

  if (view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46) {
    return 'image/gif';
  }

  return 'image/png';
}

function arrayBufferToBase64(bytes: ArrayBuffer): string {
  let binary = '';
  const view = new Uint8Array(bytes);

  for (let index = 0; index < view.length; index += 1) {
    binary += String.fromCharCode(view[index]);
  }

  return btoa(binary);
}

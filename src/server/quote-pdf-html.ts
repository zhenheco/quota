import {
  QUOTE_DOCUMENT_CSS,
  escapeHtml,
  renderQuoteDocumentBody,
} from '../shared/quote-document-template';
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
    <style>${QUOTE_DOCUMENT_CSS}</style>
  </head>
  <body style="margin:0">
    ${renderQuoteDocumentBody(view, { logo, stamp, bank })}
  </body>
</html>`;
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

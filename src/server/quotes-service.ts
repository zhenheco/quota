import { getBrandAsset } from './brand';
import { companyRepo, quotesRepo } from './db';
import { generateQuotePdf, type QuotePdfEnv } from './quote-pdf';
import { buildQuoteHtml } from './quote-pdf-html';
import { generateQuoteXlsx } from './quote-xlsx';
import type { Quote, QuoteListFilter, QuoteStatus } from './types';
import { ValidationError, type ValidQuoteInput } from './validation';

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PDF_CONTENT_TYPE = 'application/pdf';
const COMPANY_PROFILE_REQUIRED_MESSAGE =
  '請先在設定頁填寫公司名稱再建立報價單。(Set your company name in Settings before creating a quote.)';

export interface QuoteSummary {
  id: number;
  quote_no: string;
  view_url: string;
  xlsx_url: string;
}

export interface QuoteXlsxDownload {
  bytes: Uint8Array;
  filename: string;
}

export interface QuotePdfDownload {
  bytes: Uint8Array;
  filename: string;
}

interface QuotesEnv {
  DB: D1Database;
  FILES: R2Bucket;
}

type QuotesPdfEnv = QuotesEnv & Partial<QuotePdfEnv>;

export async function listQuotes(env: QuotesEnv, filter: QuoteListFilter = {}): Promise<Quote[]> {
  return quotesRepo(env.DB).list(filter);
}

export async function createQuote(env: QuotesEnv, input: ValidQuoteInput): Promise<QuoteSummary> {
  await assertCompanyProfileReady(env);

  const { items, ...quoteInput } = input;
  const repo = quotesRepo(env.DB);
  const quote = await repo.create(quoteInput, items);
  let updated: Quote;

  try {
    updated = await writeQuoteXlsx(env, quote);
  } catch (error) {
    await env.FILES.delete(quoteXlsxKey(quote));
    await repo.delete(quote.id);
    throw error;
  }

  return quoteSummary(updated);
}

export async function getQuote(env: QuotesEnv, id: number): Promise<Quote | null> {
  return quotesRepo(env.DB).get(id);
}

export async function updateQuote(env: QuotesEnv, id: number, input: ValidQuoteInput): Promise<Quote | null> {
  const existing = await quotesRepo(env.DB).get(id);

  if (existing === null) {
    return null;
  }

  const { items, ...quoteInput } = input;

  const quote = await quotesRepo(env.DB).update(id, quoteInput, items);

  return writeQuoteXlsx(env, quote);
}

export async function updateQuoteStatus(env: QuotesEnv, id: number, status: QuoteStatus): Promise<Quote | null> {
  const existing = await quotesRepo(env.DB).get(id);

  if (existing === null) {
    return null;
  }

  return quotesRepo(env.DB).updateStatus(id, status);
}

export async function deleteQuote(env: QuotesEnv, id: number): Promise<boolean> {
  const existing = await quotesRepo(env.DB).get(id);

  if (existing === null) {
    return false;
  }

  if (existing.xlsx_key !== null) {
    await env.FILES.delete(existing.xlsx_key);
  }

  if (existing.pdf_key !== null) {
    await env.FILES.delete(existing.pdf_key);
  }

  await quotesRepo(env.DB).delete(id);

  return true;
}

export async function regenerateXlsx(env: QuotesEnv, id: number): Promise<QuoteSummary | null> {
  const quote = await quotesRepo(env.DB).get(id);

  if (quote === null) {
    return null;
  }

  const updated = await writeQuoteXlsx(env, quote);

  return quoteSummary(updated);
}

export async function getQuoteXlsx(env: QuotesEnv, id: number): Promise<QuoteXlsxDownload | null> {
  const quote = await quotesRepo(env.DB).get(id);

  if (quote === null || quote.xlsx_key === null) {
    return null;
  }

  const object = await env.FILES.get(quote.xlsx_key);

  if (object === null) {
    return null;
  }

  return {
    bytes: new Uint8Array(await object.arrayBuffer()),
    filename: quoteDownloadFilename(quote),
  };
}

export async function generateQuotePdfDownload(env: QuotesPdfEnv, id: number): Promise<QuotePdfDownload | null> {
  const quote = await quotesRepo(env.DB).get(id);

  if (quote === null) {
    return null;
  }

  const company = await companyRepo(env.DB).get();
  const html = buildQuoteHtml({
    quote,
    company,
    brand: {
      logo: company.logo_key ? await getBrandAsset(env, company.logo_key) : null,
      stamp: company.stamp_key ? await getBrandAsset(env, company.stamp_key) : null,
      bank: company.bank_image_key ? await getBrandAsset(env, company.bank_image_key) : null,
    },
  });

  if (env.BROWSER === undefined) {
    throw new Error('Browser Rendering binding BROWSER is not configured.');
  }

  const bytes = await generateQuotePdf({ BROWSER: env.BROWSER }, html);
  const key = quotePdfKey(quote);

  await env.FILES.put(key, bytes, {
    httpMetadata: {
      contentType: PDF_CONTENT_TYPE,
    },
  });

  await quotesRepo(env.DB).updatePdfKey(quote.id, key);

  return {
    bytes,
    filename: quoteDownloadFilename(quote, 'pdf'),
  };
}

export function parseQuoteStatus(value: string | null): QuoteStatus | undefined {
  if (value === 'draft' || value === 'sent' || value === 'accepted' || value === 'void') {
    return value;
  }

  return undefined;
}

function quoteSummary(quote: Quote): QuoteSummary {
  return {
    id: quote.id,
    quote_no: quote.quote_no,
    view_url: `/q/${quote.id}`,
    xlsx_url: `/api/quotes/${quote.id}/xlsx`,
  };
}

async function writeQuoteXlsx(env: QuotesEnv, quote: Quote): Promise<Quote> {
  const company = await companyRepo(env.DB).get();
  const bytes = await generateQuoteXlsx({
    quote,
    items: quote.items,
    company,
    brand: {
      logo: company.logo_key ? await getBrandAsset(env, company.logo_key) : null,
      stamp: company.stamp_key ? await getBrandAsset(env, company.stamp_key) : null,
      bank: company.bank_image_key ? await getBrandAsset(env, company.bank_image_key) : null,
    },
  });
  const key = quoteXlsxKey(quote);

  await env.FILES.put(key, bytes, {
    httpMetadata: {
      contentType: XLSX_CONTENT_TYPE,
    },
  });

  return quotesRepo(env.DB).updateXlsxKey(quote.id, key);
}

async function assertCompanyProfileReady(env: QuotesEnv): Promise<void> {
  const company = await companyRepo(env.DB).get();

  if (company.name.trim() === '') {
    throw new ValidationError(COMPANY_PROFILE_REQUIRED_MESSAGE);
  }
}

function quoteXlsxKey(quote: Quote): string {
  return `quotes/${quote.quote_no}/${quote.quote_no}.xlsx`;
}

function quotePdfKey(quote: Quote): string {
  return `quotes/${quote.quote_no}/${quote.quote_no}.pdf`;
}

function quoteDownloadFilename(quote: Quote, extension = 'xlsx'): string {
  return `${filenamePart(quote.quote_date)}_${filenamePart(quote.client_name)}_${filenamePart(quote.subject)}_報價單.${extension}`;
}

function filenamePart(value: string | null): string {
  const normalized = value?.trim().replace(/[\\/:*?"<>|]+/g, '-') ?? '';

  return normalized === '' ? 'quote' : normalized;
}

export { PDF_CONTENT_TYPE, XLSX_CONTENT_TYPE };

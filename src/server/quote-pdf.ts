import puppeteer from '@cloudflare/puppeteer';
import type { BrowserWorker } from '@cloudflare/puppeteer';

export interface QuotePdfEnv {
  BROWSER: BrowserWorker;
}

export async function generateQuotePdf(env: QuotePdfEnv, html: string): Promise<Uint8Array> {
  const browser = await puppeteer.launch(env.BROWSER);

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0',
      },
    });

    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}

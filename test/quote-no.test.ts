import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { nextQuoteNo } from '../src/server/quote-no';

async function clearQuotes(): Promise<void> {
  await env.DB.prepare('DELETE FROM quotes').run();
}

describe('nextQuoteNo', () => {
  beforeEach(async () => {
    await clearQuotes();
  });

  it('increments quote numbers for the same day', async () => {
    await expect(nextQuoteNo(env.DB, '2026-06-14')).resolves.toBe('20260614-01');
    await expect(nextQuoteNo(env.DB, '2026-06-14')).resolves.toBe('20260614-02');
    await expect(nextQuoteNo(env.DB, '2026-06-14')).resolves.toBe('20260614-03');
  });

  it('starts from one for each different day', async () => {
    await expect(nextQuoteNo(env.DB, '2026-06-14')).resolves.toBe('20260614-01');
    await expect(nextQuoteNo(env.DB, '2026-06-15')).resolves.toBe('20260615-01');
  });

  it('reserves unique quote numbers under concurrent calls', async () => {
    const quoteNumbers = await Promise.all(
      Array.from({ length: 25 }, () => nextQuoteNo(env.DB, '2026-06-14'))
    );
    const sortedQuoteNumbers = [...quoteNumbers].sort();

    expect(new Set(quoteNumbers).size).toBe(25);
    expect(sortedQuoteNumbers[0]).toBe('20260614-01');
    expect(sortedQuoteNumbers.at(-1)).toBe('20260614-25');
  });
});

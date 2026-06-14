const maxRetries = 25;

function formatQuoteDate(date: Date | string): { prefix: string; quoteDate: string } {
  if (typeof date === 'string') {
    const quoteDate = date.slice(0, 10);

    return {
      prefix: quoteDate.replaceAll('-', ''),
      quoteDate,
    };
  }

  const quoteDate = date.toISOString().slice(0, 10);

  return {
    prefix: quoteDate.replaceAll('-', ''),
    quoteDate,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /unique|constraint/i.test(error.message);
}

export async function nextQuoteNo(db: D1Database, date: Date | string): Promise<string> {
  const { prefix, quoteDate } = formatQuoteDate(date);

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const row = await db
        .prepare(
          `INSERT INTO quotes (quote_no, quote_date)
           SELECT ?1 || '-' || printf('%02d', COALESCE(MAX(CAST(substr(quote_no, 10) AS INTEGER)), 0) + 1), ?2
           FROM quotes
           WHERE quote_no LIKE ?3
           RETURNING quote_no`
        )
        .bind(prefix, quoteDate, `${prefix}-%`)
        .first<{ quote_no: string }>();

      if (!row) {
        throw new Error('Failed to reserve quote number.');
      }

      return row.quote_no;
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === maxRetries - 1) {
        throw error;
      }
    }
  }

  throw new Error('Failed to reserve quote number.');
}

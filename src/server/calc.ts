import type { QuoteItemInput, QuoteTotals } from './types';

export function computeTotals(items: QuoteItemInput[], taxRate: number): QuoteTotals {
  const subtotal = items.reduce((sum, item) => sum + Math.round(item.qty * item.unit_price), 0);
  const taxAmount = Math.round(subtotal * taxRate);

  return {
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  };
}

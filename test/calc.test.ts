import { describe, expect, it } from 'vitest';
import { computeTotals } from '../src/server/calc';

describe('computeTotals', () => {
  it('calculates subtotal, tax amount, and total for a single item', () => {
    expect(computeTotals([{ name: 'Project', qty: 1, unit_price: 48000 }], 0.05)).toEqual({
      subtotal: 48000,
      taxAmount: 2400,
      total: 50400,
    });
  });

  it('sums multiple rounded item amounts before tax', () => {
    expect(
      computeTotals(
        [
          { name: 'Design', qty: 2, unit_price: 1500 },
          { name: 'Build', qty: 3, unit_price: 1000 },
        ],
        0.05
      )
    ).toEqual({
      subtotal: 6000,
      taxAmount: 300,
      total: 6300,
    });
  });

  it('rounds tax from the subtotal', () => {
    expect(computeTotals([{ name: 'Small item', qty: 1, unit_price: 333 }], 0.05)).toEqual({
      subtotal: 333,
      taxAmount: 17,
      total: 350,
    });
  });

  it('rounds each item amount from quantity times unit price', () => {
    expect(computeTotals([{ name: 'Hourly work', qty: 1.5, unit_price: 99 }], 0)).toEqual({
      subtotal: 149,
      taxAmount: 0,
      total: 149,
    });
  });
});

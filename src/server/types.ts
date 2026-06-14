export interface QuoteItemInput {
  name: string;
  description?: string | null;
  qty: number;
  unit?: string | null;
  unit_price: number;
}

export interface QuoteTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

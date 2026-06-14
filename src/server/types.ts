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

export interface Company {
  id: 1;
  name: string;
  address: string | null;
  phone: string | null;
  bank_info: string | null;
  default_tax_rate: number;
  default_notes: string | null;
  logo_key: string | null;
  stamp_key: string | null;
  bank_image_key: string | null;
}

export type CompanyPatch = Partial<Omit<Company, 'id'>>;

export interface ClientInput {
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface Client extends ClientInput {
  id: number;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientPatch = Partial<ClientInput>;

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'void';
export type CreatedVia = 'web' | 'chat';

export interface QuoteCreateInput {
  client_id?: number | null;
  client_name?: string | null;
  client_contact?: string | null;
  client_phone?: string | null;
  subject?: string | null;
  quote_date: string;
  valid_until?: string | null;
  tax_rate: number;
  notes?: string | null;
  created_via?: CreatedVia;
  xlsx_key?: string | null;
  pdf_key?: string | null;
}

export type QuoteUpdateInput = QuoteCreateInput;

export interface QuoteListFilter {
  client?: string;
  status?: QuoteStatus;
  date?: string;
}

export interface QuoteItem extends QuoteItemInput {
  id: number;
  quote_id: number;
  sort_order: number;
  description: string | null;
  unit: string | null;
  amount: number;
}

export interface Quote {
  id: number;
  quote_no: string;
  client_id: number | null;
  client_name: string | null;
  client_contact: string | null;
  client_phone: string | null;
  subject: string | null;
  quote_date: string | null;
  valid_until: string | null;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  status: QuoteStatus;
  xlsx_key: string | null;
  pdf_key: string | null;
  created_via: CreatedVia;
  created_at: string;
  updated_at: string;
  items: QuoteItem[];
}

export interface ApiClientOptions {
  baseUrl: string;
  token: string;
}

export interface QuoteItemInput {
  name: string;
  description?: string | null;
  qty: number;
  unit?: string | null;
  unit_price: number;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'void';

export interface QuoteInput {
  client_id?: number | null;
  client_name?: string | null;
  client_contact?: string | null;
  client_phone?: string | null;
  subject?: string | null;
  quote_date: string;
  valid_until?: string | null;
  tax_rate: number;
  notes?: string | null;
  created_via?: 'web' | 'chat';
  items: QuoteItemInput[];
}

export interface QuoteSummary {
  id: number;
  quote_no: string;
  view_url: string;
  xlsx_url: string;
}

export interface QuoteListFilter {
  status?: QuoteStatus;
  client?: string;
  date?: string;
}

export interface Client {
  id: number;
  name: string;
  contact: string | null;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  created_at?: string;
  updated_at?: string;
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

export interface ApiClient {
  readonly baseUrl: string;
  postQuote(input: QuoteInput): Promise<QuoteSummary>;
  listQuotes(filter?: QuoteListFilter): Promise<unknown[]>;
  getQuote(id: number | string): Promise<unknown>;
  listClients(): Promise<Client[]>;
  getCompany(): Promise<Company>;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      authorization: `Bearer ${options.token}`,
      ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
    };
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const message = await errorMessage(response);
      throw new Error(`Quota API request failed with status ${response.status}: ${message}`);
    }

    return (await response.json()) as T;
  }

  return {
    baseUrl,
    postQuote(input) {
      return request<QuoteSummary>('/api/quotes', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async listQuotes(filter = {}) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== '') {
          params.set(key, value);
        }
      }
      const suffix = params.size === 0 ? '' : `?${params.toString()}`;
      const body = await request<{ quotes: unknown[] }>(`/api/quotes${suffix}`, { method: 'GET' });
      return body.quotes;
    },
    async getQuote(id) {
      const body = await request<{ quote: unknown }>(`/api/quotes/${encodeURIComponent(String(id))}`, { method: 'GET' });
      return body.quote;
    },
    async listClients() {
      const body = await request<{ clients: Client[] }>('/api/clients', { method: 'GET' });
      return body.clients;
    },
    async getCompany() {
      const body = await request<{ company: Company }>('/api/company', { method: 'GET' });
      return body.company;
    },
  };
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === 'string' ? body.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

import { z } from 'zod';
import type { ApiClient, Client, QuoteInput, QuoteListFilter } from './api-client';

const quoteItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  qty: z.number().positive(),
  unit: z.string().nullish(),
  unit_price: z.number().nonnegative(),
});

const clientInputSchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    contact: z.string().nullish(),
    phone: z.string().nullish(),
  }),
]);

const createQuoteInputShape = {
  client: clientInputSchema,
  items: z.array(quoteItemSchema).min(1),
  subject: z.string().min(1),
  quote_date: z.string().optional(),
  valid_until: z.string().nullish(),
  tax_rate: z.number().nonnegative().optional(),
  notes: z.string().nullish(),
};

const createQuoteInputSchema = z.object(createQuoteInputShape);

const quoteStatusSchema = z.enum(['draft', 'sent', 'accepted', 'void']);

const listQuotesInputShape = {
  status: quoteStatusSchema.optional(),
  client: z.string().optional(),
  date: z.string().optional(),
};

const listQuotesInputSchema = z.object(listQuotesInputShape);

const getQuoteInputShape = {
  id: z.union([z.number().int().positive(), z.string().min(1)]),
};

const getQuoteInputSchema = z.object(getQuoteInputShape);
const emptyInputSchema = z.object({});

export interface ToolResult {
  content: [{ type: 'text'; text: string }];
  structuredContent?: Record<string, unknown>;
}

export interface QuotaTool<Input = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodRawShape;
  handler(input: Input): Promise<ToolResult>;
}

export function createQuotaTools(api: ApiClient) {
  return {
    create_quote: {
      name: 'create_quote',
      description: 'Create a quote through the Quota HTTP API.',
      inputSchema: createQuoteInputShape,
      async handler(input: unknown): Promise<ToolResult> {
        const parsed = createQuoteInputSchema.parse(input);
        const [company, clients] = await Promise.all([api.getCompany(), api.listClients()]);
        const payload = buildQuotePayload(parsed, company.default_tax_rate, company.default_notes, clients);
        const summary = await api.postQuote(payload);
        const viewUrl = absoluteUrl(api.baseUrl, summary.view_url);
        const xlsxUrl = absoluteUrl(api.baseUrl, summary.xlsx_url);

        return {
          content: [
            {
              type: 'text',
              text: `Created quote ${summary.quote_no}\nView: ${viewUrl}\nXLSX: ${xlsxUrl}`,
            },
          ],
          structuredContent: {
            id: summary.id,
            quote_no: summary.quote_no,
            view_url: viewUrl,
            xlsx_url: xlsxUrl,
          },
        };
      },
    } satisfies QuotaTool,
    list_quotes: {
      name: 'list_quotes',
      description: 'List quotes through the Quota HTTP API.',
      inputSchema: listQuotesInputShape,
      async handler(input: unknown): Promise<ToolResult> {
        const filter = listQuotesInputSchema.parse(input) satisfies QuoteListFilter;
        const quotes = await api.listQuotes(filter);

        return jsonToolResult('Quotes', { quotes });
      },
    } satisfies QuotaTool,
    get_quote: {
      name: 'get_quote',
      description: 'Read one quote by id through the Quota HTTP API.',
      inputSchema: getQuoteInputShape,
      async handler(input: unknown): Promise<ToolResult> {
        const parsed = getQuoteInputSchema.parse(input);
        const quote = await api.getQuote(parsed.id);

        return jsonToolResult('Quote', { quote });
      },
    } satisfies QuotaTool,
    list_clients: {
      name: 'list_clients',
      description: 'List clients through the Quota HTTP API.',
      inputSchema: {},
      async handler(input: unknown): Promise<ToolResult> {
        emptyInputSchema.parse(input);
        const clients = await api.listClients();

        return jsonToolResult('Clients', { clients });
      },
    } satisfies QuotaTool,
  };
}

type CreateQuoteInput = z.infer<typeof createQuoteInputSchema>;

function buildQuotePayload(
  input: CreateQuoteInput,
  defaultTaxRate: number,
  defaultNotes: string | null,
  clients: Client[]
): QuoteInput {
  const client = clientFields(input.client, clients);

  return omitUndefined({
    ...client,
    subject: input.subject,
    quote_date: input.quote_date ?? today(),
    valid_until: input.valid_until ?? null,
    tax_rate: input.tax_rate ?? defaultTaxRate,
    notes: input.notes ?? defaultNotes,
    created_via: 'chat' as const,
    items: input.items.map((item) =>
      omitUndefined({
        name: item.name,
        description: item.description ?? undefined,
        qty: item.qty,
        unit: item.unit ?? undefined,
        unit_price: item.unit_price,
      })
    ),
  });
}

function clientFields(input: CreateQuoteInput['client'], clients: Client[]): Partial<QuoteInput> {
  if (typeof input !== 'string') {
    return omitUndefined({
      client_name: input.name,
      client_contact: input.contact ?? undefined,
      client_phone: input.phone ?? undefined,
    });
  }

  const name = input.trim();
  const matched = matchClient(name, clients);

  if (matched !== undefined) {
    return omitUndefined({
      client_id: matched.id,
      client_name: matched.name,
      client_contact: matched.contact,
      client_phone: matched.phone,
    });
  }

  return { client_name: name };
}

function matchClient(name: string, clients: Client[]): Client | undefined {
  const normalized = normalize(name);
  const exact = clients.find((client) => normalize(client.name) === normalized);
  if (exact !== undefined) {
    return exact;
  }

  return clients.find((client) => {
    const clientName = normalize(client.name);
    return clientName.includes(normalized) || normalized.includes(clientName);
  });
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function absoluteUrl(baseUrl: string, pathOrUrl: string): string {
  return new URL(pathOrUrl, `${baseUrl}/`).toString();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function jsonToolResult(label: string, structuredContent: Record<string, unknown>): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: `${label}:\n${JSON.stringify(structuredContent, null, 2)}`,
      },
    ],
    structuredContent,
  };
}

function omitUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

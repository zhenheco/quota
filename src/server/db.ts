import { computeTotals } from './calc';
import { nextQuoteNo } from './quote-no';
import type {
  Client,
  ClientInput,
  ClientPatch,
  Company,
  CompanyPatch,
  Quote,
  QuoteCreateInput,
  QuoteItem,
  QuoteItemInput,
  QuoteListFilter,
  QuoteStatus,
  QuoteUpdateInput,
} from './types';

type QuoteRow = Omit<Quote, 'items'>;

async function requireRow<T>(row: T | null, message: string): Promise<T> {
  if (!row) {
    throw new Error(message);
  }

  return row;
}

export function companyRepo(db: D1Database) {
  async function get(): Promise<Company> {
    return requireRow(
      await db.prepare('SELECT * FROM company_profile WHERE id = 1').first<Company>(),
      'Company profile is missing.'
    );
  }

  return {
    get,
    async update(patch: CompanyPatch): Promise<Company> {
      const current = await get();

      await db
        .prepare(
          `UPDATE company_profile
           SET name = ?1, address = ?2, phone = ?3, bank_info = ?4, default_tax_rate = ?5,
               default_notes = ?6, logo_key = ?7, stamp_key = ?8, bank_image_key = ?9
           WHERE id = 1`
        )
        .bind(
          patch.name ?? current.name,
          patch.address ?? current.address,
          patch.phone ?? current.phone,
          patch.bank_info ?? current.bank_info,
          patch.default_tax_rate ?? current.default_tax_rate,
          patch.default_notes ?? current.default_notes,
          patch.logo_key ?? current.logo_key,
          patch.stamp_key ?? current.stamp_key,
          patch.bank_image_key ?? current.bank_image_key
        )
        .run();

      return get();
    },
  };
}

export function clientsRepo(db: D1Database) {
  async function get(id: number): Promise<Client | null> {
    return db.prepare('SELECT * FROM clients WHERE id = ?1').bind(id).first<Client>();
  }

  return {
    async create(input: ClientInput): Promise<Client> {
      const now = new Date().toISOString();
      const result = await db
        .prepare(
          `INSERT INTO clients (name, contact, phone, email, address, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
        )
        .bind(
          input.name,
          input.contact ?? null,
          input.phone ?? null,
          input.email ?? null,
          input.address ?? null,
          now,
          now
        )
        .run();

      return requireRow(await get(result.meta.last_row_id), 'Created client is missing.');
    },
    async list(): Promise<Client[]> {
      return db.prepare('SELECT * FROM clients ORDER BY id ASC').all<Client>().then((result) => result.results);
    },
    get,
    async update(id: number, patch: ClientPatch): Promise<Client> {
      const current = await requireRow(await get(id), 'Client is missing.');
      const now = new Date().toISOString();

      await db
        .prepare(
          `UPDATE clients
           SET name = ?1, contact = ?2, phone = ?3, email = ?4, address = ?5, updated_at = ?6
           WHERE id = ?7`
        )
        .bind(
          patch.name ?? current.name,
          patch.contact ?? current.contact,
          patch.phone ?? current.phone,
          patch.email ?? current.email,
          patch.address ?? current.address,
          now,
          id
        )
        .run();

      return requireRow(await get(id), 'Updated client is missing.');
    },
    async delete(id: number): Promise<void> {
      await db.prepare('DELETE FROM clients WHERE id = ?1').bind(id).run();
    },
  };
}

export function quotesRepo(db: D1Database) {
  async function get(id: number): Promise<Quote | null> {
    const row = await db.prepare('SELECT * FROM quotes WHERE id = ?1').bind(id).first<QuoteRow>();

    if (!row) {
      return null;
    }

    const items = await db
      .prepare('SELECT * FROM quote_items WHERE quote_id = ?1 ORDER BY sort_order ASC')
      .bind(id)
      .all<QuoteItem>()
      .then((result) => result.results);

    return {
      ...row,
      items,
    };
  }

  return {
    async list(filter: QuoteListFilter = {}): Promise<Quote[]> {
      const conditions: string[] = [];
      const bindings: Array<number | string> = [];

      if (filter.client !== undefined && filter.client.trim() !== '') {
        const client = filter.client.trim();
        const clientId = Number(client);

        if (Number.isInteger(clientId)) {
          conditions.push('client_id = ?');
          bindings.push(clientId);
        } else {
          conditions.push('client_name LIKE ?');
          bindings.push(`%${client}%`);
        }
      }

      if (filter.status !== undefined) {
        conditions.push('status = ?');
        bindings.push(filter.status);
      }

      if (filter.date !== undefined && filter.date.trim() !== '') {
        conditions.push('quote_date = ?');
        bindings.push(filter.date.trim());
      }

      const whereClause = conditions.length === 0 ? '' : `WHERE ${conditions.join(' AND ')}`;
      let statement = db.prepare(`SELECT * FROM quotes ${whereClause} ORDER BY quote_date DESC, id DESC`);

      if (bindings.length > 0) {
        statement = statement.bind(...bindings);
      }

      const rows = await statement.all<QuoteRow>().then((result) => result.results);

      return Promise.all(
        rows.map(async (row) => {
          const quote = await get(row.id);

          return requireRow(quote, 'Listed quote is missing.');
        })
      );
    },
    async create(input: QuoteCreateInput, items: QuoteItemInput[]): Promise<Quote> {
      const quoteNo = await nextQuoteNo(db, input.quote_date);
      const reserved = await requireRow(
        await db.prepare('SELECT id FROM quotes WHERE quote_no = ?1').bind(quoteNo).first<{ id: number }>(),
        'Reserved quote is missing.'
      );
      const client =
        input.client_id === undefined || input.client_id === null
          ? null
          : await requireRow(await clientsRepo(db).get(input.client_id), 'Client is missing.');
      const totals = computeTotals(items, input.tax_rate);
      const now = new Date().toISOString();
      const statements: D1PreparedStatement[] = [
        db
          .prepare(
            `UPDATE quotes
             SET client_id = ?1, client_name = ?2, client_contact = ?3, client_phone = ?4,
                 subject = ?5, quote_date = ?6, valid_until = ?7, tax_rate = ?8,
                 subtotal = ?9, tax_amount = ?10, total = ?11, notes = ?12,
                 created_via = ?13, xlsx_key = ?14, pdf_key = ?15, updated_at = ?16
             WHERE id = ?17`
          )
          .bind(
            input.client_id ?? null,
            client?.name ?? input.client_name ?? null,
            client?.contact ?? input.client_contact ?? null,
            client?.phone ?? input.client_phone ?? null,
            input.subject ?? null,
            input.quote_date,
            input.valid_until ?? null,
            input.tax_rate,
            totals.subtotal,
            totals.taxAmount,
            totals.total,
            input.notes ?? null,
            input.created_via ?? 'web',
            input.xlsx_key ?? null,
            input.pdf_key ?? null,
            now,
            reserved.id
          ),
      ];

      items.forEach((item, index) => {
        statements.push(
          db
            .prepare(
              `INSERT INTO quote_items
               (quote_id, sort_order, name, description, qty, unit, unit_price, amount)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
            )
            .bind(
              reserved.id,
              index + 1,
              item.name,
              item.description ?? null,
              item.qty,
              item.unit ?? null,
              item.unit_price,
              Math.round(item.qty * item.unit_price)
            )
        );
      });

      await db.batch(statements);

      return requireRow(await get(reserved.id), 'Created quote is missing.');
    },
    get,
    async update(id: number, input: QuoteUpdateInput, items: QuoteItemInput[]): Promise<Quote> {
      const current = await requireRow(await get(id), 'Quote is missing.');
      const client =
        input.client_id === undefined || input.client_id === null
          ? null
          : await requireRow(await clientsRepo(db).get(input.client_id), 'Client is missing.');
      const totals = computeTotals(items, input.tax_rate);
      const now = new Date().toISOString();
      const statements: D1PreparedStatement[] = [
        db
          .prepare(
            `UPDATE quotes
             SET client_id = ?1, client_name = ?2, client_contact = ?3, client_phone = ?4,
                 subject = ?5, quote_date = ?6, valid_until = ?7, tax_rate = ?8,
                 subtotal = ?9, tax_amount = ?10, total = ?11, notes = ?12,
                 created_via = ?13, updated_at = ?14
             WHERE id = ?15`
          )
          .bind(
            input.client_id ?? null,
            client?.name ?? input.client_name ?? null,
            client?.contact ?? input.client_contact ?? null,
            client?.phone ?? input.client_phone ?? null,
            input.subject ?? null,
            input.quote_date,
            input.valid_until ?? null,
            input.tax_rate,
            totals.subtotal,
            totals.taxAmount,
            totals.total,
            input.notes ?? null,
            input.created_via ?? current.created_via,
            now,
            id
          ),
        db.prepare('DELETE FROM quote_items WHERE quote_id = ?1').bind(id),
      ];

      items.forEach((item, index) => {
        statements.push(
          db
            .prepare(
              `INSERT INTO quote_items
               (quote_id, sort_order, name, description, qty, unit, unit_price, amount)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
            )
            .bind(
              id,
              index + 1,
              item.name,
              item.description ?? null,
              item.qty,
              item.unit ?? null,
              item.unit_price,
              Math.round(item.qty * item.unit_price)
            )
        );
      });

      await db.batch(statements);

      return requireRow(await get(id), 'Updated quote is missing.');
    },
    async updateXlsxKey(id: number, xlsxKey: string): Promise<Quote> {
      await db
        .prepare('UPDATE quotes SET xlsx_key = ?1, updated_at = ?2 WHERE id = ?3')
        .bind(xlsxKey, new Date().toISOString(), id)
        .run();

      return requireRow(await get(id), 'Updated quote is missing.');
    },
    async updateStatus(id: number, status: QuoteStatus): Promise<Quote> {
      await db
        .prepare('UPDATE quotes SET status = ?1, updated_at = ?2 WHERE id = ?3')
        .bind(status, new Date().toISOString(), id)
        .run();

      return requireRow(await get(id), 'Updated quote is missing.');
    },
    async delete(id: number): Promise<void> {
      await db.batch([
        db.prepare('DELETE FROM quote_items WHERE quote_id = ?1').bind(id),
        db.prepare('DELETE FROM quotes WHERE id = ?1').bind(id),
      ]);
    },
  };
}

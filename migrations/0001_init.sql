PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS company_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  bank_info TEXT DEFAULT '',
  default_tax_rate REAL NOT NULL DEFAULT 0.05,
  default_notes TEXT DEFAULT '',
  logo_key TEXT,
  stamp_key TEXT,
  bank_image_key TEXT
);

INSERT OR IGNORE INTO company_profile (id) VALUES (1);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_no TEXT UNIQUE NOT NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  client_contact TEXT,
  client_phone TEXT,
  subject TEXT,
  quote_date TEXT,
  valid_until TEXT,
  tax_rate REAL NOT NULL DEFAULT 0.05,
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'void')),
  xlsx_key TEXT,
  pdf_key TEXT,
  created_via TEXT NOT NULL DEFAULT 'web' CHECK (created_via IN ('web', 'chat')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS quote_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  qty REAL NOT NULL,
  unit TEXT,
  unit_price INTEGER NOT NULL,
  amount INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quotes_quote_no ON quotes(quote_no);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_date ON quotes(quote_date);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);

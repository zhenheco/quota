ALTER TABLE clients ADD COLUMN tax_id TEXT;
ALTER TABLE quotes ADD COLUMN client_tax_id TEXT;
ALTER TABLE company_profile ADD COLUMN tax_id TEXT NOT NULL DEFAULT '';

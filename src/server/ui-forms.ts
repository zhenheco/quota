import { parseQuoteStatus } from './quotes-service';
import type { ClientInput, ClientPatch, CompanyPatch, QuoteStatus } from './types';
import { validateQuoteInput, type ValidationResult } from './validation';

export function quoteInputFromForm(data: FormData): ValidationResult {
  const names = strings(data, 'item_name');
  const descriptions = strings(data, 'item_description');
  const qtys = strings(data, 'item_qty');
  const units = strings(data, 'item_unit');
  const unitPrices = strings(data, 'item_unit_price');
  const items = names
    .map((name, index) => ({
      name,
      description: descriptions[index] ?? '',
      qty: numberValue(qtys[index]),
      unit: units[index] ?? '',
      unit_price: numberValue(unitPrices[index]),
    }))
    .filter((item) => item.name.trim() !== '');

  return validateQuoteInput({
    client_id: optionalInteger(data.get('client_id')),
    client_name: stringValue(data.get('client_name')),
    client_contact: stringValue(data.get('client_contact')),
    client_tax_id: stringValue(data.get('client_tax_id')),
    client_phone: stringValue(data.get('client_phone')),
    subject: stringValue(data.get('subject')),
    quote_date: stringValue(data.get('quote_date')),
    valid_until: stringValue(data.get('valid_until')),
    tax_rate: numberValue(stringValue(data.get('tax_rate'))),
    notes: stringValue(data.get('notes')),
    created_via: 'web',
    items,
  });
}

export function clientInputFromForm(data: FormData): ClientInput {
  return {
    name: requiredString(data.get('name')),
    contact: stringValue(data.get('contact')),
    tax_id: stringValue(data.get('tax_id')),
    phone: stringValue(data.get('phone')),
    email: stringValue(data.get('email')),
    address: stringValue(data.get('address')),
  };
}

export function clientPatchFromForm(data: FormData): ClientPatch {
  return clientInputFromForm(data);
}

export function companyPatchFromForm(data: FormData): CompanyPatch {
  return {
    name: requiredString(data.get('name')),
    tax_id: stringValue(data.get('tax_id')) ?? '',
    address: stringValue(data.get('address')),
    phone: stringValue(data.get('phone')),
    bank_info: stringValue(data.get('bank_info')),
    default_tax_rate: numberValue(stringValue(data.get('default_tax_rate'))),
    default_notes: stringValue(data.get('default_notes')),
  };
}

export function quoteStatusFromForm(data: FormData): QuoteStatus | undefined {
  return parseQuoteStatus(stringValue(data.get('status')));
}

export function formId(data: FormData, field = 'id'): number | null {
  return optionalInteger(data.get(field));
}

export function actionFromForm(data: FormData): string {
  return stringValue(data.get('action')) ?? '';
}

export function stringValue(value: FormDataEntryValue | string | null | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function requiredString(value: FormDataEntryValue | null): string {
  return stringValue(value) ?? '';
}

function strings(data: FormData, field: string): string[] {
  return data.getAll(field).map((value) => stringValue(value) ?? '');
}

function numberValue(value: string | null | undefined): number {
  const normalized = value?.trim() ?? '';
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function optionalInteger(value: FormDataEntryValue | null): number | null {
  const parsed = Number(stringValue(value));

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

import { companyRepo } from './db';
import type { Company, CompanyPatch } from './types';

interface CompanyEnv {
  DB: D1Database;
}

export interface CompanyValidationResult {
  ok: boolean;
  value?: CompanyPatch;
  error?: string;
}

export async function getCompany(env: CompanyEnv): Promise<Company> {
  return companyRepo(env.DB).get();
}

export async function updateCompany(env: CompanyEnv, patch: CompanyPatch): Promise<Company> {
  return companyRepo(env.DB).update(patch);
}

export function validateCompanyPatch(payload: unknown): CompanyValidationResult {
  if (!isRecord(payload)) {
    return { ok: false, error: 'Company payload must be an object.' };
  }

  const patch: CompanyPatch = {};

  if ('name' in payload) {
    if (typeof payload.name !== 'string') {
      return { ok: false, error: 'name must be a string.' };
    }

    patch.name = payload.name;
  }

  for (const field of ['address', 'phone', 'bank_info', 'default_notes'] as const) {
    if (field in payload) {
      patch[field] = optionalString(payload[field]);
    }
  }

  if ('default_tax_rate' in payload) {
    if (typeof payload.default_tax_rate !== 'number' || !Number.isFinite(payload.default_tax_rate)) {
      return { ok: false, error: 'default_tax_rate must be a number.' };
    }

    patch.default_tax_rate = payload.default_tax_rate;
  }

  for (const field of ['logo_key', 'stamp_key', 'bank_image_key'] as const) {
    if (field in payload) {
      patch[field] = optionalString(payload[field]);
    }
  }

  return { ok: true, value: patch };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return typeof value === 'string' ? value : String(value);
}

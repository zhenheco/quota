import { clientsRepo } from './db';
import type { Client, ClientInput, ClientPatch } from './types';

interface ClientsEnv {
  DB: D1Database;
}

export interface ClientValidationResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export async function listClients(env: ClientsEnv): Promise<Client[]> {
  return clientsRepo(env.DB).list();
}

export async function createClient(env: ClientsEnv, input: ClientInput): Promise<Client> {
  return clientsRepo(env.DB).create(input);
}

export async function getClient(env: ClientsEnv, id: number): Promise<Client | null> {
  return clientsRepo(env.DB).get(id);
}

export async function updateClient(env: ClientsEnv, id: number, patch: ClientPatch): Promise<Client | null> {
  const existing = await clientsRepo(env.DB).get(id);

  if (existing === null) {
    return null;
  }

  return clientsRepo(env.DB).update(id, patch);
}

export async function deleteClient(env: ClientsEnv, id: number): Promise<boolean> {
  const existing = await clientsRepo(env.DB).get(id);

  if (existing === null) {
    return false;
  }

  await clientsRepo(env.DB).delete(id);

  return true;
}

export function validateClientInput(payload: unknown): ClientValidationResult<ClientInput> {
  if (!isRecord(payload)) {
    return { ok: false, error: 'Client payload must be an object.' };
  }

  const name = stringValue(payload.name);

  if (name === null || name.trim() === '') {
    return { ok: false, error: 'name is required.' };
  }

  return {
    ok: true,
    value: {
      name: name.trim(),
      contact: optionalString(payload.contact),
      tax_id: optionalTaxId(payload.tax_id),
      phone: optionalString(payload.phone),
      email: optionalString(payload.email),
      address: optionalString(payload.address),
    },
  };
}

export function validateClientPatch(payload: unknown): ClientValidationResult<ClientPatch> {
  if (!isRecord(payload)) {
    return { ok: false, error: 'Client payload must be an object.' };
  }

  const patch: ClientPatch = {};

  if ('name' in payload) {
    const name = stringValue(payload.name);

    if (name === null || name.trim() === '') {
      return { ok: false, error: 'name must not be empty.' };
    }

    patch.name = name.trim();
  }

  if ('contact' in payload) {
    patch.contact = optionalString(payload.contact);
  }

  if ('tax_id' in payload) {
    patch.tax_id = optionalTaxId(payload.tax_id);
  }

  if ('phone' in payload) {
    patch.phone = optionalString(payload.phone);
  }

  if ('email' in payload) {
    patch.email = optionalString(payload.email);
  }

  if ('address' in payload) {
    patch.address = optionalString(payload.address);
  }

  return { ok: true, value: patch };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return typeof value === 'string' ? value : String(value);
}

function optionalTaxId(value: unknown): string | null {
  const normalized = optionalString(value)?.trim() ?? '';

  return normalized === '' ? null : normalized;
}

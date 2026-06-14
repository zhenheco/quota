import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { companyRepo } from '../src/server/db';
import { PUT as uploadBrandAsset } from '../src/pages/api/company/brand/[asset]';
import { authHeaders, context } from './helpers';

async function resetCompany(): Promise<void> {
  await env.DB.prepare(
    `UPDATE company_profile
     SET name = '', address = '', phone = '', bank_info = '', default_tax_rate = 0.05,
         default_notes = '', logo_key = NULL, stamp_key = NULL, bank_image_key = NULL
     WHERE id = 1`
  ).run();
}

describe('company brand upload API route', () => {
  beforeEach(async () => {
    await resetCompany();
    await env.FILES.delete('brand/logo.png');
    await env.FILES.delete('brand/stamp.png');
    await env.FILES.delete('brand/bank.jpg');
  });

  it('rejects PUT /api/company/brand/logo without a token', async () => {
    const response = await uploadBrandAsset(
      context(
        '/api/company/brand/logo',
        {
          method: 'PUT',
          headers: { 'content-type': 'image/png' },
          body: new Uint8Array([1, 2, 3]),
        },
        { asset: 'logo' }
      )
    );

    expect(response.status).toBe(401);
  });

  it('stores uploaded logo bytes in R2 and updates company.logo_key', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const response = await uploadBrandAsset(
      context(
        '/api/company/brand/logo',
        {
          method: 'PUT',
          headers: {
            ...authHeaders(),
            'content-type': 'image/png',
          },
          body: bytes,
        },
        { asset: 'logo' }
      )
    );

    const object = await env.FILES.get('brand/logo.png');
    const company = await companyRepo(env.DB).get();

    expect(response.status).toBe(200);
    expect(object).not.toBeNull();
    expect([...(new Uint8Array((await object?.arrayBuffer()) ?? new ArrayBuffer(0)))]).toEqual([...bytes]);
    expect(company.logo_key).toBe('brand/logo.png');
  });

  it('rejects assets outside the allowlist', async () => {
    const response = await uploadBrandAsset(
      context(
        '/api/company/brand/favicon',
        {
          method: 'PUT',
          headers: {
            ...authHeaders(),
            'content-type': 'image/png',
          },
          body: new Uint8Array([1, 2, 3]),
        },
        { asset: 'favicon' }
      )
    );

    expect(response.status).toBe(400);
  });
});

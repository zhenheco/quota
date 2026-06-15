import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { companyRepo } from '../src/server/db';
import {
  GET as getBrandAsset,
  PUT as uploadBrandAsset,
} from '../src/pages/api/company/brand/[asset]';
import { authHeaders, context } from './helpers';

async function resetCompany(): Promise<void> {
  await env.DB.prepare(
    `UPDATE company_profile
     SET name = '', address = '', phone = '', contact = '', bank_info = '', default_tax_rate = 0.05,
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

  it('rejects brand uploads when Content-Length is over 5MB', async () => {
    const response = await uploadBrandAsset(
      context(
        '/api/company/brand/logo',
        {
          method: 'PUT',
          headers: {
            ...authHeaders(),
            'content-type': 'image/png',
            'content-length': String(5 * 1024 * 1024 + 1),
          },
          body: new Uint8Array([1, 2, 3]),
        },
        { asset: 'logo' }
      )
    );

    expect(response.status).toBe(413);
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

  it('serves configured brand assets with ETag revalidation', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    await env.FILES.put('brand/logo.png', bytes, {
      httpMetadata: {
        contentType: 'image/png',
      },
    });
    await env.DB.prepare("UPDATE company_profile SET logo_key = 'brand/logo.png' WHERE id = 1").run();

    const response = await getBrandAsset(context('/api/company/brand/logo', {}, { asset: 'logo' }));
    const etag = response.headers.get('etag');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('public, max-age=60, must-revalidate');
    expect(etag).toBeTruthy();
    expect([...(new Uint8Array(await response.arrayBuffer()))]).toEqual([...bytes]);

    const cached = await getBrandAsset(
      context(
        '/api/company/brand/logo',
        {
          headers: {
            'if-none-match': etag ?? '',
          },
        },
        { asset: 'logo' }
      )
    );

    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe('');
  });

  it('returns 404 for unknown or unconfigured brand assets', async () => {
    const unknown = await getBrandAsset(context('/api/company/brand/favicon', {}, { asset: 'favicon' }));
    const unconfigured = await getBrandAsset(context('/api/company/brand/logo', {}, { asset: 'logo' }));

    expect(unknown.status).toBe(404);
    expect(unconfigured.status).toBe(404);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { parseSeedBrandArgs, uploadBrandAsset } from '../scripts/seed-brand.mjs';

describe('seed-brand CLI helpers', () => {
  it('requires an API URL and token from flags or env', () => {
    expect(() => parseSeedBrandArgs(['--logo', 'logo.png'], {})).toThrow('Missing --url or QUOTA_API_URL.');
    expect(() => parseSeedBrandArgs(['--', '--logo', 'logo.png'], {})).toThrow('Missing --url or QUOTA_API_URL.');
    expect(() => parseSeedBrandArgs(['--url', 'https://quota.example', '--logo', 'logo.png'], {})).toThrow(
      'Missing --token or QUOTA_API_TOKEN.'
    );
  });

  it('uploads one asset to the brand endpoint with bearer auth and bytes', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ key: 'brand/logo.png' }), { status: 200 }));
    const bytes = new Uint8Array([1, 2, 3]);

    const result = await uploadBrandAsset({
      asset: 'logo',
      bytes,
      contentType: 'image/png',
      fetchImpl,
      token: 'test-token',
      url: 'https://quota.example/',
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://quota.example/api/company/brand/logo', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer test-token',
        'content-type': 'image/png',
      },
      body: bytes,
    });
    expect(result).toEqual({ key: 'brand/logo.png' });
  });
});

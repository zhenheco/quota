import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getBrandAsset, putBrandAsset } from '../src/server/brand';

describe('brand assets', () => {
  it('round-trips brand bytes through R2 and returns null for missing keys', async () => {
    const key = `brand/logo-${crypto.randomUUID()}.png`;
    const bytes = new Uint8Array([0, 1, 2, 3, 254, 255]);

    await expect(getBrandAsset(env, key)).resolves.toBeNull();

    await putBrandAsset(env, key, bytes, 'image/png');

    const stored = await getBrandAsset(env, key);

    expect(stored).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(stored ?? new ArrayBuffer(0))]).toEqual([...bytes]);
  });
});

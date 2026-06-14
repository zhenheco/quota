import type { APIRoute } from 'astro';
import { getBrandAsset } from '../../../server/brand';
import { getCompany } from '../../../server/company-service';
import { runtimeEnv } from '../../../server/runtime-env';

const contentTypes = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

export const GET: APIRoute = async ({ locals, url }) => {
  const type = url.searchParams.get('type');
  const env = runtimeEnv(locals);
  const company = await getCompany(env);
  const key =
    type === 'logo'
      ? company.logo_key
      : type === 'stamp'
        ? company.stamp_key
        : type === 'bank'
          ? company.bank_image_key
          : null;

  if (key === null) {
    return new Response('Asset not found.', { status: 404 });
  }

  const bytes = await getBrandAsset(env, key);

  if (bytes === null) {
    return new Response('Asset not found.', { status: 404 });
  }

  return new Response(bytes, {
    headers: {
      'Content-Type': contentTypeFromKey(key),
      'Cache-Control': 'private, max-age=300',
    },
  });
};

function contentTypeFromKey(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase() ?? '';

  return contentTypes[extension as keyof typeof contentTypes] ?? 'application/octet-stream';
}

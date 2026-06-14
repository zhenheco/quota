import type { APIRoute } from 'astro';
import { getBrandAsset } from '../../../server/brand';
import { getCompany } from '../../../server/company-service';
import { getQuote } from '../../../server/quotes-service';
import { runtimeEnv } from '../../../server/runtime-env';

const contentTypes = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

export const GET: APIRoute = async ({ locals, params, url }) => {
  const id = quoteId(params.id);

  if (id === null) {
    return new Response('Asset not found.', { status: 404 });
  }

  const type = url.searchParams.get('type');
  const env = runtimeEnv(locals);
  const quote = await getQuote(env, id);

  if (quote === null) {
    return new Response('Asset not found.', { status: 404 });
  }

  const company = await getCompany(env);
  // Assets remain company-wide, but the nested quote URL is gated by an existing quote id.
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

function quoteId(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

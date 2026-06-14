import type { APIRoute } from 'astro';
import { requireAuth } from '../../../../server/auth';
import { putBrandAsset } from '../../../../server/brand';
import { updateCompany } from '../../../../server/company-service';
import { runtimeEnv } from '../../../../server/runtime-env';
import type { CompanyPatch } from '../../../../server/types';

type BrandAsset = 'logo' | 'stamp' | 'bank';
type ImageExtension = 'png' | 'jpg';

const MAX_BRAND_BYTES = 5 * 1024 * 1024;

const ASSET_FIELDS: Record<BrandAsset, keyof CompanyPatch> = {
  logo: 'logo_key',
  stamp: 'stamp_key',
  bank: 'bank_image_key',
};

export const PUT: APIRoute = async ({ request, params, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const asset = parseAsset(params.asset);

  if (asset === null) {
    return json({ error: 'Unsupported brand asset.' }, 400);
  }

  const extension = imageExtension(request.headers.get('content-type'));

  if (extension === null) {
    return json({ error: 'Brand asset must be image/png or image/jpeg.' }, 400);
  }

  const contentLength = request.headers.get('content-length');

  if (contentLength !== null && Number(contentLength) > MAX_BRAND_BYTES) {
    return brandAssetTooLarge();
  }

  try {
    const bytes = await request.arrayBuffer();

    if (bytes.byteLength > MAX_BRAND_BYTES) {
      return brandAssetTooLarge();
    }

    if (bytes.byteLength === 0) {
      return json({ error: 'Brand asset body is empty.' }, 400);
    }

    const key = `brand/${asset}.${extension}`;
    const patch: CompanyPatch = {
      [ASSET_FIELDS[asset]]: key,
    };

    await putBrandAsset(env, key, bytes, extension === 'png' ? 'image/png' : 'image/jpeg');

    return json({ company: await updateCompany(env, patch), key }, 200);
  } catch (error) {
    console.error(error);

    return json({ error: 'Unable to upload brand asset.' }, 500);
  }
};

function parseAsset(asset: string | undefined): BrandAsset | null {
  if (asset === 'logo' || asset === 'stamp' || asset === 'bank') {
    return asset;
  }

  return null;
}

function imageExtension(contentType: string | null): ImageExtension | null {
  const type = contentType?.split(';', 1)[0].trim().toLowerCase();

  if (type === 'image/png') {
    return 'png';
  }

  if (type === 'image/jpeg' || type === 'image/jpg') {
    return 'jpg';
  }

  return null;
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

function brandAssetTooLarge(): Response {
  return json({ error: 'Brand asset exceeds 5MB.' }, 413);
}

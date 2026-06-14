import type { APIRoute } from 'astro';
import { requireAuth } from '../../../../server/auth';
import { getQuoteXlsx, XLSX_CONTENT_TYPE } from '../../../../server/quotes-service';

export const GET: APIRoute = async ({ request, params, locals }) => {
  const env = locals.runtime.env;

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const id = quoteId(params.id);

  if (id === null) {
    return json({ error: 'Quote XLSX not found.' }, 404);
  }

  try {
    const download = await getQuoteXlsx(env, id);

    if (download === null) {
      return json({ error: 'Quote XLSX not found.' }, 404);
    }

    return new Response(toArrayBuffer(download.bytes), {
      status: 200,
      headers: {
        'Content-Type': XLSX_CONTENT_TYPE,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(download.filename)}`,
      },
    });
  } catch (error) {
    console.error(error);

    return json({ error: 'Unable to download quote XLSX.' }, 500);
  }
};

function quoteId(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

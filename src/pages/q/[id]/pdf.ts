import type { APIRoute } from 'astro';
import { generateQuotePdfDownload, PDF_CONTENT_TYPE } from '../../../server/quotes-service';
import { runtimeEnv } from '../../../server/runtime-env';

export const GET: APIRoute = async ({ locals, params }) => {
  const id = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return new Response('Quote not found.', { status: 404 });
  }

  try {
    const download = await generateQuotePdfDownload(runtimeEnv(locals), id);

    if (download === null) {
      return new Response('Quote pdf not found.', { status: 404 });
    }

    const body = download.bytes.buffer.slice(
      download.bytes.byteOffset,
      download.bytes.byteOffset + download.bytes.byteLength
    ) as ArrayBuffer;

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': PDF_CONTENT_TYPE,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(download.filename)}`,
      },
    });
  } catch (error) {
    console.error(error);

    return new Response('Unable to download quote pdf.', { status: 500 });
  }
};

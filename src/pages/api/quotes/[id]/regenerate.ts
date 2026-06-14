import type { APIRoute } from 'astro';
import { requireAuth } from '../../../../server/auth';
import { regenerateXlsx } from '../../../../server/quotes-service';
import { runtimeEnv } from '../../../../server/runtime-env';

export const POST: APIRoute = async ({ request, params, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const id = quoteId(params.id);

  if (id === null) {
    return json({ error: 'Quote not found.' }, 404);
  }

  try {
    const result = await regenerateXlsx(env, id);

    if (result === null) {
      return json({ error: 'Quote not found.' }, 404);
    }

    return json(result, 200);
  } catch (error) {
    console.error(error);

    return json({ error: 'Unable to regenerate quote XLSX.' }, 500);
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

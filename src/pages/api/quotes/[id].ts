import type { APIRoute } from 'astro';
import { requireAuth } from '../../../server/auth';
import { deleteQuote, getQuote, updateQuote } from '../../../server/quotes-service';
import { runtimeEnv } from '../../../server/runtime-env';
import { validateQuoteInput } from '../../../server/validation';

export const GET: APIRoute = async ({ request, params, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const id = quoteId(params.id);

  if (id === null) {
    return json({ error: 'Quote not found.' }, 404);
  }

  try {
    const quote = await getQuote(env, id);

    if (quote === null) {
      return json({ error: 'Quote not found.' }, 404);
    }

    return json({ quote }, 200);
  } catch (error) {
    console.error(error);

    return json({ error: 'Unable to read quote.' }, 500);
  }
};

export const PUT: APIRoute = async ({ request, params, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const id = quoteId(params.id);

  if (id === null) {
    return json({ error: 'Quote not found.' }, 404);
  }

  try {
    const payload = await request.json();
    const validation = validateQuoteInput(payload);

    if (!validation.ok) {
      return json({ error: validation.error }, 400);
    }

    const quote = await updateQuote(env, id, validation.value);

    if (quote === null) {
      return json({ error: 'Quote not found.' }, 404);
    }

    return json({ quote }, 200);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return json({ error: 'Invalid JSON body.' }, 400);
    }

    console.error(error);

    return json({ error: 'Unable to update quote.' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, params, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const id = quoteId(params.id);

  if (id === null) {
    return json({ error: 'Quote not found.' }, 404);
  }

  try {
    const deleted = await deleteQuote(env, id);

    if (!deleted) {
      return json({ error: 'Quote not found.' }, 404);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(error);

    return json({ error: 'Unable to delete quote.' }, 500);
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

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../server/auth';
import { createQuote, listQuotes, parseQuoteStatus } from '../../../server/quotes-service';
import { runtimeEnv } from '../../../server/runtime-env';
import { validateQuoteInput } from '../../../server/validation';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const url = new URL(request.url);
    const quotes = await listQuotes(env, {
      client: url.searchParams.get('client') ?? undefined,
      status: parseQuoteStatus(url.searchParams.get('status')),
      date: url.searchParams.get('date') ?? undefined,
    });

    return json({ quotes }, 200);
  } catch (error) {
    console.error(error);

    return json({ error: 'Unable to list quotes.' }, 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await request.json();
    const validation = validateQuoteInput(payload);

    if (!validation.ok) {
      return json({ error: validation.error }, 400);
    }

    return json(await createQuote(env, validation.value), 201);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return json({ error: 'Invalid JSON body.' }, 400);
    }

    console.error(error);

    return json({ error: 'Unable to create quote.' }, 500);
  }
};

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

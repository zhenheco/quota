import type { APIRoute } from 'astro';
import { requireAuth } from '../../../server/auth';
import { createClient, listClients, validateClientInput } from '../../../server/clients-service';
import { runtimeEnv } from '../../../server/runtime-env';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    return json({ clients: await listClients(env) }, 200);
  } catch (error) {
    console.error(error);

    return json({ error: 'Unable to list clients.' }, 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await request.json();
    const validation = validateClientInput(payload);

    if (!validation.ok || validation.value === undefined) {
      return json({ error: validation.error }, 400);
    }

    return json({ client: await createClient(env, validation.value) }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return json({ error: 'Invalid JSON body.' }, 400);
    }

    console.error(error);

    return json({ error: 'Unable to create client.' }, 500);
  }
};

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

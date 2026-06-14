import type { APIRoute } from 'astro';
import { requireAuth } from '../../../server/auth';
import { deleteClient, getClient, updateClient, validateClientPatch } from '../../../server/clients-service';
import { runtimeEnv } from '../../../server/runtime-env';

export const GET: APIRoute = async ({ request, params, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const id = clientId(params.id);

  if (id === null) {
    return json({ error: 'Client not found.' }, 404);
  }

  try {
    const client = await getClient(env, id);

    if (client === null) {
      return json({ error: 'Client not found.' }, 404);
    }

    return json({ client }, 200);
  } catch (error) {
    console.error(error);

    return json({ error: 'Unable to read client.' }, 500);
  }
};

export const PUT: APIRoute = async ({ request, params, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const id = clientId(params.id);

  if (id === null) {
    return json({ error: 'Client not found.' }, 404);
  }

  try {
    const payload = await request.json();
    const validation = validateClientPatch(payload);

    if (!validation.ok || validation.value === undefined) {
      return json({ error: validation.error }, 400);
    }

    const client = await updateClient(env, id, validation.value);

    if (client === null) {
      return json({ error: 'Client not found.' }, 404);
    }

    return json({ client }, 200);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return json({ error: 'Invalid JSON body.' }, 400);
    }

    console.error(error);

    return json({ error: 'Unable to update client.' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, params, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const id = clientId(params.id);

  if (id === null) {
    return json({ error: 'Client not found.' }, 404);
  }

  try {
    const deleted = await deleteClient(env, id);

    if (!deleted) {
      return json({ error: 'Client not found.' }, 404);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(error);

    return json({ error: 'Unable to delete client.' }, 500);
  }
};

function clientId(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

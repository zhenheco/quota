import type { APIRoute } from 'astro';
import { requireAuth } from '../../../server/auth';
import { getCompany, updateCompany, validateCompanyPatch } from '../../../server/company-service';
import { runtimeEnv } from '../../../server/runtime-env';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    return json({ company: await getCompany(env) }, 200);
  } catch (error) {
    console.error(error);

    return json({ error: 'Unable to read company profile.' }, 500);
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const env = runtimeEnv(locals);

  if (!requireAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await request.json();
    const validation = validateCompanyPatch(payload);

    if (!validation.ok || validation.value === undefined) {
      return json({ error: validation.error }, 400);
    }

    return json({ company: await updateCompany(env, validation.value) }, 200);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return json({ error: 'Invalid JSON body.' }, 400);
    }

    console.error(error);

    return json({ error: 'Unable to update company profile.' }, 500);
  }
};

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

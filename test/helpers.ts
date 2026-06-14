import type { APIContext } from 'astro';
import { env } from 'cloudflare:test';

export const TOKEN = 'test-token';

type MockApiContext = APIContext<Record<string, unknown>, Record<string, string | undefined>>;

export function testEnv(): Cloudflare.Env {
  return {
    DB: env.DB,
    FILES: env.FILES,
    TEST_MIGRATIONS: env.TEST_MIGRATIONS,
    QUOTA_API_TOKEN: TOKEN,
  };
}

export function context(
  path: string,
  init: RequestInit = {},
  params: Record<string, string> = {}
): MockApiContext {
  const request = new Request(`https://quota.test${path}`, init);

  return {
    request,
    params,
    locals: {
      runtime: {
        env: testEnv(),
      },
    },
    url: new URL(request.url),
  } as unknown as MockApiContext;
}

export function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${TOKEN}`,
  };
}

export async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

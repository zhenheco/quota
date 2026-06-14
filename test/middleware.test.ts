import type { APIContext } from 'astro';
import { describe, expect, it, vi } from 'vitest';
import { onRequest } from '../src/middleware';
import { testEnv } from './helpers';

type MockApiContext = APIContext<Record<string, unknown>, Record<string, string | undefined>>;

function context(path: string, env: Partial<Cloudflare.Env>, headers: HeadersInit = {}): MockApiContext {
  const request = new Request(`https://quota.test${path}`, {
    headers,
  });

  return {
    request,
    locals: {
      runtime: {
        env: {
          ...testEnv(),
          ...env,
        },
      },
    },
    url: new URL(request.url),
  } as unknown as MockApiContext;
}

function basic(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

async function runMiddleware(
  path: string,
  env: Partial<Cloudflare.Env>,
  next: Parameters<typeof onRequest>[1],
  headers: HeadersInit = {}
): Promise<Response> {
  const response = await onRequest(context(path, env, headers), next);

  expect(response).toBeInstanceOf(Response);
  return response as Response;
}

describe('UI Basic Auth middleware', () => {
  it('returns 401 with a Basic challenge for UI requests without credentials when UI_PASSWORD is set', async () => {
    const next = vi.fn(async () => new Response('ok'));

    const response = await runMiddleware('/', { UI_PASSWORD: 'secret' }, next);

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe(
      'Basic realm="Quota", charset="UTF-8"'
    );
    expect(await response.text()).toBe('Authentication required');
    expect(next).not.toHaveBeenCalled();
  });

  it('passes UI requests with the correct Basic credentials', async () => {
    const next = vi.fn(async () => new Response('ok', { status: 200 }));

    const response = await runMiddleware(
      '/',
      { UI_PASSWORD: 'secret' },
      next,
      { Authorization: basic('admin', 'secret') }
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('passes API health requests without Basic Auth when UI_PASSWORD is set', async () => {
    const next = vi.fn(async () => new Response('ok', { status: 200 }));

    const response = await runMiddleware('/api/health', { UI_PASSWORD: 'secret' }, next);

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('passes machine API requests through for downstream bearer auth', async () => {
    const next = vi.fn(async () => new Response('ok', { status: 200 }));

    const response = await runMiddleware('/api/quotes', { UI_PASSWORD: 'secret' }, next);

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('passes UI requests when UI_PASSWORD is unset', async () => {
    const next = vi.fn(async () => new Response('ok', { status: 200 }));

    const response = await runMiddleware('/', { UI_PASSWORD: undefined }, next);

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

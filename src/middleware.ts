import type { MiddlewareHandler } from 'astro';
import { runtimeEnv } from './server/runtime-env';

const basicChallenge = 'Basic realm="Quota", charset="UTF-8"';

export const onRequest: MiddlewareHandler = (context, next) => {
  const pathname = context.url.pathname;

  if (pathname.startsWith('/api/') || pathname.startsWith('/_astro/') || pathname === '/favicon.ico') {
    return next();
  }

  const env = runtimeEnv(context.locals);
  const password = env.UI_PASSWORD;

  if (!password) {
    return next();
  }

  const username = env.UI_USER || 'admin';
  const credentials = parseBasicAuthorization(context.request.headers.get('Authorization'));
  const usernameMatches = constantTimeEqual(credentials?.username ?? '', username);
  const passwordMatches = constantTimeEqual(credentials?.password ?? '', password);

  if (credentials !== null && usernameMatches && passwordMatches) {
    return next();
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': basicChallenge,
    },
  });
};

function parseBasicAuthorization(header: string | null): { username: string; password: string } | null {
  const match = /^Basic\s+(.+)$/i.exec(header ?? '');

  if (!match) {
    return null;
  }

  try {
    const decoded = atob(match[1]);
    const separator = decoded.indexOf(':');

    if (separator === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function constantTimeEqual(actual: string, expected: string): boolean {
  const encoder = new TextEncoder();
  const actualBytes = encoder.encode(actual);
  const expectedBytes = encoder.encode(expected);
  const length = Math.max(actualBytes.length, expectedBytes.length);
  let diff = actualBytes.length ^ expectedBytes.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (actualBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }

  return diff === 0;
}

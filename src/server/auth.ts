interface AuthEnv {
  QUOTA_API_TOKEN?: string;
}

export function requireAuth(request: Request, env: AuthEnv): boolean {
  // TODO(slice-09): add verified Cloudflare Access JWT support (validate signature against Access JWKS + AUD) for browser/UI auth; presence-only trust is insecure.
  const token = env.QUOTA_API_TOKEN;

  if (token === undefined || token === '') {
    return false;
  }

  return constantTimeEqual(request.headers.get('Authorization') ?? '', `Bearer ${token}`);
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

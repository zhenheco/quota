interface AuthEnv {
  QUOTA_API_TOKEN?: string;
}

export function requireAuth(request: Request, env: AuthEnv): boolean {
  const accessJwt = request.headers.get('Cf-Access-Jwt-Assertion');

  if (accessJwt !== null && accessJwt.trim() !== '') {
    return true;
  }

  const token = env.QUOTA_API_TOKEN;

  if (token === undefined || token === '') {
    return false;
  }

  return request.headers.get('Authorization') === `Bearer ${token}`;
}

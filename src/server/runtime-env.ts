import { env as cloudflareEnv } from 'cloudflare:workers';

export function runtimeEnv(locals?: App.Locals): Cloudflare.Env {
  try {
    const localEnv = locals?.runtime?.env;

    if (localEnv) {
      return localEnv;
    }
  } catch {
    // Astro 6 Cloudflare exposes bindings through cloudflare:workers instead.
  }

  return cloudflareEnv as Cloudflare.Env;
}

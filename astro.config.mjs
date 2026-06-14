import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  // /api/* is a bearer-token machine API (MCP, scripts) — CSRF protection (which
  // guards cookie-based browser forms) does not apply to it and breaks DELETE/PUT
  // from non-browser clients. The human UI is single-tenant and gated by Cloudflare
  // Access. So origin-checking is disabled here.
  security: { checkOrigin: false },
});

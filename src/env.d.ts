declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    FILES: R2Bucket;
    BROWSER?: { fetch: typeof fetch };
    QUOTA_API_TOKEN?: string;
    UI_USER?: string;
    UI_PASSWORD?: string;
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[];
  }
}

declare namespace App {
  interface Locals {
    runtime: {
      env: Cloudflare.Env;
    };
  }
}

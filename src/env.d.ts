declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    FILES: R2Bucket;
    QUOTA_API_TOKEN?: string;
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

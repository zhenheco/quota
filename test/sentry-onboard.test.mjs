import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import patchScript from '../scripts/patch-worker-entry.mjs?raw';
import envTypes from '../src/env.d.ts?raw';
import wranglerToml from '../wrangler.toml?raw';

describe('Sentry onboarding', () => {
  it('declares the Cloudflare Sentry SDK dependency', () => {
    expect(pkg.dependencies?.['@sentry/cloudflare']).toBeTruthy();
  });

  it('patches the generated Astro Worker entry with Sentry after build', () => {
    expect(pkg.scripts.build).toContain('node scripts/patch-worker-entry.mjs');
    expect(patchScript).toContain('@sentry/cloudflare');
    expect(patchScript).toContain('withSentry');
    expect(patchScript).toContain('buildSentryOptions');
    expect(patchScript).toContain('esbuild');
    expect(patchScript).toContain('--bundle');
    expect(patchScript).toContain('_astro-entry.mjs');
    expect(patchScript).toContain('sentry.mjs');
    expect(wranglerToml).toContain('nodejs_compat');
  });

  it('keeps the DSN secret-only while exposing safe runtime vars', () => {
    expect(wranglerToml).toContain('SENTRY_ENVIRONMENT = "production"');
    expect(wranglerToml).toContain('SENTRY_TRACES_SAMPLE_RATE = "0.1"');
    expect(wranglerToml).not.toMatch(/SENTRY_DSN\s*=/);
    expect(envTypes).toContain('SENTRY_DSN?: string');
    expect(envTypes).toContain('SENTRY_ENVIRONMENT?: string');
    expect(envTypes).toContain('SENTRY_RELEASE?: string');
    expect(envTypes).toContain('SENTRY_TRACES_SAMPLE_RATE?: string');
  });

  it('uses live Cloudflare resource bindings instead of deploy placeholders', () => {
    expect(wranglerToml).not.toContain('REPLACE_WITH_');
    expect(wranglerToml).toContain('database_id = "43fb8040-cca2-4da4-b9bf-e456a6755922"');
    expect(wranglerToml).toContain('id = "db327ea7a9734fceac91aa806125a3ba"');
    expect(wranglerToml).toContain('bucket_name = "quota-files"');
  });

  it('builds env-driven options with PII disabled', async () => {
    const { buildSentryOptions, scrubSentryEvent } = await import('../src/server/sentry.mjs');

    expect(buildSentryOptions({})).toBeUndefined();

    const options = buildSentryOptions({
      SENTRY_DSN: 'https://public@example.invalid/2',
      SENTRY_ENVIRONMENT: 'production',
      SENTRY_RELEASE: 'quota@abc123',
      SENTRY_TRACES_SAMPLE_RATE: '0.05',
    });

    expect(options).toMatchObject({
      dsn: 'https://public@example.invalid/2',
      environment: 'production',
      release: 'quota@abc123',
      tracesSampleRate: 0.05,
      sendDefaultPii: false,
    });
    expect(options.beforeSend).toBe(scrubSentryEvent);
    expect(options.beforeSendTransaction).toBe(scrubSentryEvent);
  });

  it('scrubs request, user, extra, and breadcrumb secrets before sending events', async () => {
    const { scrubSentryEvent } = await import('../src/server/sentry.mjs');

    const scrubbed = scrubSentryEvent({
      request: {
        url: 'https://app.quote24.cc/new?token=secret#frag',
        query_string: 'token=secret',
        cookies: 'sid=secret',
        data: { QUOTA_API_TOKEN: 'secret' },
        headers: {
          authorization: 'Bearer secret',
          cookie: 'sid=secret',
          accept: 'text/html',
        },
      },
      user: {
        id: 'operator-1',
        email: 'owner@example.com',
        ip_address: '203.0.113.10',
      },
      extra: {
        apiToken: 'secret',
        callbackUrl: 'https://app.quote24.cc/api/quotes?token=secret',
        nested: {
          sessionSecret: 'secret',
          quoteId: 'q_123',
        },
      },
      breadcrumbs: [
        {
          message: 'POST https://app.quote24.cc/api/quotes?token=secret',
          data: {
            Authorization: 'secret',
            route: '/api/quotes',
          },
        },
      ],
    });

    expect(scrubbed.request.url).toBe('https://app.quote24.cc/new');
    expect(scrubbed.request.query_string).toBeUndefined();
    expect(scrubbed.request.cookies).toBeUndefined();
    expect(scrubbed.request.data).toBeUndefined();
    expect(scrubbed.request.headers).toEqual({ accept: 'text/html' });
    expect(scrubbed.user).toEqual({ id: 'operator-1' });
    expect(scrubbed.extra).toEqual({
      callbackUrl: 'https://app.quote24.cc/api/quotes',
      nested: {
        quoteId: 'q_123',
      },
    });
    expect(scrubbed.breadcrumbs).toEqual([
      {
        message: 'POST https://app.quote24.cc/api/quotes',
        data: {
          route: '/api/quotes',
        },
      },
    ]);
  });
});

#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distServer = resolve(root, 'dist/server');
const entryPath = resolve(distServer, 'entry.mjs');
const astroEntryPath = resolve(distServer, '_astro-entry.mjs');
const sentrySourcePath = resolve(root, 'src/server/sentry.mjs');
const sentryDistPath = resolve(distServer, 'sentry.mjs');
const wrapperSourcePath = resolve(distServer, '_sentry-entry-source.mjs');

if (!existsSync(entryPath)) {
  console.error('[patch] dist/server/entry.mjs not found. Run astro build first.');
  process.exit(1);
}

if (!existsSync(sentrySourcePath)) {
  console.error('[patch] src/server/sentry.mjs not found.');
  process.exit(1);
}

rmSync(astroEntryPath, { force: true });
rmSync(wrapperSourcePath, { force: true });
copyFileSync(sentrySourcePath, sentryDistPath);
renameSync(entryPath, astroEntryPath);

writeFileSync(
  wrapperSourcePath,
  `// Sentry-wrapped Astro Worker entry source.
import * as Sentry from '@sentry/cloudflare';
import astro from './_astro-entry.mjs';
import { buildSentryOptions } from './sentry.mjs';

const handler = astro.default ?? astro;

export default Sentry.withSentry((env) => buildSentryOptions(env), handler);
`
);

const bundle = spawnSync(
  'pnpm',
  [
    'exec',
    'esbuild',
    wrapperSourcePath,
    '--bundle',
    '--format=esm',
    '--platform=neutral',
    '--target=es2022',
    `--outfile=${entryPath}`,
    '--external:./_astro-entry.mjs',
    '--external:./sentry.mjs',
    '--external:cloudflare:workers',
    '--external:node:*',
  ],
  { cwd: root, stdio: 'inherit' }
);

rmSync(wrapperSourcePath, { force: true });

if (bundle.status !== 0) {
  process.exit(bundle.status ?? 1);
}

console.log('[patch] Worker entry patched with Sentry.');

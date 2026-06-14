# Quota

Quota is a single-tenant quotation system for self-hosted small businesses. It runs on Astro SSR with Cloudflare Workers, stores business data in D1, stores generated files and brand assets in R2, and exposes the same HTTP API to the web app and the MCP server.

The repository ships blank by default. Demo brand assets and the original reference workbook live under `examples/` only:

- `examples/demo-brand/`
- `examples/demo-reference/`

Do not deploy the demo assets unless you intentionally want to test with them.

## Features

- Web quote list, client management, company settings, quote editing, preview, and XLSX download.
- D1-backed company, client, quote, and quote item data.
- R2-backed quote files and brand assets.
- Token-gated HTTP API for automation and MCP.
- `seed-brand` CLI for pushing logo, stamp, and bank images into any deployed Quota API.

## Local Setup

```sh
pnpm install
pnpm test
pnpm build
```

For local development, create the local D1 schema before opening pages that read the database:

```sh
pnpm wrangler d1 migrations apply quota-dev --local
pnpm dev
```

Open `http://127.0.0.1:4321/settings` and fill your own company profile.

## Cloudflare Setup

Create your own Cloudflare resources:

```sh
pnpm wrangler d1 create quota
pnpm wrangler r2 bucket create quota-files
```

Update the D1 `database_id`, D1 `database_name`, and R2 `bucket_name` in the Wrangler deploy config used by your environment. Keep the binding names as:

- D1: `DB`
- R2: `FILES`

Set a machine API token as a Cloudflare secret:

```sh
pnpm wrangler secret put QUOTA_API_TOKEN
```

Use a long random value. Store the source value in your password manager or platform secret store, not in Git.

Apply remote migrations and deploy:

```sh
pnpm wrangler d1 migrations apply quota --remote
pnpm build
pnpm wrangler deploy
```

## First-Run Brand Setup

After deploy, configure your own company data in one of two ways.

### Web UI

Open `/settings` and fill:

- company name, address, and phone
- bank transfer text
- default tax rate and notes
- logo, stamp, and bank image files

When company identity and brand assets are blank, `/settings` shows a first-run setup guide.

### CLI

Use `seed-brand` when you want to push local image files to a deployed Quota instance:

```sh
QUOTA_API_URL="https://your-quota.example.workers.dev" \
QUOTA_API_TOKEN="$(op read op://your-vault/quota-api-token)" \
pnpm seed-brand -- \
  --logo ./brand/logo.png \
  --stamp ./brand/stamp.png \
  --bank ./brand/bank.jpg
```

You can also pass `--url` and `--token` flags:

```sh
pnpm seed-brand -- \
  --url "https://your-quota.example.workers.dev" \
  --token "$QUOTA_API_TOKEN" \
  --logo ./brand/logo.png
```

Accepted image types are PNG and JPEG. The CLI uploads to:

- `/api/company/brand/logo`
- `/api/company/brand/stamp`
- `/api/company/brand/bank`

The API writes stable R2 keys such as `brand/logo.png` and updates the company profile keys in D1.

## MCP Setup

The MCP server lives in `packages/mcp` and calls the Quota HTTP API with the same bearer token.

```sh
pnpm --dir packages/mcp install
pnpm --dir packages/mcp build
pnpm --dir packages/mcp test
```

Configure the MCP runtime environment:

```sh
export QUOTA_API_URL="https://your-quota.example.workers.dev"
export QUOTA_API_TOKEN="$(op read op://your-vault/quota-api-token)"
```

Add it to Claude after publishing or linking your MCP package:

```sh
claude mcp add quota -- npx -y quota-mcp
```

## Verification

Before deploying changes:

```sh
pnpm test
pnpm build
pnpm --dir packages/mcp test
```

## Security Notes

- `QUOTA_API_TOKEN` must be provided by environment/secret store only.
- Never commit real tokens, bank data, customer data, or production exports.
- The brand upload API only accepts `logo`, `stamp`, and `bank` assets.
- The app is designed for one company per deployment, not multi-tenant SaaS.

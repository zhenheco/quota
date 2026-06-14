# Deployment Runbook

This runbook prepares and deploys Quota to Cloudflare Workers with D1, R2, and Cloudflare Access.

Actual Cloudflare resource creation, secrets, Access changes, and `wrangler deploy` require the operator's Cloudflare account authorization. Do not run those steps from unattended automation.

## 1. Prerequisites

```sh
pnpm install
wrangler login
```

Confirm `wrangler.toml` keeps these bindings:

- D1: `DB`
- R2: `FILES`

## 2. Create Cloudflare Resources

Create the production D1 database and record the returned `database_id`:

```sh
wrangler d1 create quota
```

Update `wrangler.toml`:

- `database_name = "quota"`
- `database_id = "<database_id returned by wrangler d1 create>"`

Create the production R2 bucket:

```sh
wrangler r2 bucket create quota-files
```

Update `wrangler.toml`:

- `bucket_name = "quota-files"`

## 3. Apply Schema

```sh
wrangler d1 migrations apply quota --remote
```

## 4. Set Secrets

Generate a high-entropy API token and store the source value in 1Password or another secret store. Do not commit it, print it in logs, or write it to local files.

```sh
printf "%s" "<high-entropy-token>" | wrangler secret put QUOTA_API_TOKEN
```

Do not use `echo` for secrets because it can append a trailing newline.

## 5. Deploy

```sh
pnpm build
wrangler deploy
```

Record the deployed URL. The canary examples below call it `DEPLOY_URL`.

## 6. Cloudflare Access

In the Cloudflare Zero Trust dashboard, create an Access Application for the deployed Quota domain.

Protect the human UI paths:

- `/`
- `/new`
- `/q/*`
- `/clients`
- `/settings`

Set the Access policy to allow only the operator email addresses.

Leave API behavior as follows:

- `/api/*` is protected by the `Authorization: Bearer <QUOTA_API_TOKEN>` machine token.
- `/api/health` is public and unauthenticated for canary and uptime checks.

If your Access configuration applies to the whole domain, add bypass or exclusion handling for `/api/health` and avoid blocking machine-token API clients.

## 7. Seed Brand Assets

After deploy, seed demo assets or your own company assets:

```sh
QUOTA_API_URL="<DEPLOY_URL>" \
QUOTA_API_TOKEN="<high-entropy-token>" \
pnpm seed-brand -- \
  --logo ./examples/demo-brand/logo.png \
  --stamp ./examples/demo-brand/stamp.png \
  --bank ./examples/demo-brand/bank.jpg
```

Then open `/settings` and fill the company profile, bank text, default tax rate, and default notes.

## 8. Install MCP

Install the MCP server after publishing or linking the package:

```sh
claude mcp add quota -- npx -y quota-mcp
```

Configure the MCP runtime environment:

```sh
export QUOTA_API_URL="<DEPLOY_URL>"
export QUOTA_API_TOKEN="<high-entropy-token>"
```

## 9. Canary And Smoke Checks

Run the unauthenticated health canary:

```sh
DEPLOY_URL="<DEPLOY_URL>" scripts/canary-check.sh
```

Smoke test the web workflow:

1. Open `/new`.
2. Create one quote.
3. Download the XLSX.

Smoke test the MCP workflow:

1. Start a Claude session with the `quota` MCP server enabled.
2. Call `create_quote` for one test quote.
3. Confirm the created quote opens in the web UI and its XLSX downloads.

## 10. Pre-Deploy Verification

Run these before deploy:

```sh
pnpm test
pnpm build
pnpm --dir packages/mcp test
```

All three commands must exit 0 before `wrangler deploy`.

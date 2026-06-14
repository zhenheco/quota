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

## 5b. Custom Domain (optional)

Attaching a Worker custom domain via `[[routes]] custom_domain = true` in wrangler.toml
also disables `workers.dev` unless you add `workers_dev = true`. If the zone apex already
has DNS records, apex attachment fails — use a subdomain.

Reliable alternative (attach via API; persists across deploys, leaves workers.dev intact):

```sh
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/domains" \
  -H "Authorization: Bearer <API_TOKEN_with_Workers+DNS_edit>" -H "Content-Type: application/json" \
  -d '{"zone_id":"<ZONE_ID>","hostname":"app.example.com","service":"quota","environment":"production"}'
```

This deployment uses `app.quote24.cc` (apex `quote24.cc` is occupied by other DNS).

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

Recommended setup (two Access apps; the more specific `/api` path wins):

1. `your-domain/api` — decision **bypass**, include **everyone** (so MCP/machine clients reach the bearer-gated API and `/api/health` stays public).
2. `your-domain` — decision **allow**, include your operator **email** (One-time PIN). Gates the whole UI.

This can be done in the Zero Trust dashboard, or via API:

```sh
curl -X POST "https://api.cloudflare.com/client/v4/accounts/<ACCT>/access/apps" \
  -H "Authorization: Bearer <API_TOKEN>" -H "Content-Type: application/json" \
  -d '{"name":"Quota API (bypass)","domain":"your-domain/api","type":"self_hosted","session_duration":"24h","policies":[{"name":"bypass","decision":"bypass","include":[{"everyone":{}}]}]}'
curl -X POST "https://api.cloudflare.com/client/v4/accounts/<ACCT>/access/apps" \
  -H "Authorization: Bearer <API_TOKEN>" -H "Content-Type: application/json" \
  -d '{"name":"Quota UI","domain":"your-domain","type":"self_hosted","session_duration":"24h","policies":[{"name":"allow-owner","decision":"allow","include":[{"email":{"email":"you@example.com"}}]}]}'
```

Optional app-level fallback: `src/middleware.ts` enforces HTTP Basic Auth when the `UI_PASSWORD` secret is set. Leave that secret UNSET when using Cloudflare Access (otherwise users get prompted twice).

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

Build the MCP package, then install it (user scope = available in all your Claude sessions). Until `quota-mcp` is published to npm, point at the local build:

```sh
pnpm --dir packages/mcp build
claude mcp add quota --scope user \
  --env QUOTA_API_URL=https://your-domain \
  --env QUOTA_API_TOKEN=<token> \
  -- node "$(pwd)/packages/mcp/dist/index.js"
```

Once published to npm you can instead use `claude mcp add quota -- npx -y quota-mcp`.

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

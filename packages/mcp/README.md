# quota-mcp

MCP stdio server for Quota. It is a standalone Node package and only calls the Quota HTTP API with a machine bearer token.

## Setup

Build locally:

```sh
pnpm install
pnpm build
```

Required environment variables:

```sh
export QUOTA_API_URL="https://quota.example.workers.dev"
export QUOTA_API_TOKEN="op://path/to/quota-api-token"
```

Run locally:

```sh
node dist/index.js
```

Add to Claude:

```sh
claude mcp add quota -- npx -y quota-mcp
```

Configure `QUOTA_API_URL` and `QUOTA_API_TOKEN` in the MCP server environment used by Claude.

## Tools

- `create_quote`: creates a quote, applies company defaults for omitted `tax_rate` and `notes`, and matches a string client name against existing clients.
- `list_quotes`: lists quotes with optional `status`, `client`, and `date` filters.
- `get_quote`: reads one quote by id.
- `list_clients`: lists clients.

All operations call `/api/*` endpoints on `QUOTA_API_URL`. This server does not connect to D1 or R2 directly.

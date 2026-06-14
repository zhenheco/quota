# Slice 07 — MCP server（對話產報價）— Implementation Plan

> For agentic workers: TDD，frequent commits。STAY on branch `feat/quote-system`；不新建分支；不 cd 他專案。

**Goal:** `packages/mcp` MCP server，作為本系統 HTTP API 的薄 client，暴露 `create_quote`/`list_quotes`/`get_quote`/`list_clients` 工具，讓任何 Claude session 對話產報價。

**Architecture:** 獨立 Node 套件（非 Workers runtime），用 `@modelcontextprotocol/sdk`（stdio transport）。所有操作經 `fetch` 打 `QUOTA_API_URL` 帶 `Authorization: Bearer QUOTA_API_TOKEN`（即 slice 04 的機器 token）。**不直連 D1/R2**。`create_quote` 含「對話智能」：缺欄位用 company 預設、客戶名比對既有 clients。

**Tech Stack:** Node + TypeScript, `@modelcontextprotocol/sdk`, `zod`(tool input schema), vitest（mock fetch）。standalone package（自己的 package.json/node_modules），不併入 root astro build。

---

## File Structure

- Create `packages/mcp/package.json` — name `quota-mcp`、`bin: { "quota-mcp": "dist/index.js" }`、scripts build/test、deps `@modelcontextprotocol/sdk`+`zod`、devDeps typescript+vitest。
- Create `packages/mcp/tsconfig.json` — strict、outDir dist。
- Create `packages/mcp/src/api-client.ts` — `createApiClient({baseUrl, token})`：`postQuote(input)`/`listQuotes(filter)`/`getQuote(id)`/`listClients()`/`getCompany()`，fetch + bearer，非 2xx 丟含狀態的錯誤。
- Create `packages/mcp/src/tools.ts` — 4 個 tool 定義（zod input schema + handler）。create_quote 的預設/比對邏輯放這（呼 getCompany/listClients 再 postQuote）。
- Create `packages/mcp/src/index.ts` — 建 McpServer、註冊 tools、讀 env（QUOTA_API_URL/QUOTA_API_TOKEN，缺則啟動時明確報錯）、stdio transport 連線。
- Create `packages/mcp/test/tools.test.ts` — mock fetch 測 tool 行為。
- Create `packages/mcp/README.md` — 安裝/設定說明。

## Decisions

- 用**現行** `@modelcontextprotocol/sdk` 的 server + tool 註冊 API（請依實際安裝版本的 API；若不確定先看 sdk 型別/範例）。stdio transport。
- env：`QUOTA_API_URL`（如 `https://quota.example.workers.dev`）、`QUOTA_API_TOKEN`（與部署的 QUOTA_API_TOKEN 同）。index 啟動時驗證兩者存在，缺則 stderr 報錯並退出非 0。
- `create_quote` input（zod）：`client`(名稱字串或 {name,contact,phone})、`items`([{name,description?,qty,unit?,unit_price}])、`subject`、`quote_date?`(預設今天)、`valid_until?`、`tax_rate?`、`notes?`。handler：
  1. `getCompany()` 取 default_tax_rate/default_notes；tax_rate/notes 未給則用預設。
  2. 若 client 給字串：`listClients()` 比對 name（完全相符優先，否則模糊/包含）；命中帶 client_id，未命中則當新客戶資料（只帶快照欄位，不強制建 client）。
  3. `postQuote(...)` → 回 `{id, quote_no, view_url, xlsx_url}`，工具回應組成可讀文字 + 連結（view_url/xlsx_url 補上 baseUrl 成絕對網址）。
- `list_quotes`(filter: status?/client?/date?)、`get_quote`(id)、`list_clients`() → 直接轉呼 API、回結構化結果。

## Tasks（TDD）

- [ ] **Task 1**：package scaffold（package.json/tsconfig）+ `api-client.ts`。`test/tools.test.ts` 起手測 api-client（mock global.fetch）：postQuote 帶正確 method/headers(bearer)/body、非 2xx 丟錯。Commit：`feat: mcp api client (slice-07)`。
- [ ] **Task 2**：`tools.ts` create_quote 邏輯（TDD，mock fetch）：
  - tax_rate 未給 → 用 getCompany().default_tax_rate。
  - client 字串命中既有 → body 帶 client_id + 快照；未命中 → 帶 client_name 等、無 client_id。
  - 回應含 quote_no + 絕對 view_url/xlsx_url。
  Commit：`feat: create_quote tool with defaults + client matching (slice-07)`。
- [ ] **Task 3**：list_quotes/get_quote/list_clients tools（TDD，mock fetch）→ 呼對應 endpoint、回結果。Commit：`feat: list/get quote + list clients tools (slice-07)`。
- [ ] **Task 4**：`index.ts`（McpServer + stdio + env 驗證）+ `README.md`（安裝 `claude mcp add quota -- npx -y quota-mcp`、env 設定、本地 `node dist/index.js` 用法）。`pnpm --dir packages/mcp build` 過、`pnpm --dir packages/mcp test` 全綠。Commit：`feat: mcp stdio server entry + docs (slice-07)`。

## Acceptance criteria（對應 issue 07）

- [ ] MCP server 以 QUOTA_API_URL+QUOTA_API_TOKEN 連線，tools 可被呼叫（build 過、index 可啟動）。
- [ ] `create_quote` 建單回 view_url+xlsx_url；缺欄位用 company 預設、客戶名比對既有 clients（測試覆蓋）。
- [ ] `list_quotes`/`get_quote`/`list_clients` 回正確資料。
- [ ] 測試覆蓋：解析→打 API→回連結、缺欄位補預設、token/錯誤處理。
- [ ] README 含安裝法。

## Notes for implementer

- standalone package：在 `packages/mcp/` 自己 `pnpm install`；**不要**破壞 root 的 `pnpm test`/`pnpm build`（root astro 不應嘗試編譯 packages/mcp）。若需，於 root astro/vitest 設定排除 `packages/**`。
- 不直連 D1/R2；一切經 HTTP API。bearer token 只從 env 讀，**絕不** hardcode 或 commit。
- 驗證：`pnpm --dir packages/mcp test` 全綠 + build 過 + root `pnpm test`/`pnpm build` 仍綠，貼結果。
- Commit 身份 zhenheco <ace@zhenhe-co.com>。若 MCP sdk API 與預期不符，先查實際安裝版本 API，停下回報勝過 hack。

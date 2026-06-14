Status: ready-for-agent
Type: AFK

# 07 — MCP server（對話產報價）

## Parent

`.scratch/quote-system/PRD.md`

## What to build

`packages/mcp` MCP server，用 `@modelcontextprotocol/sdk`，作為本系統 HTTP API 的薄 client（不直連 D1/R2）。以 env `QUOTA_API_URL` + `QUOTA_API_TOKEN` 連線。暴露 tools：`create_quote`、`list_quotes`、`get_quote`、`list_clients`。`create_quote` 解析使用者描述成報價 JSON → 打 `POST /api/quotes` → 回 view_url + xlsx_url；缺漏欄位用 `company_profile` 預設（稅率/備註），客戶名比對既有 `clients`，真有歧義才需上層補問。安裝法文件化。

## Acceptance criteria

- [ ] MCP server 以 `QUOTA_API_URL`+`QUOTA_API_TOKEN` 連線，tools 可被 Claude 呼叫。
- [ ] `create_quote` 建單成功回 view_url + xlsx_url；缺欄位用 company 預設、客戶名比對既有 clients。
- [ ] `list_quotes`/`get_quote`/`list_clients` 回正確資料。
- [ ] 測試覆蓋：解析→打 API→回連結、缺欄位補預設、token 錯誤處理。
- [ ] README/文件含安裝法 `claude mcp add quota -- npx -y quota-mcp`（指向本地/私有）。

## Blocked by

- `.scratch/quote-system/issues/04-quotes-api-token.md`
- `.scratch/quote-system/issues/05-clients-company-api.md`

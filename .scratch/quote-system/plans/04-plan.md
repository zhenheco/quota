# Slice 04 — Quotes API + 機器 token — Implementation Plan

> For agentic workers: TDD，frequent commits。STAY on branch `feat/quote-system`；不新建分支；不 cd 他專案。

**Goal:** Astro API endpoints（綁 D1+R2）提供報價 CRUD + xlsx 產生/串流，加機器 bearer token 驗證。`POST /api/quotes` 建單即產 xlsx 入 R2、更新 xlsx_key、回 `{id, quote_no, view_url, xlsx_url}`。

**Architecture:** 薄 Astro route（`src/pages/api/quotes/...`）委派給 service 層（`src/server/quotes-service.ts`），service 用 slice 02 repos + slice 03 builder/brand。env 綁定經 `ctx.locals.runtime.env`（Astro CF adapter）。auth 經 `src/server/auth.ts`。測試直接呼叫 route handler，傳入帶真 `env`（vitest-pool-workers）的 mock APIContext。

**Tech Stack:** Astro API routes (`APIRoute`), Cloudflare D1/R2, TypeScript strict, vitest-pool-workers。沿用 slice 02/03 模組。

---

## Decisions（重要，照做）

- **Auth 模型**：`requireAuth(request, env)` 通過條件 =（`Authorization: Bearer <env.QUOTA_API_TOKEN>` 相符）**或**（存在 Cloudflare Access 標頭 `Cf-Access-Jwt-Assertion`，代表已被邊緣認證）。本地/測試無 Access → 一律需 bearer。`QUOTA_API_TOKEN` 來自 env secret（`.dev.vars` 本地，不 commit）。未授權回 `401`。
- **URL 形狀**：`view_url = "/q/{id}"`（UI 頁，slice 06 才有，先回相對路徑）；`xlsx_url = "/api/quotes/{id}/xlsx"`。
- **xlsx 產生於 POST/regenerate**：載入 company → 用 company.logo_key/stamp_key/bank_image_key 經 `getBrandAsset` 取 buffer（缺則 null，builder 已容忍）→ `generateQuoteXlsx` → `env.FILES.put("quotes/{quote_no}/{quote_no}.xlsx", bytes, {httpMetadata:{contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}})` → `quotesRepo` 更新 `xlsx_key`。
- **輸入驗證**：POST/PUT body 用 zod 或手寫驗證：items 非空、qty/unit_price 為數值且 ≥0、tax_rate 0–1、subject/quote_date 必填。壞輸入回 `400` + 訊息。

## File Structure

- Create `src/server/auth.ts` — `requireAuth(request, env): boolean`。
- Create `src/server/quotes-service.ts` — `listQuotes(env, filter)`, `createQuote(env, input)`(含產 xlsx), `getQuote(env, id)`, `updateQuote(env, id, patch)`, `deleteQuote(env, id)`, `regenerateXlsx(env, id)`, `getQuoteXlsx(env, id)→{bytes,filename}|null`。
- Create `src/server/validation.ts` — quote 輸入驗證（回 `{ok,value}|{ok:false,error}`）。
- Create `src/pages/api/quotes/index.ts` — `GET`(list+filter query: client/status/date)、`POST`(create)。
- Create `src/pages/api/quotes/[id].ts` — `GET`/`PUT`/`DELETE`。
- Create `src/pages/api/quotes/[id]/regenerate.ts` — `POST`。
- Create `src/pages/api/quotes/[id]/xlsx.ts` — `GET`（R2 串流，`Content-Disposition` 用檔名 `{quote_date}_{client}_{subject}_報價單.xlsx`）。
- Create `test/quotes-api.test.ts` — route handler 測試（真 env）。
- Modify `src/env.d.ts` 若需補 `QUOTA_API_TOKEN` 型別。

## Task 1: auth.ts（TDD）

**Files:** Create `src/server/auth.ts`, `test/auth.test.ts`。

- [ ] `test/auth.test.ts`（先 fail）：無 Authorization → false；`Bearer wrong` → false；`Bearer <token>`（與 env.QUOTA_API_TOKEN 同）→ true；有 `Cf-Access-Jwt-Assertion` 標頭 → true。env.QUOTA_API_TOKEN 在測試以 `env` 提供（vitest.config 加 `vars` 或測試傳入）。
- [ ] 跑 fail → 實作 `requireAuth(request, env)` → 跑 pass。
- [ ] Commit：`feat: bearer/Access auth guard (slice-04)`。

## Task 2: validation.ts（TDD）

**Files:** Create `src/server/validation.ts`, `test/validation.test.ts`。

- [ ] `test/validation.test.ts`（先 fail）：合法 payload → ok+normalized；空 items → error；負數 unit_price → error；tax_rate 1.5 → error；缺 subject → error。
- [ ] 實作 → pass。Commit：`feat: quote input validation (slice-04)`。

## Task 3: quotes-service.ts + endpoints（TDD）

**Files:** Create `src/server/quotes-service.ts`, `src/pages/api/quotes/index.ts`, `[id].ts`, `[id]/regenerate.ts`, `[id]/xlsx.ts`, `test/quotes-api.test.ts`。

- [ ] `test/quotes-api.test.ts`（先 fail，用真 `env`）。測試以小工具建構 mock APIContext：`{ request, params, locals: { runtime: { env } } }`，直接 import route 的 `POST`/`GET`/`PUT`/`DELETE` 呼叫。涵蓋：
  - 無 token POST `/api/quotes` → 401。
  - 帶 token POST 合法 payload → 201/200，回 JSON `{id, quote_no, view_url, xlsx_url}`；之後 `env.FILES.get("quotes/{quote_no}/{quote_no}.xlsx")` 存在；DB row `xlsx_key` 已填。
  - GET `/api/quotes`（帶 token）→ 含剛建的單；filter by status 生效。
  - GET `/api/quotes/[id]` 回單筆含 items；PUT 改 subject/items → 重算 totals；DELETE → 之後 GET 404。
  - GET `/api/quotes/[id]/xlsx` → 200、`Content-Type` xlsx、body bytes 非空。
  - POST `/api/quotes/[id]/regenerate` → xlsx_key 更新（可比對重產）。
  - 壞 payload → 400。
- [ ] 跑 fail。
- [ ] 實作 service + 薄 routes（每個 route：先 `requireAuth` 否則 401；parse + validate 否則 400；呼 service；try/catch 回 500 + 友善訊息）。
- [ ] 跑 pass。`pnpm lint` exit 0。Commit：`feat: quotes CRUD + xlsx generate/stream API with token guard (slice-04)`。

## Acceptance criteria（對應 issue 04）

- [ ] 建→讀→改→刪 CRUD 過測試（真 D1/R2）。
- [ ] POST 建單後 R2 有 xlsx、DB xlsx_key 更新、回 view_url + xlsx_url。
- [ ] regenerate 重產 xlsx；xlsx endpoint 正確串流下載。
- [ ] 無/錯 token 被拒（401），正確 token 通過。
- [ ] 輸入驗證：數值/稅率/必填 → 400。

## Notes for implementer

- routes 保持薄；商業邏輯在 service，方便測試與 slice 06/07 重用。
- `.dev.vars` 放 `QUOTA_API_TOKEN=<dev-token>`（已 gitignored），測試以 vitest pool `vars` 或直接構造 env 提供同值。**不要把 token hardcode 進原始碼或 commit。**
- 所有 SQL 走既有 repo（已參數化）。
- `pnpm test` + `pnpm lint` 全綠才完成，貼結果。Commit 身份 zhenheco <ace@zhenhe-co.com>。
- 若 Astro route 在 vitest-pool-workers 難以直接測，改測 service 層 + 對 route 做最小 smoke（仍須涵蓋 auth 401 與 create→xlsx 路徑）。停下回報勝過 hack。

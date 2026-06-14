# Slice 05 — Clients + Company API — Implementation Plan

> For agentic workers: TDD，frequent commits。STAY on branch `feat/quote-system`；不新建分支；不 cd 他專案。

**Goal:** 客戶 CRUD 與公司資料讀寫的 Astro endpoints，沿用 slice 04 的 auth + route 模式。

**Architecture:** 薄 Astro routes 委派 service（複用 slice 02 `clientsRepo`/`companyRepo`）。env 經 `ctx.locals.runtime.env`。auth 經 `requireAuth`（已 bearer-only）。測試呼叫 route handler 傳真 env。

**Tech Stack:** Astro API routes, D1, TypeScript strict, vitest-pool-workers。複用 slice 02/04 模組與測試工具（若 slice 04 測試已寫 mock APIContext helper，抽到共用檔複用）。

---

## File Structure

- Create `src/server/clients-service.ts` — `listClients(env)`, `createClient(env,input)`, `getClient(env,id)`, `updateClient(env,id,patch)`, `deleteClient(env,id)`。
- Create `src/server/company-service.ts` — `getCompany(env)`, `updateCompany(env,patch)`。
- Create `src/pages/api/clients/index.ts` — `GET`/`POST`。
- Create `src/pages/api/clients/[id].ts` — `GET`/`PUT`/`DELETE`。
- Create `src/pages/api/company/index.ts` — `GET`/`PUT`。
- Create `test/clients-company-api.test.ts`。
- 若 slice 04 已有 mock APIContext / auth header helper，抽成 `test/helpers.ts` 共用（DRY）；否則本 slice 建立。

## Decisions

- Auth：所有 `/api/clients*` 與 `/api/company` 路徑先 `requireAuth` 否則 401（與 slice 04 一致）。
- Company 是單列（id=1，slice 02 已種）。`GET /api/company` 回該列；`PUT` 接 partial patch，未給欄位保留原值（含 default_tax_rate、default_notes、brand keys）。出廠值全空白。
- Client 驗證：`name` 必填非空；其餘可空。壞輸入回 400。
- Client 刪除：若被 quotes 參照，FK 為 `ON DELETE SET NULL`（slice 02 schema），刪 client 不破壞歷史 quote（quote 已快照客戶資料）。測試驗證此行為。

## Task 1: clients-service + endpoints（TDD）

**Files:** Create `src/server/clients-service.ts`, `src/pages/api/clients/index.ts`, `src/pages/api/clients/[id].ts`, `test/clients-company-api.test.ts`(clients 段)。

- [ ] 寫測試（先 fail，真 env）：無 token → 401；POST 合法 client → 回 JSON 含 id；GET list 含之；GET [id] 回單筆；PUT 改 name/phone → 讀回更新；DELETE → 之後 GET 404；POST 空 name → 400；建 quote 參照某 client 後刪該 client → quote 仍可讀且 client_name 快照不變。
- [ ] 跑 fail → 實作 service + routes（薄 route：requireAuth→validate→service→try/catch 500）。
- [ ] 跑 pass。Commit：`feat: clients CRUD API (slice-05)`。

## Task 2: company-service + endpoint（TDD）

**Files:** Create `src/server/company-service.ts`, `src/pages/api/company/index.ts`, 補 `test/clients-company-api.test.ts`(company 段)。

- [ ] 寫測試（先 fail）：無 token → 401；GET company 回單列（default_tax_rate=0.05、其餘空白）；PUT partial（name+bank_info）→ 讀回更新且未給欄位不變；PUT 設 logo_key/stamp_key/bank_image_key → 讀回有值。
- [ ] 跑 fail → 實作 → pass。Commit：`feat: company profile read/update API (slice-05)`。

## Acceptance criteria（對應 issue 05）

- [ ] clients CRUD 全過測試（真 D1）。
- [ ] `GET/PUT /api/company` 讀寫含預設稅率/備註。
- [ ] 機器 token 驗證一致（401）。
- [ ] 客戶查詢可供建單比對（list 回完整）。

## Notes for implementer

- routes 薄；複用 slice 04 的 auth/驗證/mock-context 模式，能抽共用就抽（DRY），但不要重構 slice 04 既有檔的行為。
- SQL 走既有 repo（已參數化）。
- `pnpm test` + `pnpm lint` 全綠才完成，貼結果。Commit 身份 zhenheco <ace@zhenhe-co.com>。
- 不 hardcode secret。停下回報勝過 hack。

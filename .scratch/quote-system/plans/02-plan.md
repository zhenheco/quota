# Slice 02 — 資料層 + 計算 + 報價單號 — Implementation Plan

> For agentic workers: TDD（先寫失敗測試→確認 fail→最小實作→pass→refactor），frequent commits。Steps `- [ ]`。

**Goal:** 建立 D1 schema（4 表）+ repository CRUD，以及兩個深模組純計算 `computeTotals` 與併發安全 `nextQuoteNo`。

**Architecture:** SQL migrations 建表；`src/server/db.ts` 封裝 D1 存取；`src/server/calc.ts` 純函式（無 I/O）；`src/server/quote-no.ts` 在 D1 交易內產生當日序號。測試用既有 `vitest` + `@cloudflare/vitest-pool-workers`（`env.DB` 真 D1 binding）。

**Tech Stack:** Cloudflare D1 (SQLite), TypeScript strict, vitest-pool-workers。沿用 slice 01 慣例：`src/server/` 邏輯、`test/` 測試。

---

## Conventions established in slice 01 (follow these)

- 伺服器邏輯放 `src/server/*.ts`；測試放 `test/*.test.ts`。
- 測試以 `import { env } from 'cloudflare:test'` 取得 `env.DB`（D1）/`env.FILES`（R2）。
- `wrangler.toml` 提供 test 綁定；TypeScript strict。
- migrations 放 `migrations/`，用 `@cloudflare/vitest-pool-workers` 的 `applyD1Migrations` 在測試 setup 套用（需在 wrangler.toml 設 `[[d1_databases]] migrations_dir` 與 test 的 `MIGRATIONS` binding，依 pool 文件）。

## File Structure

- Create `migrations/0001_init.sql` — 4 張表 DDL。
- Create `src/server/calc.ts` — `computeTotals`。
- Create `src/server/quote-no.ts` — `nextQuoteNo`。
- Create `src/server/db.ts` — `companyRepo` / `clientsRepo` / `quotesRepo`。
- Create `src/server/types.ts` — 共用型別（`QuoteItemInput`, `Quote`, `Client`, `Company` 等）。
- Create `test/calc.test.ts`, `test/quote-no.test.ts`, `test/db.test.ts`。
- Modify `wrangler.toml` / `vitest.config.ts` 若需 migrations binding。

## Schema (migrations/0001_init.sql)

- `company_profile`：`id INTEGER PRIMARY KEY CHECK(id=1)`, `name TEXT NOT NULL DEFAULT ''`, `address TEXT DEFAULT ''`, `phone TEXT DEFAULT ''`, `bank_info TEXT DEFAULT ''`, `default_tax_rate REAL NOT NULL DEFAULT 0.05`, `default_notes TEXT DEFAULT ''`, `logo_key TEXT`, `stamp_key TEXT`, `bank_image_key TEXT`。種一列 `INSERT INTO company_profile (id) VALUES (1)`（其餘出廠空白/預設）。
- `clients`：`id INTEGER PK AUTOINCREMENT`, `name NOT NULL`, `contact`, `phone`, `email`, `address`, `created_at`, `updated_at`。
- `quotes`：`id PK AUTOINCREMENT`, `quote_no TEXT UNIQUE NOT NULL`, `client_id INTEGER` (FK nullable), `client_name/client_contact/client_phone TEXT`（快照）, `subject TEXT`, `quote_date TEXT`, `valid_until TEXT`, `tax_rate REAL NOT NULL`, `subtotal INTEGER NOT NULL`, `tax_amount INTEGER NOT NULL`, `total INTEGER NOT NULL`（金額快照，存整數元）, `notes TEXT`, `status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','void'))`, `xlsx_key TEXT`, `pdf_key TEXT`, `created_via TEXT NOT NULL DEFAULT 'web' CHECK(created_via IN ('web','chat'))`, `created_at`, `updated_at`。
- `quote_items`：`id PK AUTOINCREMENT`, `quote_id INTEGER NOT NULL` (FK→quotes, ON DELETE CASCADE), `sort_order INTEGER NOT NULL`, `name TEXT NOT NULL`, `description TEXT`, `qty REAL NOT NULL`, `unit TEXT`, `unit_price INTEGER NOT NULL`, `amount INTEGER NOT NULL`。
- 索引：`quotes(quote_no)`, `quotes(quote_date)`, `quote_items(quote_id)`。

## Task 1: computeTotals（純函式，TDD）

**Files:** Create `src/server/calc.ts`, `src/server/types.ts`, `test/calc.test.ts`。

- [ ] 寫 `test/calc.test.ts`（先 fail）：
  - 單列 qty=1 unit_price=48000 tax_rate=0.05 → `{subtotal:48000, taxAmount:2400, total:50400}`。
  - 多列：[{qty:2,unit_price:1500},{qty:3,unit_price:1000}] tax_rate 0.05 → subtotal 6000, tax 300, total 6300。
  - 四捨五入：subtotal 333, tax_rate 0.05 → taxAmount round(16.65)=17。
  - amount=round(qty×unit_price)：qty=1.5 unit_price=99 → amount 149（round(148.5)）。
- [ ] 跑確認 fail。
- [ ] 實作 `computeTotals(items: QuoteItemInput[], taxRate: number): {subtotal, taxAmount, total}`，`amount=Math.round(qty*unit_price)`、`subtotal=Σamount`、`taxAmount=Math.round(subtotal*taxRate)`、`total=subtotal+taxAmount`。型別放 `types.ts`。
- [ ] 跑 pass。Commit：`feat: computeTotals quote calculation (slice-02)`。

## Task 2: nextQuoteNo（D1 交易，併發安全，TDD）

**Files:** Create `src/server/quote-no.ts`, `test/quote-no.test.ts`。先確保 migrations 套用機制可用（見 Task 0 setup 若需）。

- [ ] 寫 `test/quote-no.test.ts`（先 fail，用 `env.DB`）：
  - 同日連續呼叫 → `YYYYMMDD-01`, `-02`, `-03`。
  - 跨日：傳不同 date → 各自從 `-01` 起。
  - 併發：`Promise.all` 同時呼叫 N 次（同日）→ N 個唯一號、無重複（靠 quotes.quote_no UNIQUE + 交易重試或原子 INSERT）。
- [ ] 跑確認 fail。
- [ ] 實作 `nextQuoteNo(db: D1Database, date: Date|string): Promise<string>`：當日 prefix `YYYYMMDD`，查當日最大序號 +1，格式 `-NN`（兩位補零，>99 則自然進位）。併發正確性：用唯一鍵 + 失敗重試，或 `INSERT ... SELECT COALESCE(MAX(...)+1)` 原子取號。實作需保證併發不撞號。
- [ ] 跑 pass。Commit：`feat: nextQuoteNo daily sequence, concurrency-safe (slice-02)`。

## Task 3: migrations + repository CRUD（TDD）

**Files:** Create `migrations/0001_init.sql`, `src/server/db.ts`, `test/db.test.ts`。

- [ ] 建 `migrations/0001_init.sql`（上面 Schema）。設定 vitest-pool-workers 套 migrations（`applyD1Migrations` + MIGRATIONS binding，依 pool 文件；若 setup 檔需要就建 `test/setup.ts`）。
- [ ] 寫 `test/db.test.ts`（先 fail）：
  - `companyRepo.get()` 回種入的單列（default_tax_rate=0.05、其餘空白）；`companyRepo.update(patch)` 後讀回有變更。
  - `clientsRepo.create/list/get/update/delete` 一輪 CRUD。
  - `quotesRepo.create(quote, items)` 寫入後 `get(id)` 回含 items、金額快照、quote_no；`updateStatus`；`delete` 連帶刪 items（CASCADE）。
  - 快照驗證：建 quote 後改對應 client 名 → 重讀 quote 的 client_name 不變。
- [ ] 跑確認 fail。
- [ ] 實作 `src/server/db.ts`：三個 repo 物件，參數化 query（防注入），時間戳用 ISO。`quotesRepo.create` 在交易內呼叫 `nextQuoteNo` + 寫 quotes + quote_items。
- [ ] 跑 pass。Commit：`feat: D1 migrations + company/clients/quotes repositories (slice-02)`。

## Acceptance criteria（對應 issue 02）

- [ ] D1 migrations 建 4 表，repository 可寫讀（真 D1 binding 測試綠）。
- [ ] `computeTotals` 48000→2400→50400、多列加總、四捨五入正確。
- [ ] `nextQuoteNo` 當日遞增、跨日歸零、併發不撞號。
- [ ] quote 寫入時客戶與金額為快照（改 client 不影響歷史）。

## Notes for implementer

- STAY on git branch `feat/quote-system`；不要新建分支；不要 cd 到其他專案。
- 金額一律存整數（元），用 `Math.round`。
- 參數化所有 SQL，杜絕注入。
- `pnpm lint` 與 `pnpm test` 必須全綠才算完成；貼出結果。
- Commit 身份 zhenheco <ace@zhenhe-co.com>。不 hardcode secret。
- 若 vitest-pool-workers 的 migrations 套用機制卡住，停下回報，不要 hack 繞過（例如把 schema 寫死在測試裡而不用 migration）。

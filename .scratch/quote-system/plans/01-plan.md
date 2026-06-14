# Slice 01 — Scaffold + ExcelJS-on-Workers spike — Implementation Plan

> For agentic workers: implement task-by-task, TDD where applicable, frequent commits. Steps use `- [ ]`.

**Goal:** 建立 Astro + Cloudflare Workers 專案地基（D1/R2 binding + vitest-pool-workers），並驗證 ExcelJS 能否在 Workers runtime 產 xlsx + 嵌圖；不行則確立 fflate fallback。

**Architecture:** Astro SSR 走 `@astrojs/cloudflare` adapter（Workers runtime）。D1（SQLite）+ R2 由 `wrangler.toml` binding。測試用 `vitest` + `@cloudflare/vitest-pool-workers`（真 binding）。xlsx 產生為伺服器端模組，本 slice 只做最小 spike 決策。

**Tech Stack:** Astro, @astrojs/cloudflare, wrangler, Cloudflare D1/R2, vitest, @cloudflare/vitest-pool-workers, ExcelJS（spike）, fflate（fallback 候選）。

---

## File Structure

- `package.json` — 專案依賴與 scripts（dev/build/test/lint）。
- `astro.config.mjs` — Astro + cloudflare adapter，`output: 'server'`。
- `wrangler.toml`（或 `.jsonc`）— name、compatibility_date、`nodejs_compat` flag、D1 binding（`DB`）、R2 binding（`BRAND`/`FILES`，本 slice 一個即可）。
- `tsconfig.json` — strict。
- `vitest.config.ts` — `@cloudflare/vitest-pool-workers` pool，指向 wrangler.toml。
- `src/server/spike-xlsx.ts` — 最小 xlsx 產生（spike，之後 Slice 03 取代/吸收）。
- `test/smoke.test.ts` — trivial 通過測試（驗 pool 起得來）。
- `test/spike-xlsx.test.ts` — spike 測試：產 xlsx buffer + 嵌一張圖，回讀驗證。
- `.dev.vars`（gitignored，已在 .gitignore）— 本地 secret 範例（不 commit）。

## Task 1: 專案 scaffold（Astro + CF adapter）

**Files:** Create `package.json`, `astro.config.mjs`, `tsconfig.json`, `wrangler.toml`, `src/pages/index.astro`(最小首頁)。

- [ ] 用 pnpm 建 Astro 專案，裝 `@astrojs/cloudflare`、astro。`astro.config.mjs` 設 `output:'server'` + `adapter: cloudflare()`。
- [ ] `wrangler.toml`：`compatibility_date` 設近期、`compatibility_flags=["nodejs_compat"]`、`[[d1_databases]]` binding `DB`、`[[r2_buckets]]` binding `FILES`。
- [ ] `tsconfig.json` strict。
- [ ] 驗：`pnpm astro dev` 起得來、首頁回 200。
- [ ] Commit：`chore: scaffold astro + cloudflare adapter`。

## Task 2: vitest-pool-workers 設定 + smoke test

**Files:** Create `vitest.config.ts`, `test/smoke.test.ts`。

- [ ] 裝 `vitest`、`@cloudflare/vitest-pool-workers`。`vitest.config.ts` 用 `defineWorkersConfig`，`poolOptions.workers.wrangler.configPath='./wrangler.toml'`。
- [ ] `test/smoke.test.ts`：`import { env } from 'cloudflare:test'; expect(env.DB).toBeDefined()` + 一個 `1+1===2`。
- [ ] 先跑確認 fail（binding 未設好則修），再綠。
- [ ] 驗：`pnpm test` 通過。
- [ ] Commit：`test: vitest-pool-workers smoke test with D1/R2 bindings`。

## Task 3: ExcelJS spike（Workers runtime 產 xlsx + 嵌圖）

**Files:** Create `src/server/spike-xlsx.ts`, `test/spike-xlsx.test.ts`。

- [ ] `test/spike-xlsx.test.ts`（先寫，預期 fail）：呼叫 `buildSpikeXlsx(pngBytes)` 回 `ArrayBuffer`/`Uint8Array`；用 ExcelJS 重新 `xlsx.load()` 回讀，斷言至少一個 worksheet、寫入的 cell 值正確、`worksheet.getImages().length === 1`。PNG bytes 用測試內嵌的最小 1x1 png（base64 解碼）。
- [ ] 跑確認 fail。
- [ ] `src/server/spike-xlsx.ts`：`import ExcelJS from 'exceljs'`，新 workbook、寫幾個 cell、`workbook.addImage({buffer, extension:'png'})` + `worksheet.addImage`，回 `await workbook.xlsx.writeBuffer()`。**只用 writeBuffer，不碰 fs/stream/archiver。**
- [ ] 跑測試。**若在 vitest-pool-workers（Workers runtime）綠** → 決策：ExcelJS 可行。
- [ ] **若 fail（Node 相容性/模組錯誤）** → 記錄錯誤，改用 fflate spike：unzip 一個最小 xlsx 範本、改 sharedStrings、rezip，回讀驗證。決策：走 fflate 模板填充。
- [ ] Commit：`feat: exceljs-on-workers spike (decision: <ExcelJS|fflate>)`。

## Task 4: 記錄決策

- [ ] 把 spike 結論（ExcelJS 或 fflate）寫進 `.scratch/quote-system/issues/01-scaffold-exceljs-spike.md` 底部 `## Comments`，供 Slice 03 採用。
- [ ] Commit：`docs: record slice-01 xlsx engine decision`。

## Acceptance criteria（對應 issue 01）

- [ ] dev 起得來（Astro + CF adapter SSR）。
- [ ] wrangler 綁 D1 + R2 dev binding。
- [ ] vitest-pool-workers 跑通 smoke test。
- [ ] spike 測試綠（ExcelJS writeBuffer + 嵌圖回讀），或記錄失敗並確立 fflate fallback。
- [ ] 決策結論寫入 issue 01 Comments。

## Notes for implementer

- 不 hardcode secret；`.dev.vars` 已 gitignored。
- Commit 身份 `zhenheco <ace@zhenhe-co.com>`。
- 這是 greenfield 第一片，建立的目錄/命名慣例後續 slice 會沿用，保持簡潔一致（`src/server/` 放伺服器邏輯、`src/pages/` Astro 頁面與 API、`test/` 測試）。
- 若 ExcelJS 在 Workers 完全跑不動且 fflate 也卡，停下回報，不要 hack。

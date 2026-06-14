# Slice 03 — xlsx builder（伺服器端，嵌圖，金色版面）— Implementation Plan

> For agentic workers: TDD，frequent commits。Steps `- [ ]`。STAY on branch `feat/quote-system`；不新建分支；不 cd 他專案。

**Goal:** 深模組 `generateQuoteXlsx(quote, items, company, brand) → Uint8Array`，伺服器端產排版精美報價 xlsx（金色表頭、動態品項列、總計區、嵌 logo+章+匯款圖）。web 與 MCP 共用。

**Architecture:** 用 ExcelJS（slice 01 spike 已確認 Workers runtime 可行，`writeBuffer()`）。builder 為**純模組**：吃 quote/items/company + brand 圖 buffer，回 bytes，不碰 R2/D1（可單測）。`src/server/brand.ts` 另封裝 R2 存取，runtime 由它取 buffer 餵 builder。吸收並取代 slice 01 的 `spike-xlsx.ts`。

**Tech Stack:** ExcelJS, Cloudflare R2 (env.FILES), TypeScript strict, vitest-pool-workers。沿用 slice 02 型別（`Quote`,`QuoteItem`,`Company`）於 `src/server/types.ts`。

---

## File Structure

- Create `src/server/brand.ts` — `getBrandAsset(env, key)` / `putBrandAsset(env, key, bytes, contentType)` via `env.FILES` (R2)。回 `ArrayBuffer|null`。
- Create `src/server/quote-xlsx.ts` — `generateQuoteXlsx(input)`，`input = {quote, items, company, brand:{logo?:ArrayBuffer, stamp?:ArrayBuffer, bank?:ArrayBuffer}}`。
- Create `test/quote-xlsx.test.ts` — build + ExcelJS reload 驗證。
- Create `test/brand.test.ts` — R2 put→get round-trip（`env.FILES`）。
- Delete `src/server/spike-xlsx.ts` + `test/spike-xlsx.test.ts`（被本 slice 取代）。
- 若 types.ts 需要 brand buffer 型別，補上。

## Brand / 版面規格

- 色：主金 `#B97E19`（表頭填色、總計強調、細線分隔）、文字灰 `#5D5B5A`。白底、大留白、A4 直式。
- 數字格式 `#,##0`；日期 `YYYY-MM-DD`。
- 版面（由上而下）：
  1. 抬頭區：嵌 logo（左上）、公司名/地址/電話（company）、右側大字「報價單 / QUOTATION」。
  2. 客戶區：客戶名/聯絡人/電話（quote 快照）、報價單號 quote_no、報價日期、有效期。
  3. 標題 subject。
  4. 品項表：表頭金色填色 + 邊框（項次/品名/說明/數量/單位/單價/金額），動態 N 列。
  5. 總計區：小計 / 稅率 / 稅金 / 總計（金色強調 total）。
  6. 備註 notes。
  7. 頁尾：匯款資訊（company.bank_info）+ 嵌報價章與玉山存摺圖。
- 嵌圖共 3：logo、stamp、bank（用 `workbook.addImage({buffer, extension})` + `worksheet.addImage(id, range)`）。缺某圖時略過該圖但不報錯（builder 容忍 brand 缺圖；但測試提供全 3 張）。

## Task 1: brand.ts（R2 存取，TDD）

**Files:** Create `src/server/brand.ts`, `test/brand.test.ts`。

- [ ] 寫 `test/brand.test.ts`（先 fail，用 `env.FILES`）：`putBrandAsset(env, 'brand/logo.png', bytes, 'image/png')` 後 `getBrandAsset(env, 'brand/logo.png')` 回相同 bytes；不存在的 key 回 null。
- [ ] 跑確認 fail。
- [ ] 實作 `brand.ts`：`putBrandAsset` 用 `env.FILES.put(key, bytes, {httpMetadata:{contentType}})`；`getBrandAsset` 用 `env.FILES.get(key)` → `arrayBuffer()` 或 null。
- [ ] 跑 pass。Commit：`feat: R2 brand asset get/put (slice-03)`。

## Task 2: generateQuoteXlsx（builder，TDD）

**Files:** Create `src/server/quote-xlsx.ts`, `test/quote-xlsx.test.ts`。測試讀本地 `seed/brand/{logo.png,stamp.png,bank.jpg}` 當 brand buffer（`node:fs` 在 vitest 可用；若 pool 限制，改用測試內嵌最小 png）。

- [ ] 寫 `test/quote-xlsx.test.ts`（先 fail）：
  - 準備一張 quote（quote_no `20260614-01`、subject「行銷」、client 快照、2 個品項、tax_rate 0.05、totals 由 computeTotals 算）+ company（含 bank_info）+ brand 3 buffer。
  - 呼叫 `generateQuoteXlsx(...)` → bytes。
  - 用 `new ExcelJS.Workbook(); await wb.xlsx.load(bytes)` 回讀：
    - 某格含 quote_no、subject、客戶名。
    - 品項列數 = 品項數（測 2 列）；某品項 amount 格 = round(qty*price)。
    - 總計區小計/稅金/總計 = computeTotals 結果。
    - `worksheet.getImages().length === 3`。
    - 抽一個金額格驗證 numFmt 含 `#,##0`。
  - 再測「1 個品項」確認動態列數正確。
- [ ] 跑確認 fail。
- [ ] 實作 `generateQuoteXlsx`：依版面規格排版；金色表頭 `fill` + `border`；動態插品項列；總計；嵌 3 圖；`return new Uint8Array(await workbook.xlsx.writeBuffer())`。**只用 writeBuffer，不碰 fs/stream/archiver。** 缺圖容忍。
- [ ] 跑 pass。Commit：`feat: server-side quote xlsx builder with embedded brand images (slice-03)`。

## Task 3: 清理 spike

- [ ] 刪 `src/server/spike-xlsx.ts` 與 `test/spike-xlsx.test.ts`（功能已被 quote-xlsx 取代）。
- [ ] 跑 `pnpm test` 全綠、`pnpm lint` exit 0。
- [ ] Commit：`chore: remove xlsx spike, superseded by quote-xlsx builder (slice-03)`。

## Acceptance criteria（對應 issue 03）

- [ ] `generateQuoteXlsx` 回 bytes，回讀關鍵格正確（抬頭/品項/小計/稅/總計）。
- [ ] 嵌圖數 = 3（logo+章+匯款圖）。
- [ ] 動態品項列數正確（1 列與多列）。
- [ ] 數字 `#,##0` 格式、金色表頭/邊框呈現。
- [ ] 失敗路徑（壞資料）回明確錯誤。

## Notes for implementer

- builder 必須是**純模組**（吃 buffer 回 bytes），不在裡面打 R2/D1，方便單測與 web/MCP 共用。
- 可參考 `reference/20260519_範例客戶_行銷_報價單.xlsx` 的欄寬/版面當設計參考，但不要硬抄振禾文字內容（公司資料一律來自 company 參數）。
- 像素完美非硬性；優先：正確資料 + 3 圖 + 專業金色版面 + 動態列。
- `pnpm test` + `pnpm lint` 全綠才完成，貼結果。Commit 身份 zhenheco <ace@zhenhe-co.com>。
- 若 ExcelJS 嵌圖在 Workers runtime 出問題，停下回報，不要 hack。

# Slice 06 — Web UI（清單/編輯器+即時預覽/檢視/客戶/設定）— Implementation Plan

> For agentic workers: STAY on branch `feat/quote-system`；不新建分支；不 cd 他專案。前端任務，重設計品質。

**Goal:** Astro SSR 6 頁 + 報價單共用元件（即時預覽與檢視共用），精煉專業金色版面，左表單右即時預覽、品項自動算、A4 列印存 PDF。

**Architecture:** UI 頁面 SSR 在 Worker 上跑，**直接呼叫 service 層**（`quotes-service`/`clients-service`/`company-service`，經 `Astro.locals.runtime.env`），**不經 token-gated /api**（瀏覽器無 token）。表單提交走 Astro SSR POST handler / Astro Actions → 同一 service（DRY）。xlsx 下載走 SSR route 串流 R2（免 token，prod 由 Cloudflare Access 罩）。token-gated `/api/*` 保留給 MCP/機器。即時預覽計算**重用 `computeTotals`**（已測），不另寫計算。

**Tech Stack:** Astro SSR, TypeScript strict, 原生 client-side JS（編輯器互動，或最小 island）。CSS variables 設計系統。沿用既有 service 層。

---

## 設計系統（遵 frontend-design：精煉極簡、distinctive、避免 AI-slop）

- **方向**：refined minimalism（專業、可信、數字精準）。白底主導、大量留白、金色細線（hairline）當分隔/表頭/總計強調。
- **色** CSS vars：`--gold:#B97E19`（主強調/細線/總計）、`--ink:#5D5B5A`（文字）、`--blue:#004A85`（印章參考）、白底、淺灰分隔 `#ECE9E4`。
- **字體**：body `Noto Sans TC`（zh-TW）；heading/品牌字用一款**有個性的 display**（如 `Noto Serif TC` 或幾何 sans，**不要 Inter/Arial/Roboto/system**）；數字（金額）用 tabular-nums。透過 `@fontsource` 或 Google Fonts 引入。
- **CJK 排版**：zh-TW 字級略大（base 16–17px）+ 行高 1.7–1.8、字距適中。
- **細節**：金色 1px hairline、subtle shadow、表頭金底白字或白底金線、hover/focus 微互動（克制）。一致 spacing scale（4/8 基準）。
- **A4 預覽/列印**：報價單元件以 A4 比例（210×297）容器呈現；`@media print` + `@page { size:A4; margin:… }` 隱藏導覽/按鈕，只留報價單，Cmd+P 輸出乾淨 PDF。

## File Structure

- Create `src/layouts/Base.astro` — 全站殼（含 nav：報價/客戶/設定）。
- Create `src/components/QuoteDocument.astro` — 報價單呈現元件（吃 quote+items+company），即時預覽與檢視頁共用，A4 版面、嵌品牌（用 `/q/[id]/asset` 或 settings 顯示）。
- Create `src/components/QuoteEditor.*` — 編輯器（左表單右預覽），client JS 控制品項列增刪 + 即時 `computeTotals` + 更新預覽。
- Create pages：
  - `src/pages/index.astro` — 報價清單（表格 + 搜尋/篩選 client/status/date、新增/檢視/複製/改狀態）。
  - `src/pages/new.astro` — 新建（編輯器）。POST handler → `createQuote` → redirect `/q/[id]`。
  - `src/pages/q/[id]/edit.astro` — 編輯既有（編輯器）。POST → `updateQuote`。
  - `src/pages/q/[id]/index.astro` — 檢視（唯讀美化 + 下載 + 改狀態）。
  - `src/pages/q/[id]/download.ts` — SSR 串流 R2 xlsx（免 token；檔名 `{date}_{client}_{subject}_報價單.xlsx`）。
  - `src/pages/clients/index.astro` — 客戶 CRUD（list + 表單）。
  - `src/pages/settings/index.astro` — 公司/匯款/品牌/備註/稅率（含品牌圖上傳→R2 via company-service + brand）。
- Create `src/styles/global.css` — 設計系統 vars + base + print。
- Tests：`test/ui-render.test.ts`（用 Astro Container API 或 build 驗每頁可渲染/回 200；確認預覽計算與 computeTotals 一致）。

## Decisions

- 清單/檢視資料：SSR 直接呼 service（env）。**複製報價** = 讀舊 quote → 帶入 new 編輯器（預填）。
- 即時預覽：client JS 監聽表單變更 → 用與 `computeTotals` 相同邏輯重算（理想：抽 `computeTotals` 到可被 client import 的純檔，server+client 共用同一函式，杜絕雙份計算）。
- 改狀態：檢視頁 select → SSR POST → `updateStatus`。
- 設定頁品牌上傳：表單 file → SSR handler 讀 bytes → `putBrandAsset` + `updateCompany` 寫 key。
- 認證：本 slice UI 不接 Access（slice 09 才在邊緣加）；本地 dev 直接可用。SSR 頁不需 token。

## Tasks（TDD where feasible；UI 以 build+render smoke 為主）

- [ ] **Task 1**：設計系統 `global.css` + `Base.astro`（nav）+ 字體引入。驗 `astro build` 過、首頁殼可渲染。Commit：`feat: design system + base layout (slice-06)`。
- [ ] **Task 2**：`QuoteDocument.astro`（A4 報價單呈現，金色版面，print CSS）。`test/ui-render.test.ts` 驗給定 quote 渲染含 quote_no/品項/總計。Commit：`feat: A4 quote document component + print styles (slice-06)`。
- [ ] **Task 3**：`QuoteEditor` + `/new` + `/q/[id]/edit`（左表單右即時預覽、品項增刪、即時算、共用 computeTotals）。POST handler 接 createQuote/updateQuote。驗：dev 起、表單送出建單成功 redirect、預覽數字 = computeTotals。Commit：`feat: quote editor with live preview (slice-06)`。
- [ ] **Task 4**：`/`（清單+搜尋/篩選/複製/改狀態）+ `/q/[id]`（檢視+下載+改狀態）+ `/q/[id]/download`（R2 串流）。驗：清單渲染、篩選生效、下載回 xlsx bytes。Commit：`feat: quote list + view + download (slice-06)`。
- [ ] **Task 5**：`/clients`（CRUD）+ `/settings`（公司/匯款/品牌上傳/備註/稅率）。驗：渲染、CRUD 與設定儲存生效。Commit：`feat: clients management + settings pages (slice-06)`。
- [ ] **Task 6**：全面驗 `pnpm build`（所有頁編譯）+ `pnpm lint` exit 0 + `pnpm test` 全綠 + `astro dev` 各頁回 200。修齊。Commit：`test: ui render smoke + fixes (slice-06)`。

## Acceptance criteria（對應 issue 06）

- [ ] `/` 清單可搜尋/篩選、新增/檢視/複製/改狀態。
- [ ] `/new`+`/q/[id]/edit` 左表單右即時預覽、品項增刪即時算、可儲存與下載 xlsx。
- [ ] `/q/[id]` 唯讀美化 + 下載 + 改狀態；列印（Cmd+P）輸出乾淨 A4 PDF。
- [ ] `/clients` CRUD；`/settings` 可改公司/匯款/品牌/備註/稅率。
- [ ] CJK 排版：zh-tw 較大字級 + 較寬行高。

## Notes for implementer

- 設計要 distinctive、精煉、避免 AI-slop（**不用 Inter/Arial/Roboto/system 字、不用紫漸層**）。金色點綴 + 大留白 + 特色 heading 字。
- DRY：UI、/api、MCP 全走同一 service 層；計算只有 `computeTotals` 一份（server+client 共用）。
- 即時預覽與檢視頁共用 `QuoteDocument`，避免兩套版面。
- `pnpm build` + `pnpm lint` + `pnpm test` 全綠才完成，貼結果；附 `astro dev` 各頁 200 驗證。
- Commit 身份 zhenheco <ace@zhenhe-co.com>。不 hardcode secret。若某互動在 Astro/Workers 受限，停下回報，不要 hack 或塞假資料。

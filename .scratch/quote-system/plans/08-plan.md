# Slice 08 — 去範例公司化 + 品牌 setup + seed-brand CLI — Implementation Plan

> For agentic workers: TDD where feasible，frequent commits。STAY on branch `feat/quote-system`；不新建分支；不 cd 他專案。

**Goal:** 讓開源自架者零範例公司殘留地換成自己品牌：出廠全空白、範例公司素材移為 demo、首次 setup 引導、`seed-brand` CLI（HTTP）一次灌品牌、README onboarding。

**Architecture:** 新增 token-gated brand-upload endpoint（複用 `brand.ts` putBrandAsset + `auth` + companyRepo），`seed-brand` 為 HTTP client（像 MCP，吃 URL+token），與「API 為唯一真實來源」一致、可對任何部署用。CSS 金色主題為 app 預設美學（自架者可改 CSS）；本 slice 的「去範例公司」針對**公司資料**（名/地址/匯款/logo/章），非主題色。

**Tech Stack:** Astro API route, Node CLI script, 既有 brand/auth/company 模組, vitest。

---

## File Structure

- Move：`git mv seed/brand examples/demo-brand`；`git mv reference examples/demo-reference`（範例公司原稿 xlsx 當 demo 參考）。
- Create `src/pages/api/company/brand/[asset].ts` — `PUT`（token）：asset ∈ {logo,stamp,bank}，body=image bytes → putBrandAsset(`brand/{asset}.{ext}`) + 更新 company 對應 key；`GET` 可選（已有 /api/brand/[asset] 或 /q/[id]/asset）。
- Create `scripts/seed-brand.mjs` — Node CLI：flags `--logo`/`--stamp`/`--bank`(本地檔路徑) + `--url`/`--token`(或 env QUOTA_API_URL/QUOTA_API_TOKEN)；逐一讀檔 PUT 到 brand endpoint；印結果。
- Modify `src/pages/settings/index.astro` — 未設定偵測（company.name 空 且 無 brand keys）→ 顯示首次 setup 引導區塊（步驟：填公司→上傳 logo/章/匯款→設稅率/備註）。
- Create `README.md`（repo root）— 專案簡介 + 開源 onboarding：clone → 建自己的 CF（D1/R2）→ 設 QUOTA_API_TOKEN secret → `wrangler deploy` → /settings 或 `pnpm seed-brand` 灌品牌 → 裝 MCP。
- Modify `package.json` — 加 `"seed-brand": "node scripts/seed-brand.mjs"` script。
- Create `test/brand-upload-api.test.ts` — endpoint token + 寫入測試。

## Decisions

- 確認**無範例公司公司資料硬編**於 src（grep 「範例公司/範例銀行/範例客戶」與具體地址/帳號）；company 一律來自 D1（slice 02 已種空白）。若發現任何硬編值 → 移除/改空白。
- brand endpoint asset 白名單只允許 `logo|stamp|bank`（防任意 key 寫入）；副檔名由 content-type 或 flag 決定（png/jpg）。
- `seed-brand` 缺 url/token → 明確報錯退出非 0；檔案不存在 → 報錯。
- demo 素材移到 `examples/demo-brand/`，README 註明僅供示範、非預設。1.4M 範例公司 xlsx 已在 git 歷史（移位即可，不重寫歷史）。

## Tasks

- [ ] **Task 1**：去範例公司掃描 + 移檔。`git mv` seed/brand→examples/demo-brand、reference→examples/demo-reference。grep 確認 src 無範例公司硬編（有則清）。更新任何引用路徑（如測試讀 seed/brand 的，改 examples/demo-brand）。驗 `pnpm test`+`pnpm build` 仍綠。Commit：`refactor: relocate 範例公司 brand/reference to examples as demo data (slice-08)`。
- [ ] **Task 2**：brand-upload endpoint（TDD）。`test/brand-upload-api.test.ts`（先 fail）：無 token→401；PUT logo bytes→200、R2 有 `brand/logo.png`、company.logo_key 更新；非白名單 asset→400。實作 route。Commit：`feat: token-gated brand asset upload API (slice-08)`。
- [ ] **Task 3**：`scripts/seed-brand.mjs` + package.json script（TDD 或最小化）。可抽 arg-parse / 單檔上傳為純函式單測（mock fetch）：正確 PUT 到 `{url}/api/company/brand/{asset}` 帶 bearer + bytes；缺 url/token 報錯。Commit：`feat: seed-brand CLI to push brand assets via API (slice-08)`。
- [ ] **Task 4**：/settings 首次 setup 引導（未設定→引導區塊）。驗渲染（ui-render 測試補一筆：空 company 顯示引導）。Commit：`feat: first-run setup guidance in settings (slice-08)`。
- [ ] **Task 5**：README onboarding。驗 `pnpm test`+`pnpm build`+`pnpm --dir packages/mcp test` 全綠。Commit：`docs: open-source onboarding README (slice-08)`。

## Acceptance criteria（對應 issue 08）

- [ ] 出廠無範例公司硬編值；`seed/brand/*` 與 `reference/*.xlsx` 移到 `examples/`。
- [ ] 首次未設定 → `/settings` 顯示 setup 引導。
- [ ] `seed-brand --logo --stamp --bank` 推 R2 + 寫 company key 成功。
- [ ] README：clone → 自己的 CF → wrangler deploy → setup 全流程。

## Notes for implementer

- brand endpoint 與 seed-brand 共用 brand.ts/auth；token 只從 env，不 hardcode/commit。
- asset 白名單嚴格（logo/stamp/bank），防任意 R2 key 寫入。
- 移檔後務必更新所有引用路徑，`pnpm test`+`pnpm build`+`packages/mcp test` 全綠才完成，貼結果。
- Commit 身份 zhenheco <ace@zhenhe-co.com>。停下回報勝過 hack。

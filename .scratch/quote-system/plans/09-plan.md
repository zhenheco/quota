# Slice 09 — 部署準備（AFK 產物）+ 部署 runbook — Implementation Plan

> For agentic workers: STAY on branch `feat/quote-system`；不新建分支；不 cd 他專案。
> 注意：**實際 `wrangler deploy` / D1·R2 建立 / secret / Access 設定需操作者的 Cloudflare 帳號授權，屬 HITL，本 slice 不執行真部署**。只產出部署就緒的設定、腳本、runbook，並備妥 canary。

**Goal:** 把專案弄成「填幾個 id + 跑 runbook 就能上線」的狀態：prod wrangler 設定就緒、migrations 可套、健康檢查 + canary 腳本、DEPLOY.md 全流程文件。

**Architecture:** wrangler.toml 補 migrations + prod 註解；新增無認證 `/api/health` 供 canary；`scripts/canary-check.sh` 打健康端點；DEPLOY.md 寫精確命令（含 Cloudflare Access）。

**Tech Stack:** wrangler, Cloudflare D1/R2/Access, bash。

---

## File Structure

- Modify `wrangler.toml` — 加 `[[d1_databases]] migrations_dir = "migrations"`；補註解：`database_id` 與 r2 bucket 名為部署時填入真值（`wrangler d1 create` 產出）；確認 `compatibility_flags=["nodejs_compat"]`、`[assets] directory="./dist"`（Astro build 產 dist）。
- Create `src/pages/api/health.ts` — `GET`（**無認證**）回 `{ ok: true }` 200，供 canary/uptime。
- Create `scripts/canary-check.sh` — 參數或 env `DEPLOY_URL`；curl `${DEPLOY_URL}/api/health` 期望 200 + `ok:true`，失敗 exit 非 0（給 /go canary 用）。
- Create `DEPLOY.md` — 部署 runbook（見下）。
- Modify `README.md` — 連到 DEPLOY.md。
- 視需要 `test/health-api.test.ts` — health 回 200。

## DEPLOY.md 內容（精確命令）

1. 前置：`pnpm install`、`wrangler login`。
2. 建資源：`wrangler d1 create quota`（記下 database_id 填 wrangler.toml）、`wrangler r2 bucket create quota-files`。
3. 套 schema：`wrangler d1 migrations apply quota --remote`。
4. 設 secret：`printf "%s" "<高熵 token>" | wrangler secret put QUOTA_API_TOKEN`（**勿** echo / 勿落 repo）。
5. 部署：`pnpm build && wrangler deploy`。
6. Cloudflare Access（Zero Trust dashboard，手動）：對部署網域加 Access Application 罩**人類 UI 路徑**（`/`,`/new`,`/q/*`,`/clients`,`/settings`），政策設你的 email；`/api/*` 由 bearer token 保護（機器/MCP），`/api/health` 可公開。
7. 灌品牌：`QUOTA_API_URL=<url> QUOTA_API_TOKEN=<token> pnpm seed-brand --logo ./examples/demo-brand/logo.png --stamp ./examples/demo-brand/stamp.png --bank ./examples/demo-brand/bank.jpg`（或自己的圖），再到 `/settings` 填公司資料。
8. 裝 MCP：`claude mcp add quota -- npx -y quota-mcp`（或本地路徑），設 env `QUOTA_API_URL`/`QUOTA_API_TOKEN`。
9. 冒煙：web `/new` 開一張單下載 xlsx；對話 `create_quote` 開一張單。

## Tasks

- [ ] **Task 1**：`/api/health` endpoint（無認證）+ `test/health-api.test.ts`（200 + ok）。Commit：`feat: unauthenticated health endpoint for canary (slice-09)`。
- [ ] **Task 2**：wrangler.toml 補 migrations_dir + prod 註解（保留 dev 可用）。驗 `pnpm build` 仍過、`pnpm test` 綠。Commit：`chore: wrangler prod-ready config (migrations + notes) (slice-09)`。
- [ ] **Task 3**：`scripts/canary-check.sh`（DEPLOY_URL → /api/health 驗 200/ok，失敗非 0）。`chmod +x`。Commit：`feat: canary health-check script (slice-09)`。
- [ ] **Task 4**：`DEPLOY.md` runbook（上面）+ README 連結。Commit：`docs: deployment runbook (slice-09)`。
- [ ] **Task 5**：全面驗 `pnpm test` + `pnpm build` + `pnpm --dir packages/mcp test` 全綠，貼結果。

## Acceptance criteria（AFK 範圍；真部署為 HITL）

- [ ] `/api/health` 回 200（無需 token），測試覆蓋。
- [ ] wrangler.toml 部署就緒（migrations_dir + 文件化 id 填法）。
- [ ] `scripts/canary-check.sh` 可對 DEPLOY_URL 驗健康。
- [ ] DEPLOY.md 含 wrangler/Access/seed/MCP/冒煙全流程精確命令。
- [ ] 全測試 + build + mcp test 綠。

> 真 `wrangler deploy` / d1·r2 create / secret / Access = 操作者執行（HITL，本 slice 不做）。

## Notes for implementer

- **不要**執行真 `wrangler deploy` / `wrangler d1 create` / `wrangler secret put`（需帳號授權）。只產設定/腳本/文件。
- health 端點不可洩漏內部資訊（只回 ok）。
- secret 文件用 `printf "%s" | wrangler secret put`，**禁** echo、禁範例真 token。
- `pnpm test`+`pnpm build`+`packages/mcp test` 全綠才完成，貼結果。Commit 身份 zhenheco <ace@zhenhe-co.com>。

Status: closed
Type: AFK

# 08 — 去振禾化 + 品牌 setup + seed-brand CLI

## Parent

`.scratch/quote-system/PRD.md`

## What to build

讓開源自架者能換成自己的品牌、零振禾殘留。出廠 `company_profile` 全空白（無振禾硬編值）。把振禾 `seed/brand/*` + `reference/*.xlsx` 移到 `examples/demo-brand/` 並標 demo data（不當預設）。`/settings` 偵測未設定 → 顯示首次 setup 引導。新增 `scripts/seed-brand`（CLI 接 `--logo --stamp --bank` 本地檔案路徑 → 推 R2 + 寫 company key）。README 寫開源 onboarding 全流程。

## Acceptance criteria

- [ ] 出廠無振禾硬編值；`seed/brand/*` 與 `reference/*.xlsx` 移到 `examples/demo-brand/`，評估 gitignore/LFS。
- [ ] 首次未設定 → `/settings` 顯示 setup 引導。
- [ ] `seed-brand --logo --stamp --bank` 推 R2 + 寫 company key 成功。
- [ ] README：clone → 自己的 CF account → wrangler deploy → setup 品牌全流程。

## Blocked by

- `.scratch/quote-system/issues/05-clients-company-api.md`
- `.scratch/quote-system/issues/06-web-ui.md`

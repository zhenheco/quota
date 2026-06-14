Status: ready-for-human
Type: HITL

# 09 — 部署（wrangler + Access + 種子 + 冒煙）

## Parent

`.scratch/quote-system/PRD.md`

## What to build

把系統部署上 Cloudflare 並驗證端到端。`wrangler deploy` 上線、套用 D1 migrations、綁定 R2。Cloudflare Access（Zero Trust）罩人類 UI；機器 token 存 env secret。透過 `seed-brand` 把品牌素材種入自己的 R2。冒煙測試兩條建單路徑。CF Access 設定需手動於 dashboard 完成並文件化。

## Acceptance criteria

- [ ] `wrangler deploy` 成功上線，D1 migrations 套用、R2 綁定生效。
- [ ] Cloudflare Access 罩 UI；機器 bearer token 存 env secret（非明文）。
- [ ] 品牌素材已透過 seed-brand 種入 R2。
- [ ] 冒煙：web 開一張單 + MCP 開一張單皆成功下載 xlsx。

## Blocked by

- `.scratch/quote-system/issues/06-web-ui.md`
- `.scratch/quote-system/issues/07-mcp-server.md`
- `.scratch/quote-system/issues/08-debranding-setup-seed.md`

Status: ready-for-agent
Type: HITL

# 01 — Scaffold + ExcelJS-on-Workers spike

## Parent

`.scratch/quote-system/PRD.md`

## What to build

建立專案地基並驗證最大技術風險。Astro + Cloudflare adapter（Workers runtime）專案可本地 dev 起來；`wrangler.toml` 綁 D1 + R2（dev binding）；vitest + `@cloudflare/vitest-pool-workers` 可跑通一個 trivial 測試。

關鍵 spike：在 Workers runtime（開 `nodejs_compat`）用 ExcelJS `workbook.xlsx.writeBuffer()` 產一個最小 xlsx 並嵌入一張圖。成功 → 全案走 ExcelJS；失敗 → 切 fflate 模板填充 fallback（純 JS、零 Node 依賴）。本 slice 結論需明確記錄走哪條路（影響 Slice 2）。

## Acceptance criteria

- [ ] `npm/pnpm dev` 起得來，Astro + CF adapter 正常 SSR。
- [ ] `wrangler.toml`（或 `.jsonc`）綁 D1 + R2 dev binding。
- [ ] vitest + `@cloudflare/vitest-pool-workers` 跑通一個通過測試。
- [ ] spike：Workers runtime 內 ExcelJS `writeBuffer()` 產出含一張嵌圖的 xlsx 成功，或記錄失敗並確立 fflate fallback。
- [ ] 決策結論寫入本 issue 留言（ExcelJS / fflate）。

## Blocked by

None - can start immediately

## Comments

- 2026-06-14: Decision: use ExcelJS for Slice 03. Verified in the Cloudflare Workers test runtime with `nodejs_compat` via `pnpm test`: `buildSpikeXlsx()` uses `workbook.xlsx.writeBuffer()`, embeds a PNG with `workbook.addImage()`, and ExcelJS reload confirms worksheet cell data plus `worksheet.getImages().length === 1`. fflate fallback is not needed for the current runtime/package set.

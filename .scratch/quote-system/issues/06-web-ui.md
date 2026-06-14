Status: closed
Type: AFK

# 06 — Web UI（清單 / 編輯器+即時預覽 / 檢視 / 客戶 / 設定）

## Parent

`.scratch/quote-system/PRD.md`

## What to build

Astro SSR 頁面與報價單共用 HTML/CSS 元件（即時預覽與檢視頁共用）。專業簡約現代風：白底、大留白、金色細線分隔/表頭/總計、A4 比例。

- `/`：報價清單，表格 + 搜尋/篩選（客戶/狀態/日期），新增/檢視/複製/改狀態。
- `/new`、`/q/[id]/edit`：左表單右即時預覽。表單＝選/建客戶、標題、日期、有效期、品項列（增刪、自動算金額）、稅率、備註；按鈕＝儲存、下載 Excel、列印/存 PDF。
- `/q/[id]`：唯讀美化版 + 下載鈕 + 改狀態。
- `/clients`：客戶 CRUD。
- `/settings`：公司資料/匯款/品牌素材/預設備註/稅率。

`@media print` + `@page A4` → Cmd+P 直接存乾淨 PDF。

## Acceptance criteria

- [ ] `/` 清單可搜尋/篩選、能新增/檢視/複製/改狀態。
- [ ] `/new`+`/q/[id]/edit` 左表單右即時預覽，品項列增刪即時算 amount/小計/稅/總計，可儲存與下載 xlsx。
- [ ] `/q/[id]` 唯讀美化 + 下載 + 改狀態；列印（Cmd+P）輸出乾淨 A4 PDF。
- [ ] `/clients` CRUD 可用；`/settings` 可改公司/匯款/品牌/備註/稅率。
- [ ] CJK 排版：zh-tw 較大字級 + 較寬行高。

## Blocked by

- `.scratch/quote-system/issues/04-quotes-api-token.md`
- `.scratch/quote-system/issues/05-clients-company-api.md`

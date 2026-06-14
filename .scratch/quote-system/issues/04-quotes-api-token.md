Status: ready-for-agent
Type: AFK

# 04 — Quotes API + 機器 token

## Parent

`.scratch/quote-system/PRD.md`

## What to build

Astro endpoints（綁 D1+R2）提供報價 CRUD 與檔案串流，加機器 bearer token 驗證 `requireToken`。`POST /api/quotes` 建單後即呼叫 `generateQuoteXlsx` 產 xlsx 寫入 R2、更新 D1 `xlsx_key`，回 `{id, quote_no, view_url, xlsx_url}`。其餘：`GET /api/quotes`（列表+搜尋/篩選）、`GET/PUT/DELETE /api/quotes/[id]`、`POST /api/quotes/[id]/regenerate`、`GET /api/quotes/[id]/xlsx`（從 R2 串流）。機器路徑需 `Authorization: Bearer <token>`，token 走 env secret。

## Acceptance criteria

- [ ] 建→讀→改→刪整條 CRUD 過測試（真 D1/R2）。
- [ ] POST 建單後 R2 有 xlsx、D1 `xlsx_key` 更新、回 view_url + xlsx_url。
- [ ] `regenerate` 重產 xlsx；`xlsx` endpoint 正確串流下載。
- [ ] 無 token / 錯 token 被拒（401），正確 token 通過（測試覆蓋）。
- [ ] 輸入驗證：品項數值、稅率範圍、必填欄位。

## Blocked by

- `.scratch/quote-system/issues/03-xlsx-builder.md`

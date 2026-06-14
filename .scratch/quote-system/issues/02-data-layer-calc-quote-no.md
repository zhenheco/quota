Status: ready-for-agent
Type: AFK

# 02 — 資料層 + 計算 + 報價單號

## Parent

`.scratch/quote-system/PRD.md`

## What to build

D1 資料層與兩個深模組。建 4 張表（`company_profile` 單列出廠空白、`clients`、`quotes` 含客戶+金額快照、`quote_items`）的 migrations 與 repository CRUD。純函式計算模組 `computeTotals`（amount=round(qty×unit_price)、subtotal=Σamount、tax_amount=round(subtotal×tax_rate)、total=subtotal+tax_amount）。報價單號生成 `nextQuoteNo`（D1 交易內當日序號遞增、跨日歸零、併發不撞號）。

TDD：先寫失敗測試再實作。

## Acceptance criteria

- [ ] D1 migrations 建 4 表，repository 可寫讀（真 D1 binding 測試）。
- [ ] `computeTotals` 單元測試過：48000→稅2400→總50400，且多列加總正確、四捨五入正確。
- [ ] `nextQuoteNo` 測試過：當日遞增、跨日歸零、併發呼叫不產生重複號。
- [ ] `quotes` 寫入時客戶與金額為快照（後續改 client 不影響歷史）。

## Blocked by

- `.scratch/quote-system/issues/01-scaffold-exceljs-spike.md`

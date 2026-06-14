Status: ready-for-agent
Type: AFK

# 03 — xlsx builder（伺服器端，像素對齊原稿 + 嵌圖）

## Parent

`.scratch/quote-system/PRD.md`

## What to build

伺服器端產報價 xlsx 的深模組 `generateQuoteXlsx(quote, items, company, brand) -> ArrayBuffer`，web 與 MCP 兩條路徑共用。依 Slice 01 spike 結論用 ExcelJS `writeBuffer()`（或 fflate 模板填充 fallback）。版面對齊振禾原稿：合併抬頭、金色表頭填色+邊框、動態 N 列品項、總計區（小計/稅率/稅金/總計）、備註、嵌 logo（上）+ 報價章與玉山存摺（下）。數字格式 `#,##0`、日期格式化。品牌素材以 R2 取得的 arraybuffer 嵌入（來自 `src/server/brand.ts`）。

## Acceptance criteria

- [ ] `generateQuoteXlsx` 回 ArrayBuffer，回讀關鍵格正確（抬頭、品項、小計/稅/總計）。
- [ ] 嵌圖數 = 3（logo + 章 + 匯款圖）。
- [ ] 動態品項列數正確（測 1 列與多列）。
- [ ] 數字 `#,##0` 格式、金色表頭/邊框呈現。
- [ ] 失敗路徑（缺素材/壞資料）回明確錯誤而非靜默壞掉。

## Blocked by

- `.scratch/quote-system/issues/02-data-layer-calc-quote-no.md`

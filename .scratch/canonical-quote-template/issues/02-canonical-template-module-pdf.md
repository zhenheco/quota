Status: closed
Type: feat

# 02 — 共用模板模組 + PDF 改 Design C

**Type**: AFK · **Blocked by**: 01 · **User stories**: #2, #5, #6, #7, #11
Spec: Slice 2 + `…-design.md` §3/§4.1/§4.4/§13.

抽出 Design C 的唯一 markup+CSS 模組，PDF 改用它。這是「單一真相來源」的核心。

## Acceptance criteria
- [ ] 新建 `src/shared/quote-document-template.ts`（瀏覽器安全、純函式、無 Node/Workers-only 依賴）導出：
  - `QUOTE_DOCUMENT_CSS: string`（Design C：置中 serif「報 價 單」+ 小字 QUOTATION、金棕 `#A6791A`、賣方/客戶 block、計畫名金底線、5 欄品項表、虛線總計、匯款+印章 footer；含 `@page { size:A4; margin:14mm }`；文件樣式 scope 在 `.quote-sheet`）。
  - `renderQuoteItemRows(items: QuoteDocumentItemView[]): string`（5 欄 `<tr>`：品項·內容合併（粗體品名 + `<br>` 換行說明、不自動編號）/數量/單位/單價/金額）。
  - `renderQuoteDocumentBody(view, brand): string`（`<article class="quote-sheet">…`；呼叫 `renderQuoteItemRows`；品牌圖用傳入 src 字串；**逐值 escape 文字與屬性**；輸出全部編輯器 hook：`data-preview` for subject/clientName/clientContact/clientTaxId/clientPhone/quoteDate/validUntil/notes/subtotal/taxRate/taxAmount/total/quoteNo/companyName/companyContact/items + `data-preview-optional="clientTaxId"` + `data-preview-tax-row`）。
  - `escapeHtml(s): string`（共用；`quote-pdf-html.ts` 改 import 此版、移除私有 copy）。
- [ ] `src/server/quote-pdf-html.ts` `buildQuoteHtml(quote, company, brand)`（contract 不變）改為包 `renderQuoteDocumentBody` + inline `QUOTE_DOCUMENT_CSS` + 字體 link + data-URI 品牌圖；移除舊 `css()` 與舊 markup。
- [ ] `src/server/quote-pdf.ts`：puppeteer/CF margin 設 **0**（讓 CSS `@page` 擁有邊距）。
- [ ] 賣方抬頭含 `companyContact`（來自 01）。稅率>0 顯示 未稅小計/營業稅 N%/總計（含稅）三列；稅率0 隱藏。
- [ ] `test/quote-pdf-html.test.ts`：斷言輸出含置中「報 價 單」、`companyContact`、稅列顯隱；**不**斷言字面 `QUOTATION` 缺席，改斷言 root class 為 `quote-sheet`（舊 `quotation-sheet` 消失）；`makeCompany` fixture 已含 contact（01）。
- [ ] 新增 `test/template-hooks.test.ts`：斷言 `renderQuoteDocumentBody` 輸出含 `quote-editor.ts` 查詢的**每個** selector（`data-preview*`、`data-preview-optional`、`data-preview-tax-row`）。
- [ ] `pnpm test` + `astro check` 全綠。

## TDD
先寫 template-hooks + pdf-html Design C 斷言（紅）→ 實作模組 + buildQuoteHtml 改寫 → 綠 → refactor。

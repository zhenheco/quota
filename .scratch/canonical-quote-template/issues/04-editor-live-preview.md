Status: closed
Type: feat

# 04 — 編輯器即時預覽改 Design C（hook + 5 欄 + 新單品牌圖）

**Type**: AFK · **Blocked by**: 03 · **User stories**: #3, #8, #9
Spec: Slice 4 + `…-design.md` §4.3/§13 (R4/R5).

讓編輯器右邊即時預覽就是 Design C，且品項列共用同一 renderer、所有 hook 仍運作、新單也顯示品牌圖。

## Acceptance criteria
- [ ] `src/client/quote-editor.ts`：`renderItems()` 改呼叫共用 `renderQuoteItemRows`（5 欄）；先把扁平 `PreviewItem`（{name,description,qty,unit,unit_price}）映射成 `QuoteDocumentItemView`（用共用 `formatQuantity`/`formatMoney` 產 qtyLabel/unitPriceLabel/amountLabel）再呼叫。
- [ ] `updatePreview()` set `companyContact`；驗證所有 `data-preview` / `data-preview-optional="clientTaxId"` / `data-preview-tax-row` selector 在新 markup 仍解析（否則隱藏空欄/稅列會失效）。
- [ ] 編輯既有單：改主旨/客戶/品項（增删、改數量/單價）即時更新預覽，版型不破、數字格式正確。
- [ ] 新建單（`id=-1`）右邊預覽顯示 logo/印章/存摺（走 03 的 `/api/company/brand/[asset]` GET，不依賴 quote id）。
- [ ] `test/template-hooks.test.ts` 涵蓋編輯器查詢的全部 selector（與 02 一致，確保不漏）。
- [ ] `pnpm test` + `astro check` 全綠。

## TDD
先寫/補 hook 覆蓋 + renderItems 5 欄一致性測（紅）→ 改 quote-editor.ts → 綠 → 手動驗新單預覽品牌圖。

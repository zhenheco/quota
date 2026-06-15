Status: closed
Type: feat

# 03 — 線上 /q/[id] 預覽改 Design C + 品牌圖 GET 路由

**Type**: AFK · **Blocked by**: 02 · **User stories**: #1, #2, #10, #11
Spec: Slice 3 + `…-design.md` §4.2/§4.4/§13.

線上頁渲染與 PDF 同一個 builder（像素一致），並新增可被瀏覽器 `<img>` 讀取的品牌圖 GET 路由。

## Acceptance criteria
- [ ] `src/pages/api/company/brand/[asset].ts` 新增 **`GET`**（asset∈logo|stamp|bank）：以 `env.FILES.get(company.<asset>_key)` 直取（不經 `getBrandAsset`，`brand.ts` 不改），回圖 + `ETag`(object.httpEtag)、honor `If-None-Match`→304、`Cache-Control: public, max-age=60, must-revalidate`、正確 content-type；`PUT` 維持 Bearer。
- [ ] `src/components/QuoteDocument.astro`：改用 `set:html={renderQuoteDocumentBody(view, brandUrls)}`，品牌圖 src 指向 `/api/company/brand/{logo|stamp|bank}`；注入 `<style set:html={QUOTE_DOCUMENT_CSS}>` + 與 PDF 相同的 Noto Serif/Sans TC 字體 `<link>`；root class `quote-sheet`。
- [ ] `src/styles/global.css`：移除舊 `.quotation-sheet*`，改為螢幕外框（頁面外觀/陰影 + `@media print`）；文件字體 scope 在 `.quote-sheet`（root 17px 與文件 13px 不互染）；`@page` 邊距由 `QUOTE_DOCUMENT_CSS` 擁有。
- [ ] `/q/[id]` 線上頁與下載 PDF **像素一致** Design C；客戶統編空則該列隱藏（`data-preview-optional`）。
- [ ] 新增 `test/template-parity.test.ts`：對相同 quote/company，`QuoteDocument.astro` 渲染 body 與 `buildQuoteHtml` body 正規化（品牌 src data-URI↔URL、空白）後結構相等。
- [ ] `pnpm test` + `astro check` 全綠。

## TDD
先寫 template-parity（紅）→ 加 GET 路由 + 改 QuoteDocument.astro/global.css → 綠 → refactor。

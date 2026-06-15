# PRD: Canonical Quote Template (Design C) + Seller Contact

Status: ready-for-agent

> Spec: `docs/superpowers/specs/2026-06-15-canonical-quote-template-spec.md` (go-conformant) + `…-design.md` (full architecture + 2-round cross-review). Tracker: local-md.

## Problem Statement

振禾老闆用 Quota 開報價單給客戶。同一張報價單，**線上頁、編輯時的即時預覽、下載的 PDF 長得不一樣**（系統內有兩套版型），不一致、不專業。老闆已挑定要的版型（Design C「報 價 單」精緻金棕 editorial），希望以後網站生成的每張報價單線上＋PDF 永遠長這樣。另外賣方抬頭無法填「聯絡人」，政府計畫附件資訊不完整。

## Solution

把 Design C 設為**唯一**報價單版型，線上 `/q/[id]` 預覽、編輯器即時預覽、下載 PDF 三處像素一致（WYSIWYG）。設定頁新增「賣方聯絡人」，抬頭顯示 名稱／統編／地址／聯絡人／電話。xlsx 不動。

## User Stories

1. As 振禾老闆, I want 線上 `/q/[id]` 顯示 Design C 版型, so that 寄客戶連結看起來專業。
2. As 振禾老闆, I want 下載 PDF 與線上頁像素一致 Design C, so that 不出現兩套樣子。
3. As 振禾老闆, I want 編輯時右邊即時預覽即 Design C, so that 所見即所得。
4. As 振禾老闆, I want `/settings` 填「賣方聯絡人」, so that 抬頭顯示範例負責人。
5. As 振禾老闆, I want 抬頭顯示 名稱/統編/地址/聯絡人/電話, so that 政府附件資訊完整。
6. As 振禾老闆, I want 稅率>0 顯示 未稅/營業稅 N%/含稅總計、稅率0 隱藏, so that 含稅與未稅都正確。
7. As 振禾老闆, I want 品項顯示品名+多行說明（保留換行）, so that 9 點內容完整。
8. As 振禾老闆, I want 新建（未存檔）單預覽也顯示 logo/印章/存摺, so that 建立過程就見完整版型。
9. As 振禾老闆, I want 編輯品項（增删/數量/單價）預覽即時更新且版型不破, so that 預覽可靠。
10. As 振禾老闆, I want 客戶統編空則該列隱藏, so that 無空白欄。
11. As 開發者, I want 線上頁與 PDF 共用同一 markup builder + 同一 CSS, so that 不再分歧。
12. As 開發者, I want 加 `company.contact` 後既有測試/型別仍編過, so that 不破 CI。
13. As 振禾老闆, I want 部署前備份 prod D1、部署後實機驗證, so that 不弄壞線上真實資料。
14. As 振禾老闆, I want xlsx 維持原樣, so that 既有 Excel 流程不受影響。

## Implementation Decisions

- **模組**: 新建 deep module `src/shared/quote-document-template.ts`（瀏覽器安全）導出 `renderQuoteDocumentBody(view, brand)`、`renderQuoteItemRows(items)`、`QUOTE_DOCUMENT_CSS`、`escapeHtml` — Design C 的唯一 markup+CSS 來源，PDF 與 Astro `set:html` 與 client editor 共用。品牌圖 src 策略在 renderer 外（PDF=data-URI、線上=URL）。
- **Schema**: `migrations/0003_add_contact.sql` = `ALTER TABLE company_profile ADD COLUMN contact TEXT;`（nullable，比照 address/phone）。`Company.contact: string | null`。`db.ts` positional bind 同步加。
- **API contract**: 新增 `GET /api/company/brand/[asset]`（asset∈logo|stamp|bank）→ `env.FILES.get` 直取 + ETag + If-None-Match→304 + `Cache-Control: public, max-age=60, must-revalidate`；不經 `getBrandAsset`（保留 etag），`brand.ts` 不改；PUT 維持 Bearer。`validateCompanyPatch` 加 `'contact'`。
- **set:html 安全**: 繞過 Astro escape → builder 自己 escape 每個文字+屬性值。
- **編輯器 hook（必保留）**: builder 輸出全部 `data-preview*` + `data-preview-optional="clientTaxId"` + `data-preview-tax-row`。
- **品項列**: Design C 5 欄（品項·內容合併/數量/單位/單價/金額）；`description` 單一 `\n` 自由文字、`<br>` 渲染、不自動編號；`renderQuoteItemRows` 吃已格式化 view，編輯器 `PreviewItem`→`QuoteDocumentItemView` 映射後呼叫。
- **@page**: `QUOTE_DOCUMENT_CSS` 擁有 `@page A4 margin:14mm`；`quote-pdf.ts` puppeteer margin 設 0。
- **字體**: 線上頁載入與 PDF 相同 Noto Serif/Sans TC `<link>`。
- **安全/權限**: 品牌圖 GET 公開非機密；Cloudflare Access 是否 front `/api/company/brand/*` 須部署實機 smoke（302→login 則改 Basic-protected route）。MCP mirror 加在 **Company** interface（非 Client）。
- **邊界**: 稅列 `tax_rate>0` 才顯示；nullable `?? current` 代表設後不可清空（同 address/phone）；新單 id=-1，品牌圖走 company GET。

## Testing Decisions

好測試只測外部可觀察行為。要測：
- company.contact 全鏈（PUT 持久化/GET 回傳/partial 保留，set-and-preserve）— prior art `test/clients-company-api.test.ts`。
- `buildQuoteHtml` 輸出含 Design C 標記（置中報價單、companyContact、稅列顯隱）、root class `quote-sheet`（舊 `quotation-sheet` 消失）— prior art `test/quote-pdf-html.test.ts`。
- 編輯器 hook inventory（builder 含所有編輯器查詢 selector）— 新測。
- template parity（線上 body == PDF body，正規化品牌 src）— 新測。
- `renderQuoteItemRows` 5 欄、映射一致。
- xlsx 不改，僅補 fixture `contact` 使型別編過 — `test/quote-xlsx.test.ts`。

## Out of Scope

- xlsx 版型不改（僅補 fixture 型別）；xlsx 不顯示賣方聯絡人（已知不對稱）。
- 不改資料模型/totals/auth/routing；不退役 `/q/[id]/asset.ts`；不做新功能。

## Further Notes

- 完整設計/CSS/風險/兩輪交叉審查見 `…-design.md`。
- Deploy = prod quote24.cc（HITL，Slice 5）；先備份 D1，部署後實機 smoke。
- `pnpm test` 不含 `packages/**` → MCP 靠 `pnpm --dir packages/mcp build` 把關。

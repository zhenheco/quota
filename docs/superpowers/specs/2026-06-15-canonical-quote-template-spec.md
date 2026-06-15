# Canonical Quote Template (Design C) + Seller Contact — SPEC

> `/go` input. Design reference + full architecture + 2-round cross-review: `docs/superpowers/specs/2026-06-15-canonical-quote-template-design.md` (read it for CSS target, file-by-file, risks).

---

## Problem Statement

老闆（範例公司）用 Quota 開報價單給客戶。同一張報價單，**網站上看到的樣子、編輯時右邊預覽、跟下載的 PDF 長得不一樣**——系統內有兩套版型，看起來不一致、不專業。老闆已挑定要的版型（「報 價 單」精緻金棕 editorial 版，Design C），希望**以後網站生成的每一張報價單（線上預覽 + PDF）永遠長這樣**。另外賣方抬頭目前無法填「聯絡人」，做政府計畫附件時資訊不完整。

## Solution

把 Design C 設為**唯一**的報價單版型，線上 `/q/[id]` 預覽、編輯器即時預覽、下載 PDF 三處完全一致（所見即所得）。設定頁新增「賣方聯絡人」欄，抬頭可顯示 名稱／統編／地址／聯絡人／電話。使用者體感：在 `/settings` 填一次公司資料 → 任何報價單的線上頁與 PDF 都是同一套精緻版型、含完整賣方資訊。xlsx 下載維持現狀。

## User Stories

1. As 範例公司老闆, I want 線上 `/q/[id]` 報價單頁顯示 Design C 版型, so that 寄連結給客戶時看起來專業一致。
2. As 範例公司老闆, I want 下載的 PDF 與線上頁**像素一致**的 Design C, so that 不會出現「網頁一套、PDF 另一套」。
3. As 範例公司老闆, I want 編輯報價單時右邊即時預覽就是 Design C, so that 所見即所得、不必下載才知道長相。
4. As 範例公司老闆, I want 在 `/settings` 填「賣方聯絡人」, so that 抬頭能顯示 範例負責人 作為聯絡人。
5. As 範例公司老闆, I want 賣方抬頭顯示 名稱／統編／地址／聯絡人／電話, so that 政府計畫附件資訊完整。
6. As 範例公司老闆, I want 稅率 > 0 時顯示 未稅小計／營業稅 N%／總計（含稅）三列、稅率 0 時隱藏, so that 含稅與未稅報價都正確。
7. As 範例公司老闆, I want 品項顯示 品名 + 多行說明（自由文字、保留換行）, so that 9 點服務內容完整呈現。
8. As 範例公司老闆, I want **新建（未存檔）** 報價單時右邊預覽也能顯示 logo／印章／存摺圖, so that 建立過程就看到完整版型（不必先存檔）。
9. As 範例公司老闆, I want 編輯品項（增删、改數量/單價）時預覽即時更新且版型不破, so that 即時預覽可靠。
10. As 範例公司老闆, I want 客戶統編為空時該列自動隱藏、有值才顯示, so that 沒有空白欄。
11. As 開發者, I want 線上頁與 PDF 共用同一個 markup builder + 同一份 CSS, so that 不再分歧、改一處兩處同步。
12. As 開發者, I want 新增 `company.contact` 後既有測試與型別仍編得過, so that 不破壞 build/CI。
13. As 範例公司老闆, I want 部署前先備份 prod D1、部署後實機驗證, so that 不會弄壞線上真實資料。
14. As 範例公司老闆, I want xlsx 下載維持原樣不動, so that 既有 Excel 流程不受影響。

## Modules

| Module | 職責（一句） | 公開介面（窄） | 新建/修改 |
|---|---|---|---|
| `src/shared/quote-document-template.ts` | Design C 的**唯一** markup + CSS 來源（瀏覽器安全，server/Astro/client 共用） | `renderQuoteDocumentBody(view, brand) -> string`、`renderQuoteItemRows(items) -> string`、`QUOTE_DOCUMENT_CSS: string`、`escapeHtml(s) -> string` | 新建 |
| `src/server/quote-pdf-html.ts` | PDF：包 `renderQuoteDocumentBody` + inline CSS + 字體 + data-URI 品牌圖 | `buildQuoteHtml(quote, company, brand) -> string`（contract 不變） | 修改 |
| `src/components/QuoteDocument.astro` | 線上頁/編輯器預覽：`set:html` 同一 builder，品牌走 URL，注入同一 CSS + 字體 link | Astro component props `{quote, company}` | 修改 |
| `src/pages/api/company/brand/[asset].ts` | 新增**公開 GET** 讀品牌圖（`env.FILES.get` 直取 + ETag + 304），保留 PUT(Bearer) | `GET /api/company/brand/{logo\|stamp\|bank}` | 修改 |
| `src/server/quote-document-view.ts` | view model 加 `companyContact` | `createQuoteDocumentView` += `companyContact` | 修改 |
| company 全鏈（`types.ts`/`db.ts`/`company-service.ts`/`ui-forms.ts`/`settings/index.astro`/`packages/mcp/src/api-client.ts`） | 新增 `contact` 欄位 | `Company.contact: string \| null` | 修改 |
| `migrations/0003_add_contact.sql` | D1 加 `contact` 欄（nullable，比照 address/phone） | `ALTER TABLE company_profile ADD COLUMN contact TEXT;` | 新建 |
| `src/client/quote-editor.ts` | 即時預覽：呼叫共用 `renderQuoteItemRows`、保留所有 data-preview hook、set `companyContact` | — | 修改 |

## Implementation Decisions

- **Schema**: `migrations/0003_add_contact.sql` = `ALTER TABLE company_profile ADD COLUMN contact TEXT;`（nullable，no default；比照 address/phone，非 tax_id 的 NOT NULL DEFAULT ''）。`Company.contact: string | null`。`db.ts companyRepo.update()` 是 positional bind → 加 `contact = ?N` + `patch.contact ?? current.contact` 須**同步**改 SQL 與 bind() list。
- **API contract**: 新增 `GET /api/company/brand/[asset]`（asset ∈ logo|stamp|bank）→ 直接 `env.FILES.get(company.<asset>_key)`，回圖 + `ETag`(object.httpEtag)、honor `If-None-Match`→304、`Cache-Control: public, max-age=60, must-revalidate`。**不經 `getBrandAsset`**（它丟棄 etag；`brand.ts` 不改）。`PUT` 維持 Bearer。`PUT /api/company` 無需改（`validateCompanyPatch` 加 `'contact'` 進 optional-string loop 即可）。
- **架構決策（單一真相來源）**: 抽 `src/shared/quote-document-template.ts`（瀏覽器安全）導出 `renderQuoteDocumentBody`+`renderQuoteItemRows`+`QUOTE_DOCUMENT_CSS`+`escapeHtml`。PDF 與 Astro `set:html` 共用同一 markup；品牌圖 src 策略在 renderer **外**（PDF 傳 data-URI、線上傳 URL）。選此 vs「兩個 renderer 各自維護」：後者正是現在分歧的根因，且 parity test 也擋不住 drift。
- **set:html 逃逸**: `set:html` 繞過 Astro 自動 escape → builder 必須自己 `escapeHtml` **每個文字值與屬性值**（含 data-preview 內插）。
- **編輯器 hook（必保留）**: `renderQuoteDocumentBody` 必須輸出 `quote-editor.ts` 查詢的**全部** hook：`data-preview="subject,clientName,clientContact,clientTaxId,clientPhone,quoteDate,validUntil,notes,subtotal,taxRate,taxAmount,total,quoteNo,companyName,companyContact,items"` + `data-preview-optional="clientTaxId"` + `data-preview-tax-row`。
- **品項列**: Design C = **5 欄**（品項·內容 合併 ｜ 數量 ｜ 單位 ｜ 單價 ｜ 金額），無項次欄。`description` 維持**單一 `\n` 分隔自由文字、以 `<br>` 渲染、不自動編號**（既有資料已含「1. 2. …」）。`renderQuoteItemRows(items: QuoteDocumentItemView[])` 吃**已格式化**的 view；編輯器 `readItems()` 的扁平 `PreviewItem` 須先映射成 `QuoteDocumentItemView`（`formatQuantity`/`formatMoney`）再呼叫。
- **@page 歸屬**: `QUOTE_DOCUMENT_CSS` 擁有 `@page { size:A4; margin:14mm }`；`quote-pdf.ts` 的 puppeteer/CF margin **設 0**（避免雙重套用）。
- **字體 parity**: 線上頁必須載入與 PDF **相同**的 Noto Serif TC(700/900)+Noto Sans TC `<link>`，否則「報 價 單」serif 標題 fallback、線上≠PDF。
- **安全/權限**: 品牌圖 GET 為**公開非機密**（logo/印章/存摺本就印在每張已發布 PDF）；`/api/*` 已豁免 Basic（`middleware.ts:9`）。**風險**：Cloudflare Access 是否 front `/api/company/brand/*` 無法從原始碼確認 → 部署時必須實機 smoke（`<img>` 載入；若 302→login 則改放 Basic-protected 非 `/api` route）。MCP mirror：`contact` 加在 **`Company`** interface（非已存在 contact 的 `Client`）。
- **邊界/效能**: 稅列 `tax_rate > 0` 才顯示；`fallback()` 處理 null `contact`；nullable `?? current.contact` 代表設定後**無法清空**（與 address/phone 同限制，刻意）；新單 id = **-1**（`ui-quotes.ts`），品牌圖走 company GET（不依賴 quote id）。

## Testing Decisions

| Module | 要測? | 測什麼外部行為 | Prior art |
|---|---|---|---|
| company.contact 全鏈 | ✅ | PUT `{contact}` 持久化、GET 回傳、partial PATCH 保留（set-and-preserve，非清空） | `test/clients-company-api.test.ts` |
| `quote-pdf-html.ts buildQuoteHtml` | ✅ | 輸出含 Design C 標記（置中「報 價 單」、companyContact、稅>0 三列/稅=0 無）、root class 為 `quote-sheet`（舊 `quotation-sheet` 消失） | `test/quote-pdf-html.test.ts` |
| 編輯器 hook inventory | ✅ | `renderQuoteDocumentBody` 輸出含 `quote-editor.ts` 查詢的每個 selector（含 `data-preview-optional`、`data-preview-tax-row`） | 新測 `test/template-hooks.test.ts` |
| template parity | ✅ | `QuoteDocument.astro` body 與 `buildQuoteHtml` body 結構相同（正規化品牌 src 差異） | 新測 `test/template-parity.test.ts` |
| `renderQuoteItemRows` | ✅ | 5 欄列、`PreviewItem`→view 映射後與 body 內品項區一致 | `test/quote-pdf-html.test.ts` |
| xlsx | ❌（不改，僅補 fixture `contact` 使型別編過） | — | `test/quote-xlsx.test.ts` |

## Vertical Slices

### Slice 1 — 賣方聯絡人 full-chain（schema→service→settings→MCP）
- **Type**: AFK
- **Blocked by**: None
- **User stories**: #4, #5, #12
- **Acceptance criteria**:
  - [ ] `migrations/0003_add_contact.sql` 加 `contact TEXT`（nullable）；`Company.contact: string | null`（`types.ts` + `packages/mcp/src/api-client.ts` 的 **Company** interface）。
  - [ ] `db.ts companyRepo.update()` SQL + bind 同步加 `contact`；`company-service.ts validateCompanyPatch` 接受 `contact`；`ui-forms.ts companyPatchFromForm` 解析 `contact`。
  - [ ] `/settings` 有「賣方聯絡人」輸入，存檔後 `GET /api/company` 回傳 `contact`；partial PATCH 不清掉既有 `contact`。
  - [ ] 既有 4 個 `resetDb()` 與所有 inline `Company` fixture（含 `test/quote-xlsx.test.ts`）補 `contact` 使 `astro check`/build/`pnpm test` 全綠。
  - [ ] round-trip 測試（set→GET→preserve）綠。

### Slice 2 — 共用模板模組 + PDF 改 Design C
- **Type**: AFK
- **Blocked by**: Slice 1
- **User stories**: #2, #5, #6, #7, #11
- **Acceptance criteria**:
  - [ ] 新建 `src/shared/quote-document-template.ts`：`renderQuoteDocumentBody`、`renderQuoteItemRows`、`QUOTE_DOCUMENT_CSS`、`escapeHtml`（Design C；逐值 escape 文字+屬性；輸出全部 data-preview / data-preview-optional / data-preview-tax-row hook）。
  - [ ] `quote-document-view.ts` 加 `companyContact`（`fallback(company.contact,'')`）。
  - [ ] `buildQuoteHtml` 改用共用模組 + inline `QUOTE_DOCUMENT_CSS` + 字體；移除舊 `css()`；`quote-pdf.ts` margin 設 0。
  - [ ] 下載 PDF 為 Design C：置中「報 價 單」、賣方含聯絡人、稅>0 三列、9 點說明保留換行；root class `quote-sheet`。
  - [ ] `test/quote-pdf-html.test.ts` 斷言 Design C 標記 + 不依賴字面 `QUOTATION`（改斷言舊 `quotation-sheet` 消失）；新增 `test/template-hooks.test.ts` 斷言 hook inventory。全綠。

### Slice 3 — 線上 `/q/[id]` 預覽改 Design C + 品牌圖 GET 路由
- **Type**: AFK
- **Blocked by**: Slice 2
- **User stories**: #1, #2, #10, #11
- **Acceptance criteria**:
  - [ ] 新增 `GET /api/company/brand/[asset]`（`env.FILES.get` 直取 + ETag + If-None-Match 304 + `Cache-Control: public, max-age=60, must-revalidate`）；PUT 維持 Bearer。
  - [ ] `QuoteDocument.astro` 用 `set:html={renderQuoteDocumentBody(view, brandUrls)}`，品牌圖 src 指向 company GET 路由，注入 `QUOTE_DOCUMENT_CSS` + 與 PDF 相同字體 `<link>`；root class `quote-sheet`。
  - [ ] `global.css` 移除舊 `.quotation-sheet*`、改螢幕外框（陰影/頁面外觀 + `@media print`）；文件字體 scope 在 `.quote-sheet`（root 17px vs 文件 13px 不互染）。
  - [ ] `/q/[id]` 線上頁與 PDF **像素一致** Design C；客戶統編空則該列隱藏。
  - [ ] 新增 `test/template-parity.test.ts`（線上 body == PDF body，正規化品牌 src）綠。

### Slice 4 — 編輯器即時預覽改 Design C（hook + 5 欄 + 新單品牌圖）
- **Type**: AFK
- **Blocked by**: Slice 3
- **User stories**: #3, #8, #9
- **Acceptance criteria**:
  - [ ] `quote-editor.ts renderItems()` 改呼叫共用 `renderQuoteItemRows`（5 欄；`PreviewItem`→`QuoteDocumentItemView` 映射）；`updatePreview()` set `companyContact`；保留並驗證所有 data-preview / data-preview-optional / data-preview-tax-row hook 仍解析。
  - [ ] 編輯既有單：改主旨/客戶/品項（增删/數量/單價）即時更新預覽且版型不破。
  - [ ] 新建單（id=-1）右邊預覽顯示 logo/印章/存摺（走 company GET 路由）。
  - [ ] hook inventory 測試涵蓋編輯器查詢的全部 selector；`pnpm test` + `astro check` 全綠。

### Slice 5 — 部署 prod（migration + deploy + 實機驗證 + 回填）
- **Type**: HITL
- **Blocked by**: Slice 4
- **User stories**: #1, #2, #13
- **Acceptance criteria**:
  - [ ] 先 `wrangler d1 export <DB> --remote` 備份 prod D1。
  - [ ] `wrangler d1 migrations apply <DB> --remote`（additive，舊碼相容）→ `pnpm build && wrangler deploy -c dist/server/wrangler.json` → `pnpm --dir packages/mcp build`。
  - [ ] 實機 smoke：`/settings` 有聯絡人並可存；`/q/8` 線上 = Design C；下載 PDF（CF Browser Rendering）= Design C；新建單編輯器顯示品牌圖；**`<img>` 載 company brand GET 不被 Access 擋**（若 302 則改 Basic-protected route）。
  - [ ] 回填 `company.contact = 範例負責人`。

## Out of Scope

- xlsx (`quote-xlsx.ts`) 版型**不改**（僅補 fixture 型別）。xlsx 不顯示賣方聯絡人（已知不對稱）。
- 不改報價單資料模型、totals 計算、auth/routing。
- 不退役 `/q/[id]/asset.ts`（後續再議）。
- 不做新功能（折扣、多幣別、PDF 分頁等）。

## Further Notes

- 全文設計、CSS 目標、file-by-file、風險、兩輪交叉審查（Codex + 獨立 reviewer）決策見 `…-design.md` §1–§13。
- Design C mockup 參考檔：`~/Downloads/報價單設計C_精緻金棕.pdf`；產生器 `private/tools/quote-pdf-bespoke.py`（gitignored）。
- **Deploy = prod quote24.cc（HITL）**：Slice 5 動 prod D1 + 部署，須使用者確認；commit=deploy 手動。
- 風險：Cloudflare Access 是否 front `/api/company/brand/*`（無法從原始碼證，部署 smoke 驗）；nullable `contact` 設後不可清空（同 address/phone）。
- `pnpm test` 不含 `packages/**`（`vitest.config.ts:25`）→ MCP 型別靠 `pnpm --dir packages/mcp build` 把關。

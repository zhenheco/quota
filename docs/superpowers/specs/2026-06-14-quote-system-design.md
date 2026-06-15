# 報價單系統 (Quota) — 設計規格

- 日期：2026-06-14
- 廠商：範例公司有限公司
- 狀態：設計定案，待實作

## 1. 目標

把範例公司有限公司現有「手工 Excel 報價單」升級為一套部署在 Cloudflare 的報價單系統：

1. 網頁表單填客戶 + 品項 → 即時預覽（專業簡約現代風）→ 產出排版精美的 `.xlsx`。
2. 資料存 Cloudflare D1（報價、客戶、公司資料），檔案存 R2。
3. **對話產報價**：使用者在 Claude Code 對話講「生一張給範例客戶，網路行銷一年 48000」，Claude 呼叫 API 建單並回傳檢視/下載連結。

來源參考：`examples/demo-reference/20260519_範例客戶_行銷_報價單.xlsx`。品牌素材已抽出至 `examples/demo-brand/`。

## 2. 品牌系統

| 元素 | 值 |
|---|---|
| 主色（金） | `#B97E19` |
| 文字（灰） | `#5D5B5A` |
| 印章（藍） | `#004A85`（PNG 已含透明背景，可直接疊） |
| 字體 | Noto Sans TC / Microsoft JhengHei；標題可搭 Arial |
| 風格 | 專業簡約現代：白底、大留白、金色細線當分隔/表頭/總計強調，A4 比例 |
| 素材 | `examples/demo-brand/logo.png`(範例公司 logo)、`stamp.png`(報價專用章)、`bank.jpg`(範例銀行存摺) → 部署時種入 R2 `brand/` |

固定品牌元素（全部保留）：範例公司 logo、金色主色、報價專用章、範例銀行匯款資訊、5% 稅率、預設備註範本。

## 3. 架構

- **前端/SSR**：Astro + Cloudflare adapter（Workers runtime）。
- **資料**：Cloudflare D1（SQLite）。
- **檔案/素材**：Cloudflare R2。
- **Excel 產生**：**伺服器端**（Worker）統一產生，理由見 §7。Web 表單與對話兩條建單路徑共用同一 `generateQuoteXlsx()`。
- **認證**：Cloudflare Access（Zero Trust）罩人類 UI；機器 API 用 service token / bearer secret。
- **部署**：`wrangler`，`wrangler.toml` 綁 D1 + R2，migrations 建表。

## 4. 資料模型（D1）

### `company_profile`（單列，可由 /settings 編輯）
`id`(固定1) · `name` · `address` · `phone` · `bank_info`(範例銀行 808 中原分行 帳號…) · `default_tax_rate`(0.05) · `default_notes`(備註範本) · `logo_key` · `stamp_key` · `bank_image_key`

### `clients`
`id` · `name` · `contact` · `phone` · `email`(nullable) · `address`(nullable) · `created_at` · `updated_at`

### `quotes`
`id` · `quote_no`(YYYYMMDD-NN，當日序號) · `client_id`(fk nullable) · **客戶快照** `client_name`/`client_contact`/`client_phone` · `subject`(標題，如「行銷」) · `quote_date` · `valid_until`(nullable) · `tax_rate` · `subtotal` · `tax_amount` · `total`(三者皆快照) · `notes` · `status`(draft/sent/accepted/void) · `xlsx_key`(nullable) · `pdf_key`(nullable) · `created_via`(web/chat) · `created_at` · `updated_at`

> 客戶資訊**快照**進 quote — 歷史報價不因客戶改資料而變動。

### `quote_items`
`id` · `quote_id`(fk) · `sort_order` · `name`(品項) · `description`(細節描述，多行) · `qty` · `unit`(單位) · `unit_price` · `amount`(= round(qty×unit_price))

### 計算規則
`subtotal = Σ amount`；`tax_amount = Math.round(subtotal × tax_rate)`；`total = subtotal + tax_amount`。
（驗證來源：48000 → 5% → 2400 → 50400。）

## 5. R2 結構

- 品牌素材：`brand/logo.png`、`brand/stamp.png`、`brand/bank.jpg`
- 報價範本（fallback 用）：`templates/quote-base.xlsx`
- 產出檔：`quotes/{quote_no}/{quote_no}.xlsx`（及之後 `.pdf`）

## 6. 頁面（Astro SSR）

| 路徑 | 用途 |
|---|---|
| `/` | 報價清單：表格 + 搜尋/篩選（客戶/狀態/日期），新增/檢視/複製/改狀態 |
| `/new`、`/q/[id]/edit` | 編輯器：**左表單右即時預覽**。表單＝選/建客戶、標題、日期、有效期、品項列(可增刪、自動算金額)、稅率、備註；按鈕＝儲存、下載 Excel、列印/存 PDF |
| `/q/[id]` | 檢視（唯讀美化版 + 下載鈕 + 改狀態） |
| `/clients` | 客戶管理（CRUD） |
| `/settings` | 公司資料 / 匯款 / 品牌素材 / 預設備註 / 稅率 |

即時預覽與檢視頁共用同一 HTML/CSS 報價單元件；`@media print` + `@page A4` → Cmd+P 直接存乾淨 PDF。

## 7. Excel 產生（伺服器端，ExcelJS）

**決策**：因「對話產報價」無瀏覽器環境，`.xlsx` 必須能在無頭情況下產生 → 統一改為**伺服器端產生**，Web 與對話共用。

- 模組 `src/server/quote-xlsx.ts`：`generateQuoteXlsx(quote, items, company, brandAssets) → ArrayBuffer`。
- 用 **ExcelJS** `workbook.xlsx.writeBuffer()`（避開 fs/stream，只用 buffer），圖片以 R2 取得的 arraybuffer 嵌入。
- 版面：欄寬對齊原稿、合併抬頭、金色表頭填色 + 邊框、品項列（動態 N 列）、總計區（小計/稅率/稅金/總計）、備註、嵌 logo(上) + 報價章與範例銀行存摺(下)。數字格式 `#,##0`、日期格式化。
- 產生後寫入 R2 `quotes/{quote_no}/{quote_no}.xlsx`，更新 D1 `xlsx_key`。

**風險與 fallback**：ExcelJS 在 Workers runtime 有 Node 相容性風險。
- 緩解：開 `nodejs_compat`，只用 `writeBuffer()`（不碰 fs/stream/archiver）。
- Phase 0 spike 先驗證；若不可行 → **fallback：fflate 模板填充**（把原稿當範本存 R2，unzip → 改 sharedStrings/cell 值 + 重算 + 動態插列 → rezip），純 JS、零 Node 依賴、保證可跑、像素保真。
- 決策點寫入 Phase 0 驗收：spike 通過用 ExcelJS，否則切 fflate 模板。

## 8. API（Astro endpoints，綁 D1 + R2）

| Method/Path | 用途 | 認證 |
|---|---|---|
| `GET/POST /api/quotes` | 列表 / 建單（建後即產 xlsx 存 R2） | Access(UI) / token(機器) |
| `GET/PUT/DELETE /api/quotes/[id]` | 單筆讀/改/刪 | 同上 |
| `POST /api/quotes/[id]/regenerate` | 重產 xlsx | 同上 |
| `GET /api/quotes/[id]/xlsx` | 從 R2 串流下載 | 同上 |
| `GET/POST /api/clients`、`/api/clients/[id]` | 客戶 CRUD | 同上 |
| `GET/PUT /api/company` | 公司資料 | 同上 |
| `GET /api/brand/[asset]` | 供預覽 + 伺服器嵌圖 | Access |

`POST /api/quotes` 接受 JSON（client、items、subject、date、tax_rate、notes…），回 `{id, quote_no, view_url, xlsx_url}`。

## 9. 對話產報價（Claude-driven）

- 機制：`POST /api/quotes` 帶 `Authorization: Bearer <API_TOKEN>`（部署後存 env secret / 1Password，repo 不落明文）。
- 流程：使用者於對話描述 → Claude 解析成 JSON → curl 建單 → 回傳 `view_url` + `xlsx_url`。
- 缺漏欄位：Claude 用 `company_profile` 預設（稅率/備註）+ 既有 `clients` 比對客戶名；真有歧義才問。
- v1 範圍：documented API + Claude 用 Bash curl。**之後（v2）**可包成 MCP server 讓任何 session 當工具呼叫。

## 10. 報價單號 / 檔名

- 單號：`YYYYMMDD-NN`（當日序號，D1 交易內遞增）。
- 檔名：沿用現有慣例 `{日期}_{客戶}_{標題}_報價單.xlsx`。

## 11. 範圍（v1）vs 之後

**v1**：§3–§10 全部（含對話產報價 via API）。
**先砍（YAGNI）**：多幣別、多語、email 寄送、電子簽核、伺服器端 PDF（v1 用瀏覽器列印）、多公司租戶、MCP server（v2）。

## 12. 測試（TDD）

- 工具：vitest + `@cloudflare/vitest-pool-workers`（真 D1/R2 binding）。
- 先寫失敗測試：
  1. 計算：subtotal / tax_amount / total（含四捨五入，48000→2400→50400）。
  2. 單號生成：當日序號遞增、跨日歸零、併發不撞號。
  3. xlsx builder：產出後回讀關鍵格（抬頭、品項、總計、圖片數=3）驗證。
  4. API CRUD：建單→讀回→改→刪；對話路徑 token 驗證。
- 流程：red → green → refactor，每步 commit。

## 13. 實作階段（概要）

- **Phase 0**：scaffold（Astro + CF adapter + wrangler + D1/R2 binding + vitest）；ExcelJS-on-Workers spike（決定 §7 路線）。
- **Phase 1**：資料層（migrations + D1 schema + repository + 計算/單號單元測試）。
- **Phase 2**：xlsx builder（伺服器端，像素對齊原稿 + 嵌圖）。
- **Phase 3**：API endpoints（quotes/clients/company + 機器 token）。
- **Phase 4**：UI（清單 / 編輯器 + 即時預覽 / 檢視 / 客戶 / 設定）。
- **Phase 5**：對話產報價（curl 流程 + 文件）。
- **Phase 6**：部署（wrangler、Access、種子素材入 R2、冒煙測試）。

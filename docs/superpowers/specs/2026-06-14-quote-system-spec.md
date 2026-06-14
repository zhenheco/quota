# Quota 報價單系統 — SPEC

> 這份 spec 是 `/go` 的唯一輸入。設計細節另見 `2026-06-14-quote-system-design.md`。
> prd_id = `2026-06-14-quote-system`（由檔名 strip `-spec` 得出）。

---

## Problem Statement

振禾有限公司現在靠「複製一份舊 Excel 再手改」開報價單：每張都要手動換客戶、品項、日期、單價，手算小計與 5% 稅、再貼 logo / 報價章 / 玉山匯款圖。痛點：

- 金額/稅常算錯，報價單號靠記憶容易撞號或跳號。
- 找舊報價得翻檔案夾，客戶歷史散落。
- 想在跟 Claude 對話時「順手開一張」完全辦不到，得切到 Excel 從頭做。
- 振禾自己用之外，其他小公司有一模一樣的痛，但他們的品牌不是振禾，沒地方換成自己的。

## Solution

一套**各自自架在 Cloudflare 的單租戶**報價單系統。使用者能：

1. **網頁開單**：左填表（客戶/品項/稅率/備註）、右即時預覽（專業簡約現代風、A4），一鍵產出排版精美 `.xlsx`，或瀏覽器列印存 PDF。
2. **對話開單**：在任何 Claude session 裝上本專案的 **MCP server**，講「生一張給範例客戶，網路行銷一年 48000」→ Claude 呼叫 `create_quote` 工具自動建單，回傳檢視/下載連結。缺漏欄位用公司預設 + 既有客戶比對自動補。
3. **資料自有**：報價、客戶、公司品牌全存使用者自己的 CF D1（資料）/ R2（檔案與素材）。
4. **開源可換品牌**：別人 clone → 部署自己的 CF → 在 `/settings`（或 `seed-brand` CLI）填自己的公司資訊、上傳自己的 logo / 印章 / 匯款圖 → 零振禾殘留。出廠預設全空白，首次進站顯示 setup 引導。

## User Stories

1. As 振禾業務, I want 在網頁清單看到所有報價（可搜尋客戶/狀態/日期）, so that 不用翻檔案夾找舊單。
2. As 振禾業務, I want 在 `/new` 左表單填客戶+品項、右邊即時看到排版預覽, so that 開單前就確認版面對。
3. As 振禾業務, I want 品項列可增刪、輸入數量×單價自動算 amount, so that 不用手算每列。
4. As 振禾業務, I want 系統自動算 subtotal、5% 稅金、total（四捨五入）, so that 不會算錯（48000 → 稅 2400 → 總 50400）。
5. As 振禾業務, I want 一鍵下載排版精美的 `.xlsx`（含 logo、報價章、玉山匯款圖）, so that 直接寄給客戶。
6. As 振禾業務, I want 用瀏覽器列印 (Cmd+P) 存成乾淨 A4 PDF, so that 不需另裝工具就有 PDF。
7. As 振禾業務, I want 複製一張舊報價當新單起點, so that 類似報價秒開。
8. As 振禾業務, I want 改報價狀態（draft/sent/accepted/void）, so that 追蹤每張進度。
9. As 振禾業務, I want 報價單號自動 `YYYYMMDD-NN`（當日序號遞增、跨日歸零、併發不撞號）, so that 編號永遠唯一且有序。
10. As 振禾業務, I want 客戶資訊在建單當下快照進報價, so that 之後改客戶資料不會回頭竄改歷史報價。
11. As 振禾業務, I want 管理客戶（新增/編輯/刪除、選既有客戶帶入）, so that 不重複輸入常用客戶。
12. As 振禾老闆, I want 在 `/settings` 設定公司名/地址/電話/匯款資訊/預設稅率/預設備註範本, so that 全站套用統一資訊。
13. As Claude 使用者, I want 在對話描述報價 → Claude 透過 MCP `create_quote` 建單並回我 view_url + xlsx_url, so that 不離開對話就開好單。
14. As Claude 使用者, I want MCP 提供 `list_quotes`/`get_quote`/`list_clients`, so that 對話裡查得到既有資料。
15. As Claude 使用者, I want 我講的客戶名能比對既有 clients、缺的欄位用公司預設補, so that 只在真有歧義時才被反問。
16. As 開源自架者, I want clone 後出廠預設品牌全空白、無振禾資料, so that 不會誤把振禾資訊寄出去。
17. As 開源自架者, I want 首次進站偵測未設定 → 顯示 setup 引導, so that 知道要先填公司+上傳素材。
18. As 開源自架者, I want `seed-brand` CLI（傳 logo/stamp/bank 圖檔路徑）一次推 R2 + 寫 key, so that 不想手點 web 也能初始化品牌。
19. As 開源自架者, I want README 說明 clone → 自己的 CF account → wrangler deploy → setup 全流程, so that 照著做就能上線。
20. As 自架者, I want 人類 UI 走 Cloudflare Access、機器 API 走 bearer token, so that 報價資料不被外人讀寫。
21. As 系統, I want 建單後伺服器端產 xlsx 寫入 R2 並更新 D1 `xlsx_key`, so that web 與對話兩條路徑共用同一份產出。
22. As 系統, I want xlsx 產生失敗時回明確錯誤而非默默壞掉, so that 使用者知道要重試或回報。

## Modules

| Module | 職責（一句） | 公開介面（窄） | 新建/修改 |
|---|---|---|---|
| `migrations/` (D1) | 建 4 張表 schema | SQL migration files | 新建 |
| `src/server/db.ts` | D1 repository：報價/客戶/公司 CRUD | `quotesRepo`, `clientsRepo`, `companyRepo` | 新建 |
| `src/server/calc.ts` | 金額/稅/總計計算（純函式） | `computeTotals(items, taxRate) -> {subtotal, taxAmount, total}` | 新建 |
| `src/server/quote-no.ts` | 報價單號生成（D1 交易內遞增） | `nextQuoteNo(db, date) -> "YYYYMMDD-NN"` | 新建 |
| `src/server/quote-xlsx.ts` | 伺服器端產報價 xlsx（嵌圖） | `generateQuoteXlsx(quote, items, company, brand) -> ArrayBuffer` | 新建 |
| `src/server/brand.ts` | R2 品牌素材存取（get/put、key 管理） | `getBrandAsset(key)`, `putBrandAsset(key, buf)` | 新建 |
| `src/pages/api/*` | Astro endpoints：quotes/clients/company/brand | REST per §API contract | 新建 |
| `src/server/auth.ts` | bearer token 驗證（機器 API） | `requireToken(request)` | 新建 |
| `src/pages/*` + components | Astro SSR 頁面 + 報價單共用元件 | `/`, `/new`, `/q/[id]`, `/q/[id]/edit`, `/clients`, `/settings` | 新建 |
| `packages/mcp/` | MCP server：薄 HTTP client 打本系統 API | tools: `create_quote`/`list_quotes`/`get_quote`/`list_clients` | 新建 |
| `scripts/seed-brand` | CLI 把 logo/stamp/bank 推 R2 + 寫 company key | `seed-brand --logo --stamp --bank` | 新建 |

## Implementation Decisions

- **Schema (D1, 單租戶無 tenant_id)**：
  - `company_profile`（單列 id=1）：`name, address, phone, bank_info, default_tax_rate(0.05), default_notes, logo_key, stamp_key, bank_image_key`。出廠**全空白**。
  - `clients`：`id, name, contact, phone, email?, address?, created_at, updated_at`。
  - `quotes`：`id, quote_no, client_id?, client_name/client_contact/client_phone（快照）, subject, quote_date, valid_until?, tax_rate, subtotal, tax_amount, total（快照）, notes, status(draft/sent/accepted/void), xlsx_key?, pdf_key?, created_via(web/chat), created_at, updated_at`。
  - `quote_items`：`id, quote_id(fk), sort_order, name, description, qty, unit, unit_price, amount`。
- **計算**：`subtotal = Σ amount`；`amount = round(qty × unit_price)`；`tax_amount = Math.round(subtotal × tax_rate)`；`total = subtotal + tax_amount`。
- **API contract**（Astro endpoints，綁 D1+R2）：
  - `GET/POST /api/quotes`（POST 建後即產 xlsx 存 R2，回 `{id, quote_no, view_url, xlsx_url}`）
  - `GET/PUT/DELETE /api/quotes/[id]`、`POST /api/quotes/[id]/regenerate`、`GET /api/quotes/[id]/xlsx`（R2 串流）
  - `GET/POST /api/clients`、`GET/PUT/DELETE /api/clients/[id]`
  - `GET/PUT /api/company`
  - `GET /api/brand/[asset]`
  - 認證：UI 路徑走 Cloudflare Access；機器路徑帶 `Authorization: Bearer <token>`。
- **架構決策**：
  - **單租戶自架**（vs 多租戶 SaaS）：每人部署自己一份 CF，故 `company_profile` 單列、無 tenant_id、無帳號系統。理由 = 開源最小複雜度、YAGNI。
  - **xlsx 伺服器端產生**（vs 瀏覽器端）：對話/MCP 路徑無瀏覽器，必須無頭可產 → web 與 MCP 共用同一 `generateQuoteXlsx()`。
  - **MCP server = HTTP API 薄 client**（vs 直連 D1/R2）：直連要 CF 憑證+wrangler、耦合 CF 內部，故 MCP 只透過 `QUOTA_API_URL`+`QUOTA_API_TOKEN` 打 API。API 是唯一真實來源。
- **第三方/整合**：ExcelJS（產 xlsx，只用 `workbook.xlsx.writeBuffer()`，避開 fs/stream）；`@modelcontextprotocol/sdk`（MCP server）。無金流/email。
- **安全/權限**：機器 API bearer token 存 env secret / 1Password，repo 不落明文（`printf "%s"` 非 echo）；輸入驗證（品項數值、稅率範圍、必填）；UI 由 Cloudflare Access 罩；`seed-brand` 只接本地檔案路徑。
- **邊界/效能**：報價單號在 D1 交易內遞增防併發撞號、跨日歸零；金額一律 `Math.round`；ExcelJS-on-Workers 開 `nodejs_compat`，Phase 0 spike 驗證不可行則切 fflate 模板填充 fallback（純 JS、零 Node 依賴、像素保真）。

## Testing Decisions

工具：`vitest` + `@cloudflare/vitest-pool-workers`（真 D1/R2 binding）。Greenfield 專案，**無既有 prior art**，每模組為首次建立測試基準。

| Module | 要測? | 測什麼外部行為 | Prior art |
|---|---|---|---|
| `src/server/calc.ts` | ✅ | subtotal/tax/total 含四捨五入；48000→2400→50400 | 無（greenfield，首測） |
| `src/server/quote-no.ts` | ✅ | 當日序號遞增、跨日歸零、併發不撞號 | 無 |
| `src/server/quote-xlsx.ts` | ✅ | 產出後回讀關鍵格：抬頭/品項/總計正確、嵌圖數=3 | 無 |
| `src/pages/api/quotes` | ✅ | 建單→讀回→改→刪；建後 R2 有 xlsx 且回 view_url/xlsx_url | 無 |
| `src/server/auth.ts` | ✅ | 無/錯 token 被拒、正確 token 通過 | 無 |
| `packages/mcp` | ✅ | `create_quote` 解析→打 API→回連結；缺欄位用預設、客戶名比對 | 無 |

## Vertical Slices

Tracer-bullet 垂直切片，多薄片 > 少厚片。Slice 0 含 ExcelJS spike（技術風險決策點）標 HITL，其餘 AFK。

### Slice 0 — Scaffold + ExcelJS-on-Workers spike
- **Type**: HITL
- **Blocked by**: None
- **User stories**: （地基）
- **Acceptance criteria**:
  - [ ] Astro + Cloudflare adapter 專案可 `dev` 起得來；`wrangler.toml` 綁 D1 + R2（dev binding）。
  - [ ] vitest + `@cloudflare/vitest-pool-workers` 跑得起一個 trivial 通過測試。
  - [ ] spike：在 Workers runtime 用 ExcelJS `writeBuffer()` 產出最小 xlsx + 嵌一張圖成功 → 決定走 ExcelJS；失敗 → 切 fflate 模板 fallback（決策寫入本 slice 結論）。

### Slice 1 — 資料層 + 計算 + 單號
- **Type**: AFK
- **Blocked by**: Slice 0
- **User stories**: #4, #9, #10
- **Acceptance criteria**:
  - [ ] D1 migrations 建 4 表；repository CRUD 可寫讀。
  - [ ] `computeTotals` 單元測試過（48000→2400→50400 + 多列）。
  - [ ] `nextQuoteNo` 單元測試過：當日遞增、跨日歸零、併發不撞號。

### Slice 2 — xlsx builder（伺服器端，像素對齊原稿 + 嵌圖）
- **Type**: AFK
- **Blocked by**: Slice 1
- **User stories**: #5, #21, #22
- **Acceptance criteria**:
  - [ ] `generateQuoteXlsx` 產出 ArrayBuffer，回讀關鍵格正確、嵌圖數=3。
  - [ ] 版面：金色表頭/邊框、動態品項列、總計區、備註、logo+章+匯款圖、數字 `#,##0`。
  - [ ] 失敗路徑回明確錯誤。

### Slice 3 — Quotes API + 機器 token
- **Type**: AFK
- **Blocked by**: Slice 2
- **User stories**: #5, #20, #21
- **Acceptance criteria**:
  - [ ] `GET/POST/PUT/DELETE /api/quotes[/id]`、`regenerate`、`xlsx` 串流可用。
  - [ ] POST 建單後產 xlsx 入 R2、更新 `xlsx_key`、回 `{id, quote_no, view_url, xlsx_url}`。
  - [ ] 無/錯 token 被拒（測試覆蓋）。

### Slice 4 — Clients + Company API
- **Type**: AFK
- **Blocked by**: Slice 1
- **User stories**: #11, #12
- **Acceptance criteria**:
  - [ ] `GET/POST/PUT/DELETE /api/clients[/id]` CRUD 過測試。
  - [ ] `GET/PUT /api/company` 讀寫公司資料 + 預設稅率/備註。

### Slice 5 — Web UI（清單/編輯器+即時預覽/檢視/客戶/設定）
- **Type**: AFK
- **Blocked by**: Slice 3, Slice 4
- **User stories**: #1, #2, #3, #6, #7, #8, #11, #12
- **Acceptance criteria**:
  - [ ] `/` 清單可搜尋/篩選、新增/檢視/複製/改狀態。
  - [ ] `/new`、`/q/[id]/edit` 左表單右即時預覽，品項列增刪自動算金額，可儲存/下載 xlsx。
  - [ ] `/q/[id]` 唯讀美化版 + 下載 + 改狀態；`@media print`+`@page A4` 可 Cmd+P 存乾淨 PDF。
  - [ ] `/clients` CRUD、`/settings` 公司/匯款/品牌/備註/稅率。

### Slice 6 — MCP server（create/list/get quotes + clients）
- **Type**: AFK
- **Blocked by**: Slice 3, Slice 4
- **User stories**: #13, #14, #15
- **Acceptance criteria**:
  - [ ] `packages/mcp` 用 `QUOTA_API_URL`+`QUOTA_API_TOKEN` 打 API。
  - [ ] tools `create_quote`/`list_quotes`/`get_quote`/`list_clients` 可被 Claude 呼叫。
  - [ ] `create_quote` 缺欄位用 company 預設、客戶名比對既有 clients，回 view_url+xlsx_url。
  - [ ] 安裝法文件化：`claude mcp add quota -- npx -y quota-mcp`。

### Slice 7 — 去振禾化 + 品牌 setup + seed-brand CLI
- **Type**: AFK
- **Blocked by**: Slice 4, Slice 5
- **User stories**: #16, #17, #18, #19
- **Acceptance criteria**:
  - [ ] 出廠 `company_profile` 全空白，無振禾硬編值；振禾 `examples/demo-brand/*` + `examples/demo-reference/*.xlsx` 標 demo。
  - [ ] 首次未設定 → `/settings` 顯示 setup 引導。
  - [ ] `seed-brand --logo --stamp --bank` 推 R2 + 寫 company key。
  - [ ] README 開源 onboarding 全流程（clone → 自己 CF → deploy → setup）。

### Slice 8 — 部署（wrangler + Access + 種子 + 冒煙）
- **Type**: HITL
- **Blocked by**: Slice 5, Slice 6, Slice 7
- **User stories**: #19, #20
- **Acceptance criteria**:
  - [ ] `wrangler deploy` 上線，D1 migrations 套用、R2 綁定。
  - [ ] Cloudflare Access 罩 UI；機器 token 存 env secret。
  - [ ] 振禾品牌素材種入自己的 R2（透過 seed-brand）。
  - [ ] 冒煙：web 開一張單 + MCP 開一張單皆成功下載 xlsx。

## Out of Scope

- 多租戶 SaaS（帳號系統、tenant_id、計費）— 採單租戶自架。
- 多幣別、多語系。
- Email 寄送報價、電子簽核。
- 伺服器端 PDF 產生（v1 用瀏覽器列印）。
- 多公司租戶於同一部署。
- 把 MCP 發佈到公開 npm registry（先 monorepo 內本地用 `npx -y` 指向本地/私有）。

## Further Notes

- **最大技術風險 = ExcelJS on Workers runtime**（Node 相容性）。緩解：`nodejs_compat` + 只用 `writeBuffer()`；Slice 0 spike 為硬決策點，不通過即切 fflate 模板填充 fallback。
- `examples/demo-reference/20260519_範例客戶_行銷_報價單.xlsx`（1.4M，振禾原稿）保留為 demo 參考，評估 gitignore/LFS。
- 品牌色：金 `#B97E19`、灰 `#5D5B5A`、藍印章 `#004A85`；字體 Noto Sans TC / Microsoft JhengHei；A4、大留白、金線分隔。
- Cloudflare Access 設定需手動於 CF dashboard 完成（Slice 8 文件化）。
- Secrets 走 1Password / env，repo/log/PR 禁明文（`printf "%s"` 非 echo）。
- Git commit 身份 `zhenheco <ace@zhenhe-co.com>`。

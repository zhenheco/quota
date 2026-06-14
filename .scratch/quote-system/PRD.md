Status: ready-for-agent

# PRD: Quota 報價單系統

> 來源 spec：`docs/superpowers/specs/2026-06-14-quote-system-spec.md`（SSOT）。
> 本 PRD 由 /go Phase 1 (to-prd) 從 spec 合成，不另訪談。

## Problem Statement

振禾有限公司現在靠「複製一份舊 Excel 再手改」開報價單：每張都要手動換客戶、品項、日期、單價，手算小計與 5% 稅、再貼 logo / 報價章 / 玉山匯款圖。痛點：金額/稅常算錯、報價單號靠記憶易撞號或跳號、找舊報價得翻檔案夾、想在跟 Claude 對話時順手開一張完全辦不到。振禾自己用之外，其他小公司有一模一樣的痛，但他們的品牌不是振禾，沒地方換成自己的。

## Solution

一套**各自自架在 Cloudflare 的單租戶**報價單系統：

1. **網頁開單**：左填表、右即時預覽（專業簡約現代風、A4），一鍵產出排版精美 `.xlsx`，或瀏覽器列印存 PDF。
2. **對話開單**：任何 Claude session 裝上本專案 **MCP server**，講「生一張給範例客戶，網路行銷一年 48000」→ Claude 呼叫 `create_quote` 工具自動建單回傳連結。
3. **資料自有**：報價/客戶/公司品牌存使用者自己的 CF D1/R2。
4. **開源可換品牌**：別人 clone → 部署自己的 CF → `/settings` 或 `seed-brand` CLI 填自己品牌，零振禾殘留，出廠全空白 + 首次 setup 引導。

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
12. As 振禾老闆, I want 在 `/settings` 設定公司名/地址/電話/匯款/預設稅率/預設備註, so that 全站套用統一資訊。
13. As Claude 使用者, I want 對話描述報價 → MCP `create_quote` 建單回我 view_url + xlsx_url, so that 不離開對話就開好單。
14. As Claude 使用者, I want MCP 提供 `list_quotes`/`get_quote`/`list_clients`, so that 對話裡查得到既有資料。
15. As Claude 使用者, I want 客戶名比對既有 clients、缺欄位用公司預設補, so that 只在真有歧義才被反問。
16. As 開源自架者, I want clone 後出廠品牌全空白、無振禾資料, so that 不會誤把振禾資訊寄出去。
17. As 開源自架者, I want 首次進站偵測未設定 → 顯示 setup 引導, so that 知道要先填公司+上傳素材。
18. As 開源自架者, I want `seed-brand` CLI 一次推 logo/stamp/bank 到 R2 + 寫 key, so that 不想手點 web 也能初始化。
19. As 開源自架者, I want README 說明 clone → 自己 CF → wrangler deploy → setup 全流程, so that 照著做就能上線。
20. As 自架者, I want 人類 UI 走 Cloudflare Access、機器 API 走 bearer token, so that 報價資料不被外人讀寫。
21. As 系統, I want 建單後伺服器端產 xlsx 寫入 R2 並更新 `xlsx_key`, so that web 與對話兩路徑共用同一份產出。
22. As 系統, I want xlsx 產生失敗回明確錯誤, so that 使用者知道要重試或回報。

## Modules

| Module | 職責 | 公開介面 | 新建/修改 |
|---|---|---|---|
| `migrations/` (D1) | 4 張表 schema | SQL migrations | 新建 |
| `src/server/db.ts` | D1 repository CRUD | `quotesRepo`/`clientsRepo`/`companyRepo` | 新建 |
| `src/server/calc.ts` | 金額/稅/總計（純函式，deep module） | `computeTotals(items, taxRate)` | 新建 |
| `src/server/quote-no.ts` | 報價單號生成（交易內遞增） | `nextQuoteNo(db, date)` | 新建 |
| `src/server/quote-xlsx.ts` | 伺服器端產 xlsx（嵌圖，deep module） | `generateQuoteXlsx(quote, items, company, brand)` | 新建 |
| `src/server/brand.ts` | R2 品牌素材存取 | `getBrandAsset`/`putBrandAsset` | 新建 |
| `src/server/auth.ts` | bearer token 驗證 | `requireToken(request)` | 新建 |
| `src/pages/api/*` | Astro endpoints | REST（見 Implementation Decisions） | 新建 |
| `src/pages/*` + components | Astro SSR 頁面 + 報價單共用元件 | `/`,`/new`,`/q/[id]`,`/q/[id]/edit`,`/clients`,`/settings` | 新建 |
| `packages/mcp/` | MCP server（薄 HTTP client） | tools `create_quote`/`list_quotes`/`get_quote`/`list_clients` | 新建 |
| `scripts/seed-brand` | CLI 推素材到 R2 + 寫 key | `seed-brand --logo --stamp --bank` | 新建 |

深模組重點：`calc.ts`（厚計算、窄介面、極少變）、`quote-xlsx.ts`（厚排版邏輯、窄介面）、`quote-no.ts`（併發正確性封裝）。測試聚焦這三個 + API + auth + MCP。

## Implementation Decisions

- **Schema（D1，單租戶無 tenant_id）**：`company_profile`（單列 id=1，出廠全空白）、`clients`、`quotes`（客戶+金額快照、status、xlsx_key、created_via）、`quote_items`。
- **計算**：`amount=round(qty×unit_price)`；`subtotal=Σamount`；`tax_amount=Math.round(subtotal×tax_rate)`；`total=subtotal+tax_amount`。
- **API contract**：`GET/POST /api/quotes`（POST 建後產 xlsx 入 R2，回 `{id,quote_no,view_url,xlsx_url}`）、`GET/PUT/DELETE /api/quotes/[id]`、`POST /api/quotes/[id]/regenerate`、`GET /api/quotes/[id]/xlsx`、`GET/POST /api/clients`+`/[id]`、`GET/PUT /api/company`、`GET /api/brand/[asset]`。UI 走 Cloudflare Access；機器走 `Authorization: Bearer <token>`。
- **架構決策**：單租戶自架（無 tenant_id/帳號，YAGNI）；xlsx 伺服器端產（對話路徑無瀏覽器，web/MCP 共用 `generateQuoteXlsx()`）；MCP = HTTP API 薄 client（不直連 D1/R2，避免耦合 CF 內部，API 為唯一真實來源）。
- **第三方/整合**：ExcelJS（只用 `writeBuffer()`，避開 fs/stream）；`@modelcontextprotocol/sdk`。無金流/email。
- **安全/權限**：機器 API bearer token 走 env secret / 1Password，repo 不落明文；輸入驗證（數值/稅率/必填）；UI 由 CF Access 罩；`seed-brand` 只接本地檔案路徑。
- **邊界/效能**：單號 D1 交易內遞增防併發撞號、跨日歸零；金額一律 `Math.round`；ExcelJS-on-Workers 開 `nodejs_compat`，Slice 0 spike 不通過則切 fflate 模板填充 fallback。

## Testing Decisions

好測試只測外部可觀察行為，不測實作細節。工具 `vitest` + `@cloudflare/vitest-pool-workers`（真 D1/R2 binding）。Greenfield 無 prior art，每模組首測。

- `calc.ts`：subtotal/tax/total 含四捨五入（48000→2400→50400 + 多列）。
- `quote-no.ts`：當日遞增、跨日歸零、併發不撞號。
- `quote-xlsx.ts`：產出後回讀關鍵格正確、嵌圖數=3。
- `api/quotes`：建→讀→改→刪；建後 R2 有 xlsx 且回 view_url/xlsx_url；無/錯 token 被拒。
- `packages/mcp`：`create_quote` 解析→打 API→回連結；缺欄位用預設、客戶名比對。

## Out of Scope

多租戶 SaaS（帳號/tenant_id/計費）、多幣別、多語系、email 寄送、電子簽核、伺服器端 PDF（v1 用瀏覽器列印）、同部署多公司、把 MCP 發佈到公開 npm registry。

## Further Notes

- **最大技術風險 = ExcelJS on Workers**（Node 相容性）。Slice 0 spike 為硬決策點，不通過即切 fflate 模板填充 fallback。
- `reference/20260519_範例客戶_行銷_報價單.xlsx`（1.4M 振禾原稿）目前在 git → Slice 7 移到 `examples/`，評估 gitignore/LFS。
- 品牌色：金 `#B97E19`、灰 `#5D5B5A`、藍印章 `#004A85`；Noto Sans TC / Microsoft JhengHei；A4 大留白金線。
- Cloudflare Access 需手動於 CF dashboard 設定（Slice 8 文件化）。
- Secrets 走 1Password / env，repo/log/PR 禁明文。Git commit 身份 `zhenheco <ace@zhenhe-co.com>`。

Status: ready-for-agent
Type: AFK

# 05 — Clients + Company API

## Parent

`.scratch/quote-system/PRD.md`

## What to build

客戶與公司資料的 Astro endpoints。`GET/POST /api/clients`、`GET/PUT/DELETE /api/clients/[id]` 客戶 CRUD。`GET/PUT /api/company` 讀寫單列公司資料（名/地址/電話/匯款/預設稅率/預設備註/品牌 key）。同樣套用 `requireToken` 機器驗證。出廠 `company_profile` 全空白。

## Acceptance criteria

- [ ] `clients` CRUD 全過測試（真 D1）。
- [ ] `GET/PUT /api/company` 讀寫公司資料含預設稅率(0.05)/備註。
- [ ] 機器路徑 token 驗證一致。
- [ ] 客戶查詢可供建單時比對既有客戶名。

## Blocked by

- `.scratch/quote-system/issues/02-data-layer-calc-quote-no.md`

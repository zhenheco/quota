# Canonical Quote Template (Design C) + Seller Contact — Design Spec

**Date:** 2026-06-15
**Status:** Approved direction (Design C), pending implementation-plan
**Author:** Claude (Opus) for 範例公司有限公司 / Quota

---

## 1. Goal

Make the **Design C「報 價 單」editorial template** the *single canonical* quote document used everywhere the website generates a quote — on-screen view (`/q/[id]`), editor live preview, and the downloadable PDF — replacing the current divergent "QUOTATION" template. Add a **seller contact (賣方聯絡人)** field to the company profile so the seller block can show 名稱／統編／地址／**聯絡人**／電話.

**Why now:** The system currently ships *three* differing document looks (PDF `quote-pdf-html.ts`, on-screen `QuoteDocument.astro` + `global.css`, xlsx `quote-xlsx.ts`). The user wants one permanent, professional format. WYSIWYG: what you see on the site === what downloads as PDF.

## 2. Scope

**In scope**
- Replace the document template with Design C, unified across **PDF + on-screen `/q/[id]` + editor live preview**.
- Eliminate the PDF↔on-screen divergence by extracting **one markup builder + one CSS source** consumed by both.
- Add `company.contact` full-chain (D1 → types → repo → validation → form parse → settings UI → MCP mirror → view model → template).
- Fix editor live-preview brand-image loading for **new (unsaved) quotes**.

**Out of scope**
- **xlsx (`quote-xlsx.ts`) stays unchanged** (user decision). Documented asymmetry: xlsx keeps its current header and will *not* show the new seller 聯絡人. Revisit later if desired.
- No change to quote data model, totals math (`computeTotals`), auth, or routing.

## 3. Visual target (Design C)

Reference renders already approved: `~/Downloads/報價單設計C_精緻金棕.pdf`; generator preserved at `private/tools/quote-pdf-bespoke.py` and `/tmp/quota-backup/mockups.py` (variant C). Design language:

- Centered **serif「報 價 單」** title (Noto Serif TC 900, letter-spacing) + small `QUOTATION` eyebrow, centered logo above, gold underline accent.
- Warm palette: `--gold:#A6791A`, ink `#2f2b27`, muted `#8c857b`, hairlines `#E7DEC9`.
- Header bar: left **客戶 / 統一編號 / 聯絡人**; right **報價單號 / 報價日期** + seller block (範例公司 名稱 / 統編 / 地址 / **聯絡人** / 電話).
- Gold-underlined centered **計畫名稱**.
- Items table: gold top-rule header, columns **品項 / 內容 ｜ 數量 ｜ 單位 ｜ 單價 ｜ 金額** (no 項次 column in Design C — the numbered sub-points carry their own numbering); bold serif item name + numbered sub-points beneath.
- Totals (right, dashed rows): 未稅小計 / 營業稅 N% / **總計（含稅）** in gold serif. Tax rows shown only when `tax_rate > 0`.
- Notes box (warm tint) + 專案負責人 line.
- Footer: 匯款資訊 (範例銀行 + 戶名) left; **報價專用章 stamp + 範例銀行存摺 image** right.

**Refinement vs mockup:** render the 9 sub-points as a **single-column** numbered list (the 2-column mockup wrapped awkwardly, e.g.「紀錄格／式」). One line item with 9 points fits A4 single-column cleanly.

## 4. Architecture — one template, three consumers

### 4.1 Single canonical markup builder (browser-safe shared module)
**[Cross-review RED #4]** Extract a **pure, browser-safe** module (NOT server-only) so the client editor can import the exact same row renderer — otherwise the "one template" guarantee breaks the moment a user edits items (the client `renderItems()` would hand-rebuild Design C rows):

```
// src/shared/quote-document-template.ts  (no Node/Workers-only deps; pure)
export const QUOTE_DOCUMENT_CSS: string;
export function renderQuoteItemRows(items: QuoteDocumentItemView[]): string;  // <tr>…</tr> for the items <tbody>
export function renderQuoteDocumentBody(
  view: QuoteDocumentView,
  brand: { logo: string | null; stamp: string | null; bank: string | null }, // opaque src strings
): string;   // <article class="quote-sheet"> … </article>, Design C markup (calls renderQuoteItemRows)
```

- Emits Design C markup with **`data-preview="…"` attributes** on every dynamic node (quoteNo, subject, clientName, clientContact, clientTaxId, companyName, companyContact, …, item rows, totals). Inert in the PDF; the hooks the editor's client JS mutates.
- `brand.*` are *opaque src strings*: data-URIs for PDF, URLs for screen. The renderer never touches R2 — the **asset-src strategy lives OUTSIDE** the renderer (caller passes resolved strings).
- **`set:html` bypasses Astro's auto-escaping** → the builder MUST `escapeHtml()` every text value **and every attribute value** (incl. `data-preview` interpolations) itself. Shared `escapeHtml` moves into this module; `quote-editor.ts` and `quote-pdf-html.ts` import it (drop their private copies).

### 4.2 Single canonical CSS source
```
// src/server/quote-document-css.ts
export const QUOTE_DOCUMENT_CSS = `…Design C CSS…`;  // plain string (Workers-safe; no FS read)
```
Consumed by **both**:
- **PDF** (`buildQuoteHtml`): inline into `<style>` inside the full `<html>` wrapper.
- **On-screen** (`QuoteDocument.astro`): `<style is:global set:html={QUOTE_DOCUMENT_CSS} />` (or scoped). Plus `@media print` already in `global.css` keeps browser-print parity.

This kills the divergence: the *same* markup string + *same* CSS string render in all paths.

### 4.3 Three consumers

| Consumer | Markup | Brand `src` | Notes |
|---|---|---|---|
| **PDF** `buildQuoteHtml` (`quote-pdf-html.ts`) | `renderQuoteDocumentBody(view, dataUris)` wrapped in `<!doctype html>` + fonts + `<style>${QUOTE_DOCUMENT_CSS}` | base64 data-URIs (server, R2) | contract `buildQuoteHtml(quote, company, brand)` unchanged; only internals swap. |
| **On-screen** `/q/[id]` via `QuoteDocument.astro` | `<div set:html={renderQuoteDocumentBody(view, urls)} />` + canonical CSS | **company-level URLs** `/api/company/brand/{logo\|stamp\|bank}` | server-rendered; identical body to PDF. |
| **Editor live preview** (same `QuoteDocument.astro` inside `QuoteEditor.astro`) | same as on-screen (server-rendered shell) | same company brand URLs | client `quote-editor.ts` mutates `data-preview` nodes; for item add/remove it **imports `renderQuoteItemRows`** from the shared module (§4.1) instead of hand-building rows — keeps row markup identical to PDF. |

### 4.4 Brand-image fix (editor, new quotes) — **[Cross-review RED #1 & #2]**
Brand images are **company-level**, not quote-level. Today `QuoteDocument.astro` points `<img>` at `/q/{id}/asset?type=…`, which 404s for **new (unsaved) quotes** — note the unsaved id is **`-1`** (`src/server/ui-quotes.ts:12,26` `editableQuote`), not `0` — because `asset.ts` gates on `getQuote`.

**Correction:** the existing `src/pages/api/company/brand/[asset].ts` only exports **`PUT`** (Bearer-auth upload); there is **no GET**, and a browser `<img>` cannot attach a Bearer token. So we must **add a browser-reachable GET read route** for company brand assets:

- Add **`GET`** to `src/pages/api/company/brand/[asset]` serving the R2 object for `logo|stamp|bank`. Auth model: `/api/*` is **exempt from Basic auth** (`src/middleware.ts:9`) and the Cloudflare Access "/api bypass" app makes it publicly reachable — so this GET is an **unauthenticated public image read** (brand logo/stamp/bank are non-secret; they already appear on every published PDF). The `PUT` keeps its Bearer requirement.
- **Cache/staleness:** brand keys are fixed (`brand/logo.png`), so a re-uploaded logo can serve stale from CDN. **[2nd-review Y1/Y2]** `getBrandAsset` (`brand.ts:5`) returns only `arrayBuffer()` and **discards the R2 object's `httpEtag`** — so the GET route must call `env.FILES.get(key)` **directly** (not via `getBrandAsset`; `brand.ts` stays unchanged), read `object.httpEtag` / `object.writeHttpMetadata(headers)`, honor `If-None-Match` → `304`, and set `Cache-Control: public, max-age=60, must-revalidate`. (A `?v=<updated_at>` cache-bust is NOT viable: `company_profile.updated_at` is not in the `Company` type — so rely on ETag revalidation.)
- `QuoteDocument.astro` brand `<img src>` → `/api/company/brand/{logo|stamp|bank}` (works for `id=-1` and saved). `/q/[id]/asset.ts` stays for back-compat (retire later).

### 4.5 `createQuoteDocumentView` stays the single view model
Add `companyContact` to `QuoteDocumentView` + populate via `fallback(company.contact, '')`. Both consumers already depend on it. No other view-model change.

## 5. Data model change — `company.contact` (full-chain, ordered)

1. **migrations/0003_add_contact.sql** (new): `ALTER TABLE company_profile ADD COLUMN contact TEXT;` (nullable, mirrors `address`/`phone`).
2. **src/server/types.ts** `Company`: add `contact: string | null;` (after `phone`). `CompanyPatch` auto-includes (it's `Partial<Omit<Company,'id'>>`).
3. **src/server/db.ts** `companyRepo`: `get()` SELECT `*` already picks it up; `update()` — add `contact = ?N` to the UPDATE SET clause and a `patch.contact ?? current.contact` bind (extend the positional bind list; keep order consistent).
4. **src/server/company-service.ts** `validateCompanyPatch`: add `'contact'` to the optional-string field loop.
5. **src/server/ui-forms.ts** `companyPatchFromForm`: add `contact: stringValue(data.get('contact')),`.
6. **src/pages/settings/index.astro**: add `<input id="contact" name="contact" value={company.contact ?? ''} />` with label **賣方聯絡人**, positioned after 電話.
7. **packages/mcp/src/api-client.ts** `Company` interface: add `contact: string | null;` (keep mirror in sync; rebuild MCP after).
8. **src/server/quote-document-view.ts**: `QuoteDocumentView` += `companyContact: string`; `createQuoteDocumentView` += `companyContact: fallback(company.contact, '')`.
9. Render in `renderQuoteDocumentBody` seller block (`data-preview="companyContact"`).

`/api/company/index.ts` needs **no change** (delegates to `validateCompanyPatch`).

## 6. File-by-file change list

**New**
- `src/shared/quote-document-template.ts` — `renderQuoteDocumentBody`, `renderQuoteItemRows`, `QUOTE_DOCUMENT_CSS`, shared `escapeHtml` (browser-safe; importable by server + Astro + client editor).
- `migrations/0003_add_contact.sql`.
- `test/template-parity.test.ts` — assert on-screen body === PDF body for same data (normalize brand `src`).

**Modified**
- `src/server/quote-pdf-html.ts` — `buildQuoteHtml` composes `renderQuoteDocumentBody` + inlined `QUOTE_DOCUMENT_CSS`; drop old `css()` + inline markup; keep `imageDataUri`; import shared `escapeHtml`.
- `src/components/QuoteDocument.astro` — render via `set:html={renderQuoteDocumentBody(view, brandUrls)}`; brand `src` → company GET endpoint; inject `<style set:html={QUOTE_DOCUMENT_CSS}>`. Change root class `quotation-sheet` → `quote-sheet` (clean signal: old class gone).
- `src/pages/api/company/brand/[asset].ts` — **add `GET`** (public image read + ETag/Cache-Control; §4.4); keep `PUT` Bearer.
- `src/styles/global.css` — replace `.quotation-sheet*` with screen-only wrapper rules (page chrome, box-shadow, `@media print`); body styling now from `QUOTE_DOCUMENT_CSS`. **Resolve the `@page`/margin cascade** (canonical CSS `@page` vs `quote-pdf.ts` puppeteer margins vs `global.css` print rules — make ownership explicit, one source sets page margin). Scope doc font inside `.quote-sheet` (root is `17px`, doc `13px`).
- `src/client/quote-editor.ts` — `renderItems()` calls shared `renderQuoteItemRows`; `updatePreview()` sets `companyContact`; verify all `data-preview` names resolve after markup change.
- `src/server/quote-document-view.ts`, `types.ts`, `db.ts`, `company-service.ts`, `ui-forms.ts`, `settings/index.astro`, `packages/mcp/src/api-client.ts` — per §5.

**Unchanged:** `quote-pdf.ts` (margins TBD per cascade decision), `q/[id]/pdf.ts`, `quotes-service.ts`, `brand.ts`, `api/company/index.ts`, `quote-xlsx.ts`, totals math.

## 7. Acceptance criteria

- AC1 `/q/[id]` on-screen, the editor live preview, and the downloaded PDF are **visually identical** Design C for the same quote.
- AC2 Seller block shows 名稱 / 統編 / 地址 / **聯絡人** / 電話; 聯絡人 sourced from `company.contact` set in `/settings`.
- AC3 Tax rows appear only when `tax_rate > 0`; amounts show 未稅 / 營業稅 N% / 總計（含稅）.
- AC4 New (unsaved) quote editor preview renders logo/stamp/bank (no 404).
- AC5 `company.contact` round-trips: settings form save → GET `/api/company` returns it → appears in all three surfaces; partial PATCH preserves it.
- AC6 xlsx download unchanged (regression-clean).
- AC7 `pnpm test` green; `astro check` clean; prod `/q/8` + PDF render Design C after deploy.

## 8. Test plan (TDD — red → green → refactor)

Framework: **vitest + @cloudflare/vitest-pool-workers** (auto-applies `/migrations`, so `0003` loads in tests).

1. **company.contact round-trip** (`test/clients-company-api.test.ts`): RED — assert GET returns `contact`; PUT `{contact:'王小姐'}` persists; partial PATCH preserves (set-and-preserve, **not** clear-to-empty — see §13 R2). GREEN via §5 steps 1–4. **[2nd-review A3 correction]** The four `resetDb()` UPDATEs (`clients-company-api.test.ts:14`, `db.test.ts:10`, `quotes-api.test.ts:16`, `brand-upload-api.test.ts:8`) are **named-column literal SETs, not positional binds** — a new nullable `contact` column simply defaults NULL, so they do **not** desync or leak (Codex's "positional desync" rationale was wrong). Adding `contact` there is optional hygiene. The **mandatory** test edit is the inline `Company` **fixture literals** that must gain `contact` once `Company.contact` is a required type field, else `astro check`/build fails (see §13 Y5): `quote-pdf-html.test.ts` `makeCompany()` **and** `quote-xlsx.test.ts` company fixture.
2. **Template content** (`test/quote-pdf-html.test.ts`): RED — assert `buildQuoteHtml` output contains the centered serif「報 價 單」title, seller `companyContact`, and the three total labels (tax>0) / omits them (tax=0). **[Cross-review RED #3]** Design C *keeps* a small `QUOTATION` eyebrow, so do **NOT** assert absence of the literal `"QUOTATION"`; instead assert the **old layout marker is gone** — root class is now `quote-sheet` (not `quotation-sheet`) and the old header-eyebrow structure is absent. Update `makeCompany()` fixture with `contact`.
3. **Template parity** (`test/template-parity.test.ts`, new): RED — render `QuoteDocument.astro` body and `buildQuoteHtml` body for identical data; normalize (strip the brand `src` difference data-URI↔URL, collapse whitespace) and assert structural equality.
4. **Editor row parity**: assert `renderQuoteItemRows` (the shared fn the editor now calls) output matches the item-rows region of `renderQuoteDocumentBody`.
5. Regression: `test/quote-xlsx.test.ts` unchanged & green.

**Visual check (gating, not unit)** — **[Cross-review YELLOW: HTML-string tests don't catch layout/font]**: render the Design C PDF via **Cloudflare Browser Rendering** (prod path) AND local headless Chrome from real data; eyeball A4 layout, font (Noto Serif/Sans TC) parity, stamp/bank placement, and screen↔PDF match before deploy. Note CF Browser Rendering ≠ local Chrome — the gating check uses the prod CF path.

## 9. Risks & mitigations

- **Template duplication regressing** → mitigated by §4.1/§4.2 single builder+CSS and the parity test (#3).
- **Root `17px` vs doc `13px` font bleed** → scope all document rules under `.quote-sheet`; verify print + screen.
- **Astro `set:html` double-escaping** → builder already emits final escaped HTML; pass through `set:html` (no extra escape). Test special chars in `contact`/`subject`.
- **Positional bind off-by-one in `db.ts`** → covered by round-trip test #1.
- **Migration ordering / prod** → `0003` is additive `ADD COLUMN` (non-breaking, nullable). Apply to prod D1 *before* code deploy.
- **MCP type drift** → rebuild `packages/mcp` after; MCP doesn't render, so contact is read-only passthrough.
- **Editor `data-preview` breakage** → keep attribute names identical; the parity + row tests catch structural drift.

## 10. Deploy sequence (HITL-gated, commit = deploy)

1. `pnpm test` green + `astro check` clean. **[Cross-review YELLOW]** `vitest.config.ts:25` **excludes `packages/**`**, so also run `pnpm --dir packages/mcp build` here to typecheck the MCP `Company` mirror (it is NOT covered by `pnpm test`).
2. **[Cross-review YELLOW]** Back up prod D1 first (`wrangler d1 export <DB> --remote --output backup-pre-0003.sql`) — `ALTER TABLE ADD COLUMN` is additive but not trivially reversible on D1.
3. Apply migration to **prod D1**: `wrangler d1 migrations apply <DB> --remote` (confirm DB name/config at deploy time; non-breaking, old code tolerates the extra column so ordering-before-deploy is safe).
4. `pnpm build && wrangler deploy -c dist/server/wrangler.json`.
5. Smoke: `/settings` shows 賣方聯絡人 + save; `/q/8` renders Design C; download PDF = Design C (CF Browser Rendering); create new quote (`id=-1`) → editor preview shows brand images via the new GET route.
6. Backfill: set `company.contact = 範例負責人` in `/settings` (or PUT `/api/company`).
7. Rollback plan: revert code deploy (previous build) — the added column is inert to old code; no DB rollback needed unless data corruption (then restore from step-2 export).

> Deploy to `quote24.cc` writes live prod — pause for user confirmation before steps 2–4.

## 11. Open follow-ups (not blocking)
- Optionally align xlsx header to show seller 聯絡人 (currently out of scope).
- Optionally retire `/q/[id]/asset.ts` once brand images move to the company endpoint everywhere.

## 12. Cross-review log
Adversarial review by **Codex** (read-only, all 6 dimensions; findings verified against source). Incorporated:
- **RED #1/#2** — `/api/company/brand/[asset].ts` has only `PUT` (Bearer); browser `<img>` can't auth → added public `GET` read route + cache (§4.4).
- **RED #3** — Design C keeps a `QUOTATION` eyebrow; test must not assert its absence → assert old `quotation-sheet` class gone instead (§8.2).
- **RED #4** — client `renderItems()` would hand-rebuild rows → moved renderer to a **browser-safe shared module** with `renderQuoteItemRows` the editor imports (§4.1, §4.3).
- **YELLOW** — unsaved quote id is `-1` not `0`; `set:html` needs explicit text+attr escaping; brand cache/ETag; `contact` reset in 4 test seed files; D1 export before migration; MCP build in CI (excluded from `pnpm test`); rendered-PDF visual gate; `@page` cascade ownership.

Migration nullability is a deliberate choice: `contact TEXT` nullable (mirrors `address`/`phone`; `createQuoteDocumentView` uses `fallback`), unlike `tax_id` (`NOT NULL DEFAULT ''`).

_Gemini CLI failed twice (arg/infra, not account). Substituted an **independent fresh-context reviewer** (Agent tool) to triangulate Codex — see §13._

## 13. Second independent review (triangulation) — incorporated (binding deltas)
Independent reviewer verified Codex's fixes (A1 ✅ with caveat, A2 ✅, A3 ✅ on SQL/bind but **rationale corrected** — see §8.1, A4 ✅) and surfaced new issues. The following are **binding** and amend the sections noted:

- **R4 (HIGH, amends §4.1/§4.3/§8) — editor hook inventory.** `quote-editor.ts` mutates not just `data-preview` but also **`data-preview-optional="clientTaxId"`** (`:39`) and **`data-preview-tax-row`** (`:47`). `renderQuoteDocumentBody` MUST emit the full hook set: `data-preview` for `subject,clientName,clientContact,clientTaxId,clientPhone,quoteDate,validUntil,notes,subtotal,taxRate,taxAmount,total,quoteNo,companyName,companyContact` + `items`; plus `data-preview-optional="clientTaxId"` and `data-preview-tax-row`. The §8.3 parity test **cannot** catch a missing hook (PDF and screen share the builder). **Add a dedicated test** asserting the body contains every selector `quote-editor.ts` queries (grep its `[data-preview*]` selectors, assert each present).
- **R5 (HIGH, amends §3/§4.1/§4.3) — item-row shape + description.** Design C is **5 columns** (品項·內容 merged ｜ 數量 ｜ 單位 ｜ 單價 ｜ 金額); current `renderItems()`/thead are **6** (split 品項/說明). Decisions: (a) `description` stays a **single `\n`-delimited free-text string rendered with `<br>`** — **no auto-numbering** (existing data already embeds "1. … 2. …"; the mockup's auto-numbering is dropped). (b) `renderQuoteItemRows(items: QuoteDocumentItemView[])` consumes **pre-formatted** views; the editor's `readItems()` yields a flat `PreviewItem` `{name,description,qty,unit,unit_price}` → it must **map to `QuoteDocumentItemView`** (`formatQuantity`/`formatMoney` for qtyLabel/unitPriceLabel/amountLabel) before calling the shared fn. Update `QuoteDocument.astro` thead + `quote-editor.ts` to 5 columns.
- **R1 (amends §5.7) — MCP mirror.** Add `contact: string | null` to the **`Company`** interface (`packages/mcp/src/api-client.ts:56-68`, after `phone` ~`:61`). Note `contact` **already exists on the `Client` interface** (`:47`) — don't be misled by a grep hit into thinking it's done.
- **R2 (amends §5.3/§7 AC5) — nullable bind can't clear.** `patch.contact ?? current.contact` means once set, a PATCH **cannot empty** `contact` (same limitation as `address`/`phone`). AC5/§8.1 test **set-and-preserve**, not clear-to-empty. Document the limitation; don't write a test that asserts clearing works.
- **R3 (clarifies §5.5) — web form is full-replace.** `companyPatchFromForm` is a fixed-shape literal (always sends all keys), so the settings form is effectively a full replace; the genuinely-partial path is the API/MCP PUT via `validateCompanyPatch` (where adding `'contact'` to the optional-string loop, §5.4, is the required edit).
- **Y3 (amends §6) — `@page` ownership decided:** `QUOTE_DOCUMENT_CSS` owns the page via `@page { size:A4; margin:14mm }`; **set the puppeteer/CF margins in `quote-pdf.ts` to `0`** so they don't double-apply. → `quote-pdf.ts` moves to **Modified** (margin 0).
- **Y4 (amends §3/§6) — font parity:** the on-screen page MUST load the **same Noto Serif TC (700/900) + Noto Sans TC `<link>`** as the PDF (`quote-pdf-html.ts:27`), or the「報 價 單」serif title falls back and screen≠PDF (breaks AC1). Add the font `<link>` to the layout/`global.css` for the document.
- **Y5 (amends §6/§8) — fixture compile:** once `Company.contact` is required, **every inline `Company` literal must add `contact`**, incl. `test/quote-xlsx.test.ts` fixture (even though xlsx is unchanged — the type still tightens) and any helper in `test/clients-company-api.test.ts`.
- **Y6 (note) — settings field order:** form places 聯絡人 after 電話 (form order ≠ document order 名稱/統編/地址/聯絡人/電話); cosmetic, intentional.
- **Y7 (note) — validation coerces:** `optionalString` coerces non-strings via `String()` (no rejection); consistent with `address`/`phone`. AC5 test uses a string value.
- **A1 caveat (amends §4.4/§10) — Access is an assumption:** "public GET reachable by browser `<img>`" depends on the Cloudflare **Access** policy NOT fronting `/api/company/brand/*`. Unverifiable from source (Access closed bypass routes in `9e5a556`). **Deploy step 5 must smoke-test the actual `<img>` load against prod** (a 302→login HTML = Access is fronting it; then fall back to a Basic-protected non-`/api` route).

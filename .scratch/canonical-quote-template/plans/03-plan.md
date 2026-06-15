# Implementation Plan — Issue 03: 線上 /q/[id] 預覽改 Design C + 品牌圖 GET 路由

Quota repo (Astro SSR + CF Workers/D1/R2). Branch `feat/canonical-quote-template` only. **TDD: failing test → red → minimal impl → green → refactor.**

Slices 01 (company.contact) + 02 (shared `src/shared/quote-document-template.ts` with `renderQuoteDocumentBody`/`renderQuoteItemRows`/`QUOTE_DOCUMENT_CSS`/`escapeHtml`) are committed. This slice makes the on-screen `/q/[id]` page render the SAME shared template as the PDF, and adds a browser-reachable brand-image GET route.

## Read first
- `.scratch/canonical-quote-template/issues/03-onscreen-preview-brand-get.md`
- `docs/superpowers/specs/2026-06-15-canonical-quote-template-design.md` §4.2, §4.4, §13 (Y1/Y2 ETag, A1 Access caveat).
- `src/pages/api/company/brand/[asset].ts` (currently PUT-only, Bearer), `src/server/brand.ts` (`getBrandAsset` discards etag — do NOT use it for GET), `src/middleware.ts` (`/api/*` exempt from Basic).
- `src/components/QuoteDocument.astro` (current on-screen markup to replace), `src/pages/q/[id]/index.astro`, `src/styles/global.css` (`.quotation-sheet*` rules to remove).
- `src/server/quote-pdf-html.ts` (how PDF calls `renderQuoteDocumentBody`) — mirror the data wiring on-screen.

## Build

### A. Brand GET route — `src/pages/api/company/brand/[asset].ts`
Add `export const GET`:
- `asset` param ∈ `logo|stamp|bank`; map to company column `logo_key|stamp_key|bank_image_key` (read company via the existing repo/`getCompany`).
- If key is null → 404. Else `const obj = await env.FILES.get(key)` **directly** (NOT `getBrandAsset` — we need `obj.httpEtag`/`writeHttpMetadata`). If null → 404.
- Honor `If-None-Match`: if request header matches `obj.httpEtag` → return `304` (no body).
- Else return the bytes with: `Content-Type` (from `obj.httpMetadata?.contentType` or infer from key extension), `ETag: obj.httpEtag`, `Cache-Control: public, max-age=60, must-revalidate`.
- Public read (no Bearer) — `/api/*` is Basic-exempt and brand assets are non-secret. Keep `PUT` exactly as-is (Bearer).

### B. On-screen render — `src/components/QuoteDocument.astro`
- Compute `view = createQuoteDocumentView({ quote, company })`.
- Build `brandUrls = { logo: company.logo_key ? '/api/company/brand/logo' : null, stamp: company.stamp_key ? '/api/company/brand/stamp' : null, bank: company.bank_image_key ? '/api/company/brand/bank' : null }`.
- Replace the component's markup with: `<Fragment set:html={renderQuoteDocumentBody(view, brandUrls)} />` (or a wrapping div). Inject the canonical CSS once on the page and the SAME font `<link>` as the PDF (Noto Serif TC 700;900 + Noto Sans TC 400;500;700;900). Root class is `quote-sheet` (from the shared body).
- Keep the component's Props (`{ quote, company }`) so `/q/[id]/index.astro` and `QuoteEditor.astro` callers are unchanged.

### C. Screen CSS — `src/styles/global.css`
- Remove the old `.quotation-sheet*` document rules.
- Keep/adjust only screen-chrome: the page wrapper around `.quote-sheet` (centering, box-shadow, screen padding) + `@media print` (strip topbar/toolbars). Document typography/layout now comes from `QUOTE_DOCUMENT_CSS` (scoped to `.quote-sheet`). Ensure the 17px root vs 13px `.quote-sheet` don't bleed.
- `@page` margin is owned by `QUOTE_DOCUMENT_CSS`; don't redefine it conflictingly.

## TDD
1. **RED** — `test/template-parity.test.ts` (new): for one `view` + brand, assert `renderQuoteDocumentBody(view, urlBrand)` and `renderQuoteDocumentBody(view, dataUriBrand)` are **identical after normalizing the brand `src` values** (prove the renderer is src-strategy-agnostic → on-screen == PDF body). Also assert the on-screen brand URL form (`/api/company/brand/logo`) is what `QuoteDocument.astro` would pass (a small unit on the URL-builder if extracted). Run → red (if URL-builder not yet present) then green.
2. **RED** — a brand-GET route test if the test infra supports it (see `test/brand-upload-api.test.ts` for the PUT pattern): GET `/api/company/brand/logo` after seeding a brand key returns 200 + ETag; `If-None-Match` with that ETag returns 304; unknown asset → 404.
3. **GREEN** — implement A/B/C. `pnpm test` + `astro check` green.
4. **REFACTOR**.

## Guardrails
- Do NOT change the shared template module (02) or the editor client (`quote-editor.ts` — that's issue 04) beyond what's needed to render on-screen.
- Do NOT touch xlsx, totals math, auth model (keep PUT Bearer; GET public).
- Do NOT remove `/q/[id]/asset.ts`.
- Surgical, traceable diff.

# Implementation Plan — Issue 02: 共用模板模組 + PDF 改 Design C

Quota repo (Astro SSR + CF Workers/D1/R2). Branch `feat/canonical-quote-template` only; no new branches, no cd elsewhere. **TDD mandatory: failing test → confirm red → minimal impl → green → refactor.**

## Read first
- `.scratch/canonical-quote-template/issues/02-canonical-template-module-pdf.md`
- `docs/superpowers/specs/2026-06-15-canonical-quote-template-design.md` §3 (Design C visual target), §4.1 (shared module + escaping), §13 (R4 hook inventory, R5 row shape).
- **`private/tools/quote-pdf-bespoke.py`** — the exact, already-approved Design C HTML+CSS (gitignored but on disk; reproduce its `<style>` and layout as `QUOTE_DOCUMENT_CSS` + markup, adapted to be data-driven). Render reference: `~/Downloads/報價單設計C_精緻金棕.pdf`.
- `src/server/quote-document-view.ts` — `QuoteDocumentView` fields available (now incl `companyContact`), `formatMoney`/`formatQuantity`/`fallback`.
- `src/server/quote-pdf-html.ts` — current `buildQuoteHtml(quote, company, brand)` contract + `imageDataUri` helper (keep) + private `escapeHtml` (replace with shared).
- `src/client/quote-editor.ts` — **the selectors you MUST keep emitting** (grep `data-preview`): every `data-preview="…"` name + `data-preview-optional="clientTaxId"` + `data-preview-tax-row`.

## Build: `src/shared/quote-document-template.ts` (browser-safe, pure; no Node/Workers-only deps)
Export:
- `QUOTE_DOCUMENT_CSS: string` — Design C CSS from the mockup (centered serif「報 價 單」+ small `QUOTATION`, gold `#A6791A`, seller+client blocks, gold-underline 計畫名, 5-col items table, dashed totals, 匯款+stamp+bank footer). Include `@page { size:A4; margin:14mm }`. Scope ALL document rules under a `.quote-sheet` root so a 17px host root doesn't bleed (document base 13px).
- `escapeHtml(s: string): string` — escapes `& < > " '`. Used for **every** text AND attribute value.
- `renderQuoteItemRows(items: QuoteDocumentItemView[]): string` — **5 columns**: merged 品項·內容 (bold serif `item.name` + `<br>`-rendered `item.description` as-is, **no auto-numbering**) ｜ 數量(`qtyLabel`) ｜ 單位(`unit`) ｜ 單價(`unitPriceLabel`) ｜ 金額(`amountLabel`). One `<tr>` per item.
- `renderQuoteDocumentBody(view: QuoteDocumentView, brand: {logo:string|null; stamp:string|null; bank:string|null}): string` — returns `<article class="quote-sheet" data-preview="items-root?">…</article>`. Calls `renderQuoteItemRows(view.items)` inside `<tbody data-preview="items">`. Brand `<img src>` = the passed strings (caller decides data-URI vs URL; render no `<img>` if null). **Escape every text + attribute value.** Emit the FULL editor-hook set (must match what `quote-editor.ts` queries):
  - `data-preview="subject|clientName|clientContact|clientTaxId|clientPhone|quoteDate|validUntil|notes|subtotal|taxRate|taxAmount|total|quoteNo|companyName|companyContact"` on the right nodes, `data-preview="items"` on the items `<tbody>`.
  - `data-preview-optional="clientTaxId"` on the client 統編 row (so it can hide when empty).
  - `data-preview-tax-row` on each tax row (營業稅 line) so it can hide when `tax_rate==0`.
  - Tax rows rendered only when `view.showTaxRows` (or render with the attr and let CSS/JS hide — match current `quote-editor.ts` mechanism; inspect it and stay compatible).

## Wire PDF
- `src/server/quote-pdf-html.ts` `buildQuoteHtml(quote, company, brand)` (contract unchanged): `const view = createQuoteDocumentView({quote, company})`; brand → data-URIs via existing `imageDataUri`; return full `<!doctype html>` with `<link>` Noto Serif TC(700;900)+Noto Sans TC, `<style>${QUOTE_DOCUMENT_CSS}</style>`, body = `renderQuoteDocumentBody(view, {logo,stamp,bank})`. Remove old `css()` + old markup. Import shared `escapeHtml`.
- `src/server/quote-pdf.ts`: set puppeteer/CF `margin` to 0 (CSS `@page` owns 14mm).

## TDD steps
1. **RED** — `test/template-hooks.test.ts` (new): build a `QuoteDocumentView` fixture, call `renderQuoteDocumentBody`, assert the output contains EVERY selector grep'd from `quote-editor.ts` (each `data-preview="X"`, `data-preview-optional="clientTaxId"`, `data-preview-tax-row`). Also assert `renderQuoteItemRows` emits 5 `<td>` per row + the `<br>` description. Run → red.
2. **RED** — extend `test/quote-pdf-html.test.ts`: assert output contains centered「報 價 單」, `companyContact` value, three tax labels when tax>0 and none when tax=0, and `class="quote-sheet"`; assert the old root `quotation-sheet` is **absent** (do NOT assert literal `QUOTATION` absent — Design C keeps the eyebrow). Run → red.
3. **GREEN** — implement the module + rewire buildQuoteHtml + quote-pdf.ts margin. Run `pnpm test` + `astro check` → green.
4. **REFACTOR** — keep diff surgical.

## Guardrails
- Do NOT touch `QuoteDocument.astro`, `quote-editor.ts`, `global.css`, the brand GET route, or xlsx — those are issues 03/04. This issue only creates the shared module + rewires the PDF path + tests.
- Keep `buildQuoteHtml` signature identical (callers unchanged).
- Every diff line traceable; no opportunistic reformatting.

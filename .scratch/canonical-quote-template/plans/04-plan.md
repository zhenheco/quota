# Implementation Plan — Issue 04: 編輯器即時預覽改 Design C (+ carried fixes)

Quota repo (Astro SSR + CF Workers/D1/R2). Branch `feat/canonical-quote-template` only. **TDD: failing test → red → minimal impl → green → refactor.** Run `pnpm test` + `pnpm exec astro check` and confirm green yourself before finishing (do not trust any external tool's success claim).

Slices 01–03 committed: company.contact full-chain; shared `src/shared/quote-document-template.ts` (`renderQuoteDocumentBody`/`renderQuoteItemRows` 5-col/`QUOTE_DOCUMENT_CSS`/`escapeHtml`); on-screen `/q/[id]` renders via `set:html`; brand GET route. **NOTE: Codex CLI is exhausted — you (a Claude implementer) are the implementer; the orchestrator + an independent Claude reviewer will cross-validate.**

## Read first
- `.scratch/canonical-quote-template/issues/04-editor-live-preview.md`
- `docs/superpowers/specs/2026-06-15-canonical-quote-template-design.md` §4.3, §13 (R4, R5).
- `src/client/quote-editor.ts` (current: `renderItems()` hand-builds **6-col** rows lines ~83-95; private `escapeHtml` ~97-103 that **omits `'`**; `updatePreview` ~132-152; `setTaxRowVisibility` ~46; `readItems`/`PreviewItem`).
- `src/shared/quote-document-template.ts` (`renderQuoteItemRows`, `renderTotals`, `escapeHtml`, `QUOTE_DOCUMENT_CSS`).
- `src/server/quote-document-view.ts` (`QuoteDocumentItemView` shape; `formatMoney`/`formatQuantity`).

## Build

### A. Shared module — make tax rows always-present (carried from Slice 2 review)
In `src/shared/quote-document-template.ts` `renderTotals`: **always render all three rows** (don't branch them away):
- 未稅小計 row: add attribute `data-preview-subtotal-row`; add ` hidden` when `!view.showTaxRows`.
- 營業稅 row: keep `data-preview-tax-row`; add ` hidden` when `!view.showTaxRows`.
- 總計 grand row: always visible; label just `總計` (drop the 總計（含稅）/總計 branch — the presence of the tax rows conveys 含稅). `data-preview="total"`.
This keeps an untaxed document visually clean (only 總計 shows; the two rows are present but `hidden`) AND gives the editor stable nodes to reveal. Ensure `[hidden]{display:none}` is honored (it is by default; confirm `QUOTE_DOCUMENT_CSS` doesn't override). Update `test/quote-pdf-html.test.ts` (the tax>0 assertions: still 未稅小計/營業稅/總計; tax=0: the rows exist but carry `hidden`) and `test/template-hooks.test.ts` (assert `data-preview-subtotal-row` + `data-preview-tax-row` present).

### B. Shared formatters reuse
So editor rows match the PDF exactly, the editor must format with the SAME logic as `createQuoteDocumentView`. Move `formatMoney` and `formatQuantity` from `src/server/quote-document-view.ts` into `src/shared/quote-document-template.ts` (or a shared util it re-exports), and have `quote-document-view.ts` import them. (Keep behavior identical; this is a pure relocation.)

### C. Editor client — `src/client/quote-editor.ts`
- Delete the private `escapeHtml` (~97-103); import `escapeHtml` from the shared module (it escapes `'` too).
- `renderItems(previewItems)`: map each flat `PreviewItem {name, description, qty, unit, unit_price}` → `QuoteDocumentItemView {name, description, qtyLabel: formatQuantity(qty), unit, unitPriceLabel: formatMoney(unit_price), amountLabel: formatMoney(Math.round(qty*unit_price))}`, then call the shared `renderQuoteItemRows(views)` and set it as the `<tbody data-preview="items">` innerHTML. (Removes the hand-built 6-col rows → now 5-col, identical to PDF.)
- `setTaxRowVisibility(show)`: toggle `hidden` on BOTH `[data-preview-subtotal-row]` and `[data-preview-tax-row]` (so raising/lowering tax live reveals/hides both rows). Keep updating `subtotal`/`taxRate`/`taxAmount`/`total` via `setPreview`.
- Do NOT set `companyName`/`companyContact`/`quoteNo` from the editor (server-side company/quote-no data, not form-editable) — leave as server-rendered.
- Empty-notes (minor, optional): if it's trivial, hide the notes `<section data-preview="notes">` when empty; otherwise leave.

## TDD
1. **RED** — extend `test/template-hooks.test.ts`: assert `renderTotals`/body for a tax=0 view still contains the subtotal + tax rows (now with `hidden`) and `data-preview-subtotal-row`; for tax>0 they are present without `hidden`. Confirm red.
2. **RED** — a unit test for the editor item-row mapping if feasible (pure mapper extracted), OR rely on `template-hooks`/`template-parity` for row shape. At minimum assert `renderQuoteItemRows(mapped)` yields 5 `<td>`.
3. **GREEN** — implement A/B/C. Run `pnpm test` + `astro check` → green.
4. **Manual note** (orchestrator will verify): new quote (`id=-1`) editor preview shows brand images via `/api/company/brand/*`; editing items/tax updates the Design C preview live without layout break.
5. **REFACTOR**.

## Guardrails
- Do NOT change the PDF `buildQuoteHtml` signature, xlsx, totals math (`computeTotals`), auth, or routing.
- The `renderTotals` change is the ONLY shared-module markup change; keep it minimal and re-verify the PDF (Slice 2) assertions still pass.
- Surgical, traceable diff. Confirm `pnpm test` + `astro check` green BEFORE declaring done.

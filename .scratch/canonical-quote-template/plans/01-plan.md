# Implementation Plan — Issue 01: 賣方聯絡人 full-chain

You are implementing in the Quota repo (Astro SSR + Cloudflare Workers/D1/R2). Work ONLY on branch `feat/canonical-quote-template`; do NOT create branches or cd elsewhere. **TDD mandatory: write failing test → confirm red → minimal implementation → green → refactor.**

Read first: `.scratch/canonical-quote-template/issues/01-seller-contact-fullchain.md` and `docs/superpowers/specs/2026-06-15-canonical-quote-template-design.md` §5 + §13 (R1, R2, R3, Y5).

## Goal
Add nullable `company.contact` (賣方聯絡人) end-to-end so it can be set in `/settings`, returned by the API, and surfaced in the quote view model — without breaking existing tests/types/build.

## Steps (red → green → refactor)
1. **RED** — In `test/clients-company-api.test.ts`, add a round-trip test: PUT `/api/company` with `{contact:'王小姐'}` persists; GET returns `contact:'王小姐'`; a partial PATCH (omitting contact) preserves it. Run `pnpm test` → confirm it fails (no contact yet). Do NOT test clearing-to-empty (nullable `?? current` means contact can't be emptied once set — by design, parity with address/phone).
2. **GREEN (in order):**
   - `migrations/0003_add_contact.sql`: `ALTER TABLE company_profile ADD COLUMN contact TEXT;` (nullable, no default — mirror address/phone, NOT tax_id's NOT NULL DEFAULT '').
   - `src/server/types.ts` `Company`: add `contact: string | null;` (after `phone`). `CompanyPatch` auto-includes.
   - `packages/mcp/src/api-client.ts`: add `contact: string | null;` to the **`Company`** interface (~line 61, after `phone`) — NOT the `Client` interface (which already has contact).
   - `src/server/db.ts` `companyRepo.update()`: add `contact = ?N` to the UPDATE SET list AND a `patch.contact ?? current.contact` bind at the matching position — keep SQL placeholders and bind() args in lockstep.
   - `src/server/company-service.ts` `validateCompanyPatch`: add `'contact'` to the optional-string field loop.
   - `src/server/ui-forms.ts` `companyPatchFromForm`: add `contact: stringValue(data.get('contact')),`.
   - `src/pages/settings/index.astro`: add a field `<input id="contact" name="contact" value={company.contact ?? ''}>` after the 電話 field, label「賣方聯絡人」.
   - `src/server/quote-document-view.ts`: add `companyContact: string` to `QuoteDocumentView`; in `createQuoteDocumentView` set `companyContact: fallback(company.contact, '')` (used by later slices; harmless now).
3. **Fixture/compile fixes** (so build + all tests pass): once `Company.contact` is required, add `contact` to every inline `Company` literal/fixture: `test/quote-pdf-html.test.ts` `makeCompany()`, `test/quote-xlsx.test.ts` company fixture, and the 4 `resetDb()` UPDATEs (`test/clients-company-api.test.ts`, `test/db.test.ts`, `test/quotes-api.test.ts`, `test/brand-upload-api.test.ts`) — note these resetDb are named-column literal SETs (adding `contact` is hygiene; a new nullable column defaults NULL and won't desync, but add it for clarity and to seed deterministic values).
4. **GREEN verify:** `pnpm test` all pass, `astro check` clean, `pnpm --dir packages/mcp build` clean (MCP not covered by `pnpm test`).
5. **REFACTOR** as needed; keep diff surgical and traceable.

## Guardrails
- Do NOT change xlsx layout, totals math, auth, or routing.
- Do NOT touch the PDF/preview template yet (that's issues 02–04); only add the `companyContact` view-model field.
- Every diff line traceable to this issue; no opportunistic reformatting.

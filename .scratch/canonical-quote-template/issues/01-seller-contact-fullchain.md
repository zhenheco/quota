Status: closed
Type: feat

# 01 — 賣方聯絡人 full-chain（schema→service→settings→MCP）

**Type**: AFK · **Blocked by**: None · **User stories**: #4, #5, #12
Spec: `docs/superpowers/specs/2026-06-15-canonical-quote-template-spec.md` Slice 1 + `…-design.md` §5/§13.

加 `company.contact`（賣方聯絡人）全鏈，讓設定頁可填、抬頭可顯示，且既有測試/型別/build 不破。

## Acceptance criteria
- [ ] `migrations/0003_add_contact.sql`：`ALTER TABLE company_profile ADD COLUMN contact TEXT;`（nullable，no default；比照 address/phone）。
- [ ] `src/server/types.ts` `Company` 加 `contact: string | null`；`packages/mcp/src/api-client.ts` 的 **`Company`** interface（非已存在 contact 的 `Client`）加同欄。
- [ ] `src/server/db.ts` `companyRepo.update()`：SQL SET 與 `.bind()` **同步**加 `contact`（`patch.contact ?? current.contact`）；`get()` SELECT * 自動帶。
- [ ] `src/server/company-service.ts` `validateCompanyPatch`：把 `'contact'` 加進 optional-string 欄位 loop。
- [ ] `src/server/ui-forms.ts` `companyPatchFromForm`：加 `contact: stringValue(data.get('contact'))`。
- [ ] `src/pages/settings/index.astro`：在電話後新增 `<input id="contact" name="contact" value={company.contact ?? ''}>`，label「賣方聯絡人」。
- [ ] `src/server/quote-document-view.ts`：`QuoteDocumentView` 加 `companyContact`，`createQuoteDocumentView` 填 `fallback(company.contact,'')`（供後續 slice 渲染）。
- [ ] 既有測試相容：4 個 `resetDb()`（`clients-company-api`/`db`/`quotes-api`/`brand-upload-api`）與所有 inline `Company` fixture（含 `test/quote-xlsx.test.ts`、`test/quote-pdf-html.test.ts makeCompany`）補 `contact` 使 `astro check`/build/`pnpm test` + `pnpm --dir packages/mcp build` 全綠。
- [ ] 新增/擴充 round-trip 測試（`test/clients-company-api.test.ts`）：PUT `{contact:'王小姐'}` 持久化、GET 回傳、partial PATCH **保留**（set-and-preserve；不測清空——nullable `??` 設後不可清空，刻意）。

## TDD
先寫 failing round-trip + fixture 型別測 → 確認紅 → 最小實作（migration→types→db→service→ui-forms→settings→mcp→view）→ 綠 → refactor。

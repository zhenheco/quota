Status: closed
Type: chore

# 05 — 部署 prod（migration + deploy + 實機驗證 + 回填）

**Type**: HITL（動 prod quote24.cc，須使用者確認）· **Blocked by**: 04 · **User stories**: #1, #2, #13
Spec: Slice 5 + `…-design.md` §10/§13 (A1 caveat).

## Acceptance criteria
- [ ] 先 `wrangler d1 export <DB> --remote --output backup-pre-0003.sql` 備份 prod D1。
- [ ] `wrangler d1 migrations apply <DB> --remote`（additive ADD COLUMN，舊碼相容）。
- [ ] `pnpm build && wrangler deploy -c dist/server/wrangler.json` → `pnpm --dir packages/mcp build`。
- [ ] 實機 smoke：`/settings` 有「賣方聯絡人」可存；`/q/8` 線上 = Design C；下載 PDF（CF Browser Rendering）= Design C；新建單編輯器顯示品牌圖；**`<img>` 載 `/api/company/brand/logo` 不被 Access 擋**（若 302→login HTML 則改放 Basic-protected 非 `/api` route 再重驗）。
- [ ] 回填 `company.contact = 範例負責人`（`/settings` 或 PUT `/api/company`）。

## Notes
HITL gate：執行前向使用者確認（commit=deploy 手動）。rollback：revert code（新欄對舊碼 inert）；資料異常才從 backup 還原。

# Quota — 報價單系統

各自自架在 Cloudflare 的單租戶報價單系統。Astro SSR + CF Workers / D1 / R2，
伺服器端 ExcelJS 產 xlsx，web 與 MCP server 兩條建單路徑共用同一 API。
設計規格見 `docs/superpowers/specs/2026-06-14-quote-system-spec.md`。

## Agent skills

### Issue tracker

Issues/PRDs 以 markdown 存於 `.scratch/<feature>/`（無 GitHub remote，本地單人專案）。See `docs/agents/issue-tracker.md`.

### Triage labels

採五個 canonical 角色預設字串（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）。See `docs/agents/triage-labels.md`.

### Domain docs

Single-context：根目錄 `CONTEXT.md` + `docs/adr/`。See `docs/agents/domain.md`.

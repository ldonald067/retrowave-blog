# Retrowave Blog - Learnings Index

Cross-command knowledge base. All `/skill` commands read relevant docs before
starting work and contribute new findings after completing work.

**IMPORTANT:** Read the relevant doc(s) below before making changes in that area.

| Doc | When to read |
|-----|-------------|
| [data-contracts.md](docs/data-contracts.md) | Changing field limits, adding columns, syncing frontend/backend |
| [gotchas.md](docs/gotchas.md) | Before any code change — TypeScript, mobile, UI, data pitfalls |
| [theming.md](docs/theming.md) | Adding/editing CSS variables, contrast fixes, responsive layout |
| [architecture.md](docs/architecture.md) | Supabase RPCs, auth patterns, icons, performance, public profiles |
| [false-positives.md](docs/false-positives.md) | Before flagging audit issues — check if already investigated |

## Entry Format

When adding findings to a doc:
- `[YYYY-MM-DD /command]` prefix for traceability
- One-line summary, then optional details
- Only genuinely NEW findings — don't repeat existing entries
- Mark fixed items with `RESOLVED:` — they'll be archived periodically

# Supabase Local Setup

This repo uses Supabase for auth, profiles, journal entries, reactions, blocks,
reports, and optional public journal pages.

## What Can Be Local

Safe in `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY` as a legacy fallback only

The key can be a Supabase publishable key (`sb_publishable_...`) or the legacy
`anon` key. Supabase currently supports both during the API-key transition.

Never put these in `.env.local`, source code, screenshots, PRs, or chat:

- `service_role` key
- `sb_secret_...` key
- Database password
- JWT secret
- Supabase access token

## Where To Find Frontend Values

In the Supabase dashboard:

- Open the project.
- Use the Connect dialog or Project Settings API/API Keys area.
- Copy the Project URL.
- Copy a Publishable key, or the legacy `anon` key if that is what the project
  currently uses.

Then create `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_key
```

`.env.local` is ignored by git.

## CLI Tooling

The Supabase CLI is installed as a local dev dependency. Use it through npm:

```bash
npm run supabase -- --version
npm run supabase:login
npm run supabase:status
```

For account-level CLI access, run `npm run supabase:login`. Supabase stores the
login token in native credential storage when available, or under the local
Supabase settings directory if credential storage is unavailable.

The repo is already linked (`supabase/.temp/project-ref`). To link a fresh
clone:

```bash
npm run supabase -- link --project-ref your-project-ref
```

That may ask for the database password. Enter it into the terminal prompt only;
do not paste it into chat or commit it.

## Migrations do not go through the CLI

**`supabase db push` does not work on this project** — the hosted Postgres
refuses the CLI's login-role creation. `supabase migration list` and
`supabase test db` fail for the same reason. Everything in
`supabase/migrations/` was applied by hand, and
`supabase_migrations.schema_migrations` holds 1 row out of 40+, so **a migration
file existing does not mean it is live.**

Apply SQL by pasting it into the dashboard SQL editor, or through the Management
API:

```bash
TOKEN=$(security find-generic-password -s "Supabase CLI" -a supabase -w)
curl -s -X POST "https://api.supabase.com/v1/projects/$(cat supabase/.temp/project-ref)/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select column_name from information_schema.columns where table_name='"'"'profiles'"'"';"}'
```

Verify every schema claim that way rather than reading a migration. See
`CLAUDE.md` and `docs/supabase-snippet-archive/README.md`.

## Codex MCP Setup

Codex can connect to Supabase through the remote Supabase MCP server. This is a
local machine/account setup, not a repo secret.

For a new machine or fresh Codex profile:

```bash
codex mcp add supabase --url https://mcp.supabase.com/mcp?project_ref=your-project-ref
```

Then ensure `~/.codex/config.toml` includes:

```toml
[mcp]
remote_mcp_client_enabled = true
```

Authenticate with:

```bash
codex mcp login supabase
```

Verify with:

```bash
codex mcp list
codex mcp get supabase
```

New MCP servers may require a fresh Codex session before their tools/resources
show up inside the running chat.

## Local QA Notes

Without `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or the
legacy `VITE_SUPABASE_ANON_KEY`, the frontend fails during Supabase client
initialization and browser screenshots render blank. Add `.env.local` before
running mobile viewport QA against the real app.

## References

- Supabase API keys: https://supabase.com/docs/guides/api/api-keys
- Supabase CLI reference: https://supabase.com/docs/reference/cli/start

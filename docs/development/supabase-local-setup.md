# Supabase Local Setup

This repo uses Supabase for auth, profiles, journal entries, reactions, blocks,
reports, and optional public journal pages.

## What Can Be Local

Safe in `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

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
VITE_SUPABASE_ANON_KEY=sb_publishable_or_legacy_anon_key
```

`.env.local` is ignored by git.

## CLI Tooling

The Supabase CLI is installed as a local dev dependency. Use it through npm:

```powershell
npm run supabase -- --version
npm run supabase:login
npm run supabase:status
```

For account-level CLI access, run `npm run supabase:login`. Supabase stores the
login token in native credential storage when available, or under the local
Supabase settings directory if credential storage is unavailable.

If you need remote migration access later, link the repo to the hosted project:

```powershell
npm run supabase -- link --project-ref your-project-ref
```

That may ask for the database password. Enter it into the terminal prompt only;
do not paste it into chat or commit it.

## Codex MCP Setup

Codex can connect to Supabase through the remote Supabase MCP server. This is a
local machine/account setup, not a repo secret.

For a new machine or fresh Codex profile:

```powershell
codex mcp add supabase --url https://mcp.supabase.com/mcp?project_ref=your-project-ref
```

Then ensure `~/.codex/config.toml` includes:

```toml
[mcp]
remote_mcp_client_enabled = true
```

Authenticate with:

```powershell
codex mcp login supabase
```

Verify with:

```powershell
codex mcp list
codex mcp get supabase
```

New MCP servers may require a fresh Codex session before their tools/resources
show up inside the running chat.

## Local QA Notes

Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, the frontend fails
during Supabase client initialization and browser screenshots render blank. Add
`.env.local` before running mobile viewport QA against the real app.

## References

- Supabase API keys: https://supabase.com/docs/guides/api/api-keys
- Supabase CLI reference: https://supabase.com/docs/reference/cli/start

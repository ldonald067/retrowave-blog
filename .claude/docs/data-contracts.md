# Shared Data Contracts

Keep frontend and backend in sync when changing limits or adding fields.

**The Backend column names the migration that _should_ define each contract, not
proof that it is live.** `supabase db push` is blocked on this project and
migrations were applied by hand, so confirm against prod before relying on any
row here — recipe in `CLAUDE.md`.

| Data                 | Frontend                                                    | Backend                                                      |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| Post field limits    | `validation.ts` `POST_LIMITS`                               | `20260223000001_post_constraints.sql`                        |
| Profile field limits | `validation.ts` `PROFILE_LIMITS`                            | `20260224000004` + `20260224000008`                          |
| Chapter max length   | `validation.ts` `POST_LIMITS.chapter` (100)                 | `20260315000004` CHECK constraint                            |
| Reaction emoji set   | `ReactionBar.tsx` `REACTION_EMOJIS`                         | `20260224000004` CHECK constraint                            |
| Password policy      | `validation.ts` `PASSWORD_MIN_LENGTH` (8)                   | `config.toml` `minimum_password_length`                      |
| Username format      | `validation.ts` `validateUsername` (3–30, `[a-z0-9_-]`)     | `20260919000000` CHECK, lowercase-only (applied 2026-09-19)  |
| Reserved usernames   | `validation.ts` `RESERVED_USERNAMES` + contains "retrowave" | `20260919010000` `is_reserved_username()` + CHECK            |
| Username rename rule | `validation.ts` `USERNAME_CHANGE_COOLDOWN_DAYS` (30)        | `20260920000000` `guard_username_change()` (applied 2026-09-22)  |
| Moderation lists     | `moderation.ts` `BLOCKED_PATTERNS` + `BLOCKED_DOMAINS`      | `functions/moderate-content/index.ts`                        |
| `ModerationResult`   | `moderation.ts` (duplicated on purpose)                     | `functions/moderate-content/index.ts`                        |
| Public profile flag  | `profile.ts` `is_public`                                    | `20260319000001` column + RPC                                |

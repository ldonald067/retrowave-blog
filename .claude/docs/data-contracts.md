# Shared Data Contracts

Keep frontend and backend in sync when changing limits or adding fields:

| Data | Frontend | Backend |
|------|----------|---------|
| Post field limits | `validation.ts` `POST_LIMITS` | `20260223000001_post_constraints.sql` |
| Profile field limits | `validation.ts` `PROFILE_LIMITS` | `20260224000004` + `20260224000008` |
| Chapter max length | `validation.ts` `POST_LIMITS.chapter` (100) | `20260315000004` CHECK constraint |
| Reaction emoji set | `ReactionBar.tsx` `REACTION_EMOJIS` | `20260224000004` CHECK constraint |
| Password policy | `validation.ts` `PASSWORD_MIN_LENGTH` (8) | `config.toml` `minimum_password_length` |
| Username format | `validation.ts` `USERNAME_PATTERN` | `20260315000002` CHECK constraint |
| Moderation lists | `moderation.ts` `BLOCKED_PATTERNS` | `edge fn moderate-content` |
| Public profile flag | `profile.ts` `is_public` | `20260319000001` column + RPC |

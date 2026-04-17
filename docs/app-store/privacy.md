# App Store Privacy Notes

Branch: `fix/intentional-public-profile`

This is a working inventory for App Store Connect answers, privacy policy drafting, screenshots, and reviewer notes. It is not legal copy.

## Product Positioning

Lead with private journaling. Public pages are optional publishing, not a feed.

Suggested short line:

> A private retro journal for entries, moods, and music, with optional public sharing when you choose.

## Data Inventory

| Data | Stored | Public by default | Purpose | Notes |
| --- | --- | --- | --- | --- |
| Email address | Yes | No | Account login/authentication | Stored through Supabase Auth. |
| User id | Yes | No | Own entries, profile, reactions, and blocks | Internal identifier tied to account data. |
| Birth year | Yes | No | Age gate/COPPA posture | Should stay private and owner/admin-only. |
| Terms acceptance | Yes | No | Account eligibility | Should stay private and owner/admin-only. |
| Journal entries | Yes | No | Core private journal | New entries default private. |
| Entry title/content/chapter/mood/music | Yes | No | Journal organization and expression | Can become public only if the user makes the entry public and publishes their page. |
| Public profile username/display name/bio/avatar URL/theme/mood/music | Yes | Optional | Public profile customization | Public only when the user publishes their page. |
| Reactions | Yes | No public prompt | Account-only lightweight interaction | Public profile pages stay read-only. |
| Blocks | Yes | No | User safety | Used to hide blocked users' content from signed-in journal/feed views. |
| Reports | Email-based | No | Public content safety | Report links open email to the app contact address. |
| Camera/photo data | No current app permission | No | Not used | Do not claim camera/photo access unless capture or upload is added later. |

## App Store Connect Draft Posture

- Contact info: email address is used for account login.
- User content: journal/profile content is stored and linked to the user's account.
- Identifiers: internal user ids are used to connect entries, profile settings, reactions, and blocks.
- Sensitive data: birth year is collected for age gating and should not be exposed publicly.
- Public data: only profile fields and public entries chosen by the user should appear on public pages.
- Third-party processing: Supabase stores/authenticates app data.

## Screenshot And Review Notes

- First screenshot should show the private entry editor.
- Show the private/public entry control before any public profile screenshot.
- Show public publishing as an explicit confirmation, not a default state.
- Do not lead with reactions or public pages.
- Mention that camera/photo permissions are absent until image capture or upload exists.
- Mention public pages are read-only and include report links for public content.

## Open Questions Before Submission

- Final app name and subtitle.
- Final privacy policy URL.
- Whether email-based reporting is enough for launch or should become an in-app form later.
- Whether public profile screenshots should be included in the first submission or saved for a later marketing pass.

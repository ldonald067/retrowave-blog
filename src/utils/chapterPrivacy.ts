/**
 * Chapter names are free text typed per entry — there is no chapter table and no
 * rename operation, so near-miss spellings are routine. Privacy comparisons must
 * therefore be case- and whitespace-insensitive, or a user who retypes "Therapy"
 * as "therapy" silently publishes an entry they believed was hidden.
 *
 * This MUST stay in step with the normalized comparison in get_public_profile
 * (supabase/migrations/20260729030000_chapter_privacy_normalized_match.sql).
 * If the two ever diverge, the UI padlock stops reflecting real visibility.
 */
export function normalizeChapter(chapter: string | null | undefined): string {
  // Collapse every run of whitespace to one ASCII space, then trim and casefold.
  // This must match public.normalize_chapter() in Postgres exactly. A previous
  // version used only .trim(), which strips U+00A0 while Postgres btrim() does
  // NOT — so a chapter ending in a non-breaking space (trivially pasted on an
  // iPhone) showed as locked in the UI while the RPC published its entries.
  return (chapter ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** True when two chapter names refer to the same chapter for privacy purposes. */
export function isSameChapter(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeChapter(a);
  return na !== '' && na === normalizeChapter(b);
}

/** True when `chapter` is covered by the profile's private_chapters list. */
export function isChapterPrivate(
  privateChapters: readonly string[] | null | undefined,
  chapter: string | null | undefined
): boolean {
  return (privateChapters ?? []).some((c) => isSameChapter(c, chapter));
}

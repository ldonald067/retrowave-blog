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
/**
 * True when saving an edit moves an entry out of a private chapter and onto the
 * owner's public page.
 *
 * There is no chapter table, so "renaming a chapter" means retyping the name on
 * each entry. get_public_profile hides an entry whose chapter is in
 * private_chapters and nothing else, so retyping "Therapy" as "Therapy 2026" —
 * or clearing the chapter outright — publishes the entry the moment it saves.
 * The rename stays allowed (it is a real content move, per
 * 20260729030000_chapter_privacy_normalized_match.sql); this only reports the
 * transition so the UI can confirm it first.
 *
 * Deliberately NOT reported: flipping is_private from true to false. That is an
 * explicit two-state toggle the user just operated, so confirming it would ask
 * twice about a choice already made.
 */
export function chapterChangeRepublishes(args: {
  privateChapters: readonly string[] | null | undefined;
  previousChapter: string | null | undefined;
  nextChapter: string | null | undefined;
  nextIsPrivate: boolean;
  profileIsPublic: boolean;
}): boolean {
  const { privateChapters, previousChapter, nextChapter, nextIsPrivate, profileIsPublic } = args;

  // An entry the public page never serves cannot be republished by a rename:
  // a private profile has no public page, and is_private outranks the chapter
  // rule in get_public_profile.
  if (!profileIsPublic || nextIsPrivate) return false;

  // Normalized, so a case or whitespace variant is not a rename at all — the
  // server still treats it as the same private chapter.
  if (isSameChapter(previousChapter, nextChapter)) return false;

  return (
    isChapterPrivate(privateChapters, previousChapter) &&
    !isChapterPrivate(privateChapters, nextChapter)
  );
}

/**
 * What an owner should be told about an entry's visibility.
 *
 * `is_private` alone is not the answer: get_public_profile also hides a public
 * entry whose chapter is in private_chapters. Reporting that entry as plainly
 * "public" is wrong twice over — it is not on the public page, and the owner
 * gets no hint that renaming the chapter will put it there.
 *
 * The entry's own flag wins when both apply, since that is the choice the owner
 * made about this entry and it survives any rename.
 *
 * Deliberately ignores whether the profile is public. An entry on a private
 * profile keeps its own setting, which is what takes effect the moment the page
 * goes public; the chapter rule is a separate layer that can quietly change.
 */
export type EntryVisibility = 'private' | 'hidden-by-chapter' | 'public';

export function entryVisibility(
  isPrivate: boolean | null | undefined,
  chapter: string | null | undefined,
  privateChapters: readonly string[] | null | undefined
): EntryVisibility {
  if (isPrivate) return 'private';
  return isChapterPrivate(privateChapters, chapter) ? 'hidden-by-chapter' : 'public';
}

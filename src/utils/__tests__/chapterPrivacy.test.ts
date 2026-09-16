import { describe, it, expect } from 'vitest';
import {
  normalizeChapter,
  isSameChapter,
  isChapterPrivate,
  chapterChangeRepublishes,
  entryVisibility,
} from '../chapterPrivacy';

describe('chapterPrivacy', () => {
  it('normalizes case and surrounding whitespace', () => {
    expect(normalizeChapter('  Therapy ')).toBe('therapy');
    expect(normalizeChapter(null)).toBe('');
    expect(normalizeChapter(undefined)).toBe('');
  });

  it('strips Unicode whitespace, matching public.normalize_chapter()', () => {
    // A trailing non-breaking space is trivially introduced by pasting text on
    // an iPhone. JS .trim() strips it but Postgres btrim() does NOT, so an
    // earlier version of this pair disagreed: the UI showed the chapter locked
    // while the RPC published its entries. Both sides now collapse all Unicode
    // whitespace. Verified against the live database.
    expect(normalizeChapter('Therapy ')).toBe('therapy'); // NBSP
    expect(normalizeChapter(' Therapy ')).toBe('therapy'); // thin space
    expect(normalizeChapter('The rapy')).toBe('the rapy'); // internal, collapsed
    expect(normalizeChapter('a　 b')).toBe('a b'); // runs collapse to one
    expect(isChapterPrivate(['Therapy'], 'Therapy ')).toBe(true);
  });

  it('treats case and whitespace variants as the same chapter', () => {
    // The exposure this guards: chapters are free text typed per entry, so a
    // user retyping "Therapy" as "therapy" used to silently publish an entry
    // the chapter rule was hiding.
    expect(isSameChapter('Therapy', 'therapy')).toBe(true);
    expect(isSameChapter(' Therapy ', 'THERAPY')).toBe(true);
  });

  it('does not treat genuinely different chapters as the same', () => {
    expect(isSameChapter('Therapy', 'Therapy 2026')).toBe(false);
    expect(isSameChapter('Therapy', 'Therapyy')).toBe(false);
  });

  it('never matches on empty or missing names', () => {
    // Otherwise an untitled chapter would collide with every other blank.
    expect(isSameChapter('', '')).toBe(false);
    expect(isSameChapter(null, null)).toBe(false);
    expect(isSameChapter('   ', 'Therapy')).toBe(false);
  });

  it('detects a private chapter regardless of how it was typed', () => {
    const priv = ['Therapy', 'Late Night Thoughts'];
    expect(isChapterPrivate(priv, 'therapy')).toBe(true);
    expect(isChapterPrivate(priv, '  LATE night thoughts')).toBe(true);
    expect(isChapterPrivate(priv, 'Therapy 2026')).toBe(false);
    expect(isChapterPrivate(priv, null)).toBe(false);
    expect(isChapterPrivate([], 'Therapy')).toBe(false);
    expect(isChapterPrivate(undefined, 'Therapy')).toBe(false);
  });
});

describe('chapterChangeRepublishes', () => {
  const priv = ['Therapy'];
  const base = {
    privateChapters: priv,
    previousChapter: 'Therapy',
    nextChapter: 'Therapy 2026',
    nextIsPrivate: false,
    profileIsPublic: true,
  };

  it('reports a rename that moves an entry out of a private chapter', () => {
    expect(chapterChangeRepublishes(base)).toBe(true);
  });

  it('reports clearing the chapter, which publishes just as surely', () => {
    // No chapter means get_public_profile has nothing to match against
    // private_chapters, so the entry is served.
    expect(chapterChangeRepublishes({ ...base, nextChapter: null })).toBe(true);
    expect(chapterChangeRepublishes({ ...base, nextChapter: '   ' })).toBe(true);
  });

  it('stays silent when the entry itself is saved private', () => {
    // is_private outranks the chapter rule, so nothing becomes visible.
    expect(chapterChangeRepublishes({ ...base, nextIsPrivate: true })).toBe(false);
  });

  it('stays silent when the journal has no public page', () => {
    expect(chapterChangeRepublishes({ ...base, profileIsPublic: false })).toBe(false);
  });

  it('stays silent on a case or whitespace variant of the same chapter', () => {
    // The server normalizes, so these are not renames and publish nothing.
    expect(chapterChangeRepublishes({ ...base, nextChapter: 'therapy' })).toBe(false);
    expect(chapterChangeRepublishes({ ...base, nextChapter: '  THERAPY  ' })).toBe(false);
  });

  it('stays silent when the new chapter is also private', () => {
    expect(
      chapterChangeRepublishes({
        ...base,
        privateChapters: ['Therapy', 'Therapy 2026'],
      })
    ).toBe(false);
  });

  it('stays silent when the entry was never in a private chapter', () => {
    // Already public, so saving changes nothing about who can see it.
    expect(chapterChangeRepublishes({ ...base, previousChapter: 'Recipes' })).toBe(false);
    expect(chapterChangeRepublishes({ ...base, previousChapter: null })).toBe(false);
  });
});

describe('entryVisibility', () => {
  it('reports a public entry in a private chapter as hidden by that chapter', () => {
    // The exact case that read "public" while get_public_profile served it 0 times.
    expect(entryVisibility(false, 'summer 2026', ['summer 2026'])).toBe('hidden-by-chapter');
  });

  it('matches the chapter the way the server does', () => {
    expect(entryVisibility(false, '  SUMMER 2026 ', ['summer 2026'])).toBe('hidden-by-chapter');
  });

  it("lets the entry's own flag win over its chapter", () => {
    expect(entryVisibility(true, 'summer 2026', ['summer 2026'])).toBe('private');
    expect(entryVisibility(true, null, [])).toBe('private');
  });

  it('reports public only when nothing hides the entry', () => {
    expect(entryVisibility(false, 'summer 2026 v2', ['summer 2026'])).toBe('public');
    expect(entryVisibility(false, null, ['summer 2026'])).toBe('public');
    expect(entryVisibility(false, 'summer 2026', undefined)).toBe('public');
  });
});

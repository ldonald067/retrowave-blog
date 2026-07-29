import { describe, it, expect } from 'vitest';
import { normalizeChapter, isSameChapter, isChapterPrivate } from '../chapterPrivacy';

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

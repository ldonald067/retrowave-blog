import { describe, it, expect } from 'vitest';
import {
  validatePostInput,
  validateEmbeddedLinks,
  hasValidationErrors,
  validateProfileInput,
  POST_LIMITS,
  PROFILE_LIMITS,
} from '../validation';

describe('validatePostInput', () => {
  it('returns no errors for valid full input', () => {
    const errors = validatePostInput({
      title: 'My Post',
      content: 'Hello world',
      author: 'xanga_kid',
      mood: 'happy',
      music: 'Fall Out Boy - Sugar',
    });
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it('only validates fields present in input (partial update)', () => {
    // Updating just mood should not trigger title/content required errors
    const errors = validatePostInput({ mood: 'sad' });
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it('rejects empty title', () => {
    const errors = validatePostInput({ title: '' });
    expect(errors.title).toBe('Title is required');
  });

  it('rejects whitespace-only title', () => {
    const errors = validatePostInput({ title: '   ' });
    expect(errors.title).toBe('Title is required');
  });

  it('rejects title exceeding max length', () => {
    const errors = validatePostInput({ title: 'x'.repeat(POST_LIMITS.title.max + 1) });
    expect(errors.title).toContain(`${POST_LIMITS.title.max}`);
  });

  it('rejects empty content', () => {
    const errors = validatePostInput({ content: '' });
    expect(errors.content).toBe('Post content is required');
  });

  it('rejects content exceeding max length', () => {
    const errors = validatePostInput({ content: 'x'.repeat(POST_LIMITS.content.max + 1) });
    expect(errors.content).toContain('50,000');
  });

  it('rejects author exceeding max length', () => {
    const errors = validatePostInput({ author: 'x'.repeat(POST_LIMITS.author.max + 1) });
    expect(errors.author).toContain(`${POST_LIMITS.author.max}`);
  });

  it('rejects mood exceeding max length', () => {
    const errors = validatePostInput({ mood: 'x'.repeat(POST_LIMITS.mood.max + 1) });
    expect(errors.mood).toContain(`${POST_LIMITS.mood.max}`);
  });

  it('rejects music exceeding max length', () => {
    const errors = validatePostInput({ music: 'x'.repeat(POST_LIMITS.music.max + 1) });
    expect(errors.music).toContain(`${POST_LIMITS.music.max}`);
  });
});

describe('validateEmbeddedLinks', () => {
  it('returns null for null/undefined', () => {
    expect(validateEmbeddedLinks(null)).toBeNull();
    expect(validateEmbeddedLinks(undefined)).toBeNull();
  });

  it('rejects non-array value', () => {
    expect(validateEmbeddedLinks('not an array')).toContain('must be an array');
  });

  it('accepts empty array', () => {
    expect(validateEmbeddedLinks([])).toBeNull();
  });

  it('accepts valid link objects', () => {
    expect(validateEmbeddedLinks([{ url: 'https://example.com', title: 'Example' }])).toBeNull();
  });

  it('rejects non-object items', () => {
    expect(validateEmbeddedLinks(['not an object'])).toContain('[0] must be a link preview object');
  });

  it('rejects items without url', () => {
    expect(validateEmbeddedLinks([{ title: 'no url' }])).toContain('[0].url is required');
  });

  it('rejects javascript: URLs (XSS prevention)', () => {
    // eslint-disable-next-line no-script-url
    expect(validateEmbeddedLinks([{ url: 'javascript:alert(1)' }])).toContain('http or https');
  });

  it('rejects data: URLs', () => {
    expect(validateEmbeddedLinks([{ url: 'data:text/html,<h1>hi</h1>' }])).toContain(
      'http or https',
    );
  });
});

describe('validateProfileInput', () => {
  it('returns no errors for valid input', () => {
    const errors = validateProfileInput({ display_name: 'xXx_emo_xXx', bio: 'luv MCR' });
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it('rejects display_name exceeding max', () => {
    const errors = validateProfileInput({
      display_name: 'x'.repeat(PROFILE_LIMITS.display_name.max + 1),
    });
    expect(errors.display_name).toContain(`${PROFILE_LIMITS.display_name.max}`);
  });

  it('rejects bio exceeding max', () => {
    const errors = validateProfileInput({ bio: 'x'.repeat(PROFILE_LIMITS.bio.max + 1) });
    expect(errors.bio).toContain(`${PROFILE_LIMITS.bio.max}`);
  });

  it('rejects empty username', () => {
    const errors = validateProfileInput({ username: '' });
    expect(errors.username).toBe('Username is required');
  });

  it('ignores fields not in input', () => {
    const errors = validateProfileInput({ display_name: 'ok' });
    expect(errors.bio).toBeUndefined();
    expect(errors.username).toBeUndefined();
  });
});

describe('hasValidationErrors', () => {
  it('returns false for empty object', () => {
    expect(hasValidationErrors({})).toBe(false);
  });

  it('returns true when errors present', () => {
    expect(hasValidationErrors({ title: 'bad' })).toBe(true);
  });
});

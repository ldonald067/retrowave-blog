import { describe, it, expect } from 'vitest';
import { MIN_AGE, CURRENT_YEAR, VALIDATION, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants';

describe('constants', () => {
  it('MIN_AGE is 13 for COPPA compliance', () => {
    expect(MIN_AGE).toBe(13);
  });

  it('CURRENT_YEAR is a reasonable year', () => {
    expect(CURRENT_YEAR).toBeGreaterThanOrEqual(2024);
    expect(CURRENT_YEAR).toBeLessThanOrEqual(2100);
  });

  it('VALIDATION has correct display name limits', () => {
    expect(VALIDATION.displayName.maxLength).toBe(50);
    expect(VALIDATION.displayName.minLength).toBe(1);
  });

  it('VALIDATION has correct bio limit', () => {
    expect(VALIDATION.bio.maxLength).toBe(500);
  });

  it('VALIDATION email pattern matches valid emails', () => {
    expect(VALIDATION.email.pattern.test('user@example.com')).toBe(true);
    expect(VALIDATION.email.pattern.test('a@b.co')).toBe(true);
  });

  it('VALIDATION email pattern rejects invalid emails', () => {
    expect(VALIDATION.email.pattern.test('')).toBe(false);
    expect(VALIDATION.email.pattern.test('nope')).toBe(false);
    expect(VALIDATION.email.pattern.test('user@')).toBe(false);
    expect(VALIDATION.email.pattern.test('@example.com')).toBe(false);
  });

  it('ERROR_MESSAGES includes auth and profile messages', () => {
    expect(ERROR_MESSAGES.auth.emailRequired).toBeTruthy();
    expect(ERROR_MESSAGES.auth.underage).toContain('13');
    expect(ERROR_MESSAGES.profile.displayNameTooLong).toContain('50');
    expect(ERROR_MESSAGES.profile.bioTooLong).toContain('500');
  });

  it('SUCCESS_MESSAGES includes expected keys', () => {
    expect(SUCCESS_MESSAGES.auth.magicLinkSent).toBeTruthy();
    expect(SUCCESS_MESSAGES.profile.updated).toBeTruthy();
    expect(SUCCESS_MESSAGES.post.created).toBeTruthy();
    expect(SUCCESS_MESSAGES.post.deleted).toBeTruthy();
  });
});

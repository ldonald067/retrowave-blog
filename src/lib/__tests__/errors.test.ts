import { describe, it, expect, vi } from 'vitest';
import { toUserMessage, POSTGREST_CODES } from '../errors';

describe('toUserMessage', () => {
  it('returns fallback for falsy input', () => {
    expect(toUserMessage(null)).toBe('Something went wrong. Please try again.');
    expect(toUserMessage(undefined)).toBe('Something went wrong. Please try again.');
    expect(toUserMessage('')).toBe('Something went wrong. Please try again.');
  });

  it('maps PostgREST error codes', () => {
    expect(toUserMessage({ code: '23505' })).toBe('This record already exists.');
    expect(toUserMessage({ code: '42501' })).toBe(
      'You do not have permission to perform this action.'
    );
    expect(toUserMessage({ code: 'PGRST116' })).toBe('The requested record was not found.');
  });

  it('maps auth error messages', () => {
    expect(toUserMessage(new Error('invalid login credentials'))).toBe(
      'Incorrect email or password.'
    );
    expect(toUserMessage(new Error('email not confirmed'))).toBe(
      'Please verify your email before signing in.'
    );
    expect(toUserMessage(new Error('user already registered'))).toBe(
      'An account with this email already exists.'
    );
  });

  it('explains a reset to the current password instead of "something went wrong"', () => {
    // Supabase's same_password error, as it arrives from updateUser.
    expect(
      toUserMessage({
        name: 'AuthApiError',
        status: 422,
        code: 'same_password',
        message: 'New password should be different from the old password.',
      })
    ).toBe('Your new password must be different from your current one.');
  });

  it('maps network errors', () => {
    expect(toUserMessage(new Error('Failed to fetch'))).toBe(
      'Could not reach the server. Please check your connection.'
    );
    expect(toUserMessage(new Error('network error'))).toBe(
      'Network error. Please check your connection.'
    );
  });

  it('maps jwt/session errors', () => {
    expect(toUserMessage(new Error('jwt expired'))).toBe(
      'Your session has expired. Please sign in again.'
    );
  });

  it('maps rate limit errors', () => {
    expect(toUserMessage(new Error('rate limit exceeded'))).toBe(
      'Too many requests. Please wait a moment and try again.'
    );
  });

  it('never leaks internal details (relation does not exist)', () => {
    const msg = toUserMessage(new Error('relation "posts" does not exist'));
    expect(msg).not.toContain('relation');
    expect(msg).not.toContain('posts');
    expect(msg).toContain('contact support');
  });

  it('handles string errors', () => {
    expect(toUserMessage('invalid login credentials')).toBe('Incorrect email or password.');
  });

  it('handles unknown object with message', () => {
    expect(toUserMessage({ message: 'jwt expired' })).toBe(
      'Your session has expired. Please sign in again.'
    );
  });

  it('falls back for unrecognized messages', () => {
    expect(toUserMessage(new Error('xyzzy'))).toBe('Something went wrong. Please try again.');
  });

  it('POSTGREST_CODES is a non-empty record', () => {
    expect(Object.keys(POSTGREST_CODES).length).toBeGreaterThan(0);
  });

  it('keeps the date when a username change is still in cooldown', () => {
    // The code alone (23514) would map to the generic constraint message and
    // throw away the one thing the person needs to know.
    expect(toUserMessage({ code: '23514', message: 'username_cooldown:2026-10-20' })).toBe(
      'You can change your username again on October 20.'
    );
  });

  it('reads the cooldown date as a local day, not UTC midnight', () => {
    // `new Date('2026-01-01')` is UTC midnight, which is Dec 31 in any
    // timezone west of Greenwich.
    expect(toUserMessage(new Error('username_cooldown:2026-01-01'))).toBe(
      'You can change your username again on January 1.'
    );
  });

  it('formats the cooldown from the full UTC instant, not a UTC calendar date', () => {
    // Finding 74: 21:00 UTC on Oct 22 is already Oct 23 east of UTC. The date
    // shown must come from the instant, in the device's own timezone.
    const spy = vi.spyOn(Date.prototype, 'toLocaleDateString');
    const message = toUserMessage({
      code: '23514',
      message: 'username_cooldown:2026-10-22T21:00:00Z',
    });
    expect(message).toMatch(/^You can change your username again on .+\.$/);
    const formatted = spy.mock.contexts[spy.mock.contexts.length - 1] as Date;
    expect(formatted.getTime()).toBe(Date.parse('2026-10-22T21:00:00Z'));
    spy.mockRestore();
  });

  it('explains a sign-up the username hook refused', () => {
    expect(toUserMessage(new Error('Usernames are 3-30 lowercase letters, numbers, _ or -.'))).toBe(
      "That username isn't allowed. Try another one."
    );
  });
});

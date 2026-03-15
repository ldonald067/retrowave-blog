import { describe, it, expect } from 'vitest';
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
      'You do not have permission to perform this action.',
    );
    expect(toUserMessage({ code: 'PGRST116' })).toBe('The requested record was not found.');
  });

  it('maps auth error messages', () => {
    expect(toUserMessage(new Error('invalid login credentials'))).toBe(
      'Incorrect email or password.',
    );
    expect(toUserMessage(new Error('email not confirmed'))).toBe(
      'Please verify your email before signing in.',
    );
    expect(toUserMessage(new Error('user already registered'))).toBe(
      'An account with this email already exists.',
    );
  });

  it('maps network errors', () => {
    expect(toUserMessage(new Error('Failed to fetch'))).toBe(
      'Could not reach the server. Please check your connection.',
    );
    expect(toUserMessage(new Error('network error'))).toBe(
      'Network error. Please check your connection.',
    );
  });

  it('maps jwt/session errors', () => {
    expect(toUserMessage(new Error('jwt expired'))).toBe(
      'Your session has expired. Please sign in again.',
    );
  });

  it('maps rate limit errors', () => {
    expect(toUserMessage(new Error('rate limit exceeded'))).toBe(
      'Too many requests. Please wait a moment and try again.',
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
      'Your session has expired. Please sign in again.',
    );
  });

  it('falls back for unrecognized messages', () => {
    expect(toUserMessage(new Error('xyzzy'))).toBe('Something went wrong. Please try again.');
  });

  it('POSTGREST_CODES is a non-empty record', () => {
    expect(Object.keys(POSTGREST_CODES).length).toBeGreaterThan(0);
  });
});

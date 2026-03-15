import { describe, it, expect } from 'vitest';
import { formatDate, formatRelativeDate } from '../formatDate';

describe('formatDate', () => {
  it('returns empty string for falsy input', () => {
    expect(formatDate('')).toBe('');
  });

  it('formats ISO string with default format', () => {
    // Use noon UTC to avoid midnight rolling to previous day in non-UTC timezones
    const result = formatDate('2025-12-25T12:00:00Z');
    expect(result).toBe('Dec 25, 2025');
  });

  it('accepts custom format string', () => {
    const result = formatDate('2025-06-15T14:30:00Z', 'yyyy-MM-dd');
    expect(result).toBe('2025-06-15');
  });

  it('formats time with h:mm a pattern', () => {
    // Note: output depends on timezone; just verify it doesn't throw
    const result = formatDate('2025-06-15T14:30:00Z', 'h:mm a');
    expect(result).toBeTruthy();
  });

  it('handles Date object input', () => {
    // Use noon UTC to avoid midnight rolling to previous year in non-UTC timezones
    const result = formatDate(new Date('2025-01-01T12:00:00Z'));
    expect(result).toContain('2025');
  });
});

describe('formatRelativeDate', () => {
  it('returns empty string for falsy input', () => {
    expect(formatRelativeDate('')).toBe('');
  });

  it('returns a relative string with suffix', () => {
    const recent = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
    const result = formatRelativeDate(recent);
    expect(result).toContain('ago');
  });

  it('handles old dates', () => {
    const result = formatRelativeDate('2020-01-01T00:00:00Z');
    expect(result).toContain('ago');
    expect(result).toContain('year');
  });
});

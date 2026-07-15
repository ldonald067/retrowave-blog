import { describe, expect, it } from 'vitest';
import { buildReportEmailHref } from '../reporting';

describe('reporting helpers', () => {
  it('builds encoded mailto report links', () => {
    const href = buildReportEmailHref('Report: "Title"', 'Line one\nLine two');

    expect(href).toContain('mailto:support@retrowaveblog.com?');
    expect(href).toContain('subject=Report%3A%20%22Title%22');
    expect(href).toContain('body=Line%20one%0ALine%20two');
  });
});

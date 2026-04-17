import { BLOG_OWNER_EMAIL } from './constants';

export function buildReportEmailHref(subject: string, body?: string): string {
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${BLOG_OWNER_EMAIL}?${params.join('&')}`;
}

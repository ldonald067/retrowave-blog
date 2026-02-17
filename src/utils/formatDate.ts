import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(date: string | Date, formatStr = 'MMM dd, yyyy'): string {
  if (!date) return '';
  return format(new Date(date), formatStr);
}

export function formatRelativeDate(date: string | Date): string {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

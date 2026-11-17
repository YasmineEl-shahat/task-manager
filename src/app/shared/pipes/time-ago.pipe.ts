import { Pipe, PipeTransform } from '@angular/core';

/**
 * Transforms an ISO date string or Date object into a human-readable relative time string.
 *
 * Examples:
 *  - "Just now" (< 60 seconds)
 *  - "5m ago" (< 60 minutes)
 *  - "2h ago" (< 24 hours)
 *  - "Yesterday" (between 24h and 48h)
 *  - "3d ago" (< 7 days)
 *  - "Nov 14, 2026" (>= 7 days)
 */
@Pipe({
  name: 'timeAgo',
  standalone: true,
})
export class TimeAgoPipe implements PipeTransform {
  transform(
    value: string | Date | null | undefined,
    referenceDate: Date = new Date(),
    locale: 'en' | 'ar' = 'en',
  ): string {
    if (!value) return '';

    const date = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(date.getTime())) return '';

    const diffInSeconds = Math.floor((referenceDate.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return locale === 'ar' ? 'الآن' : 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return locale === 'ar' ? `منذ ${diffInMinutes}د` : `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return locale === 'ar' ? `منذ ${diffInHours}س` : `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
      return locale === 'ar' ? 'أمس' : 'Yesterday';
    }

    if (diffInDays < 7) {
      return locale === 'ar' ? `منذ ${diffInDays}ي` : `${diffInDays}d ago`;
    }

    return date.toLocaleDateString(locale === 'ar' ? 'ar' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== referenceDate.getFullYear() ? 'numeric' : undefined,
    });
  }
}

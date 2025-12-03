/**
 * Centralized date utilities to ensure consistent UTC date handling across the app.
 * All dates in this app are treated as UTC to avoid timezone-related issues.
 */

/**
 * Ensure we have a Date object (handles string dates from API responses)
 */
function ensureDate(date: Date | string): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

/**
 * Format a UTC date as YYYY-MM-DD
 */
export function formatDateUTC(date: Date | string): string {
  const d = ensureDate(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a UTC date as "MMM D, YYYY" (e.g., "Dec 1, 2025")
 */
export function formatDateLongUTC(date: Date | string): string {
  const d = ensureDate(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/**
 * Format a UTC date as "MMM D" (e.g., "Dec 1")
 */
export function formatDateShortUTC(date: Date | string): string {
  const d = ensureDate(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/**
 * Parse a YYYY-MM-DD string as a UTC date
 */
export function parseDateUTC(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Create a UTC date from year, month (1-12), and day
 */
export function createDateUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Get the current year and month in UTC
 */
export function getCurrentMonthUTC(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
  };
}

/**
 * Check if two dates are the same day in UTC
 */
export function isSameDayUTC(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

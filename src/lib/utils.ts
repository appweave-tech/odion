import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, toZonedTime } from 'date-fns-tz';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export const IST = 'Asia/Kolkata';

// How far back a resident can edit their own skip marks. Server enforces it
// in markSkip/unmarkSkip; client uses it to size the "past N days" list so
// the two never drift.
export const EDIT_WINDOW_DAYS = 3;

export function todayIST(): string {
  const now = toZonedTime(new Date(), IST);
  return format(now, 'yyyy-MM-dd', { timeZone: IST });
}

export function formatISTDate(d: Date | string, fmt = 'EEE, d MMM yyyy'): string {
  let date: Date;
  if (d instanceof Date) date = d;
  else if (/^\d{4}-\d{2}-\d{2}$/.test(d)) date = new Date(d + 'T00:00:00');
  else date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return format(toZonedTime(date, IST), fmt, { timeZone: IST });
}

export function daysAgoIST(n: number): string {
  // Anchor on today-in-IST as a string, then walk back n full days. Using
  // UTC midnight for the round-trip is safe because IST has no DST — the
  // calendar-date label never shifts mid-subtraction. The old approach
  // (`new Date().setUTCDate(...)`) drifted ±1 day around IST midnight
  // because it did UTC-day arithmetic but tried to label with IST.
  const today = todayIST();
  const t = new Date(today + 'T00:00:00Z').getTime() - n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

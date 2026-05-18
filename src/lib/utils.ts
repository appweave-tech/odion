import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, toZonedTime } from 'date-fns-tz';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export const IST = 'Asia/Kolkata';

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
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return format(toZonedTime(d, IST), 'yyyy-MM-dd', { timeZone: IST });
}

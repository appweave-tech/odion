import 'server-only';
import { listTodaySkips } from './skip';
import { formatISTDate, todayIST } from '@/lib/utils';

export async function renderEodDigest(): Promise<{ text: string; count: number; date: string }> {
  const date = todayIST();
  const skips = await listTodaySkips();
  const lines = [
    `Garbage skipped today (${formatISTDate(date, 'EEE, d MMM')}):`,
  ];
  if (skips.length === 0) {
    lines.push('  No skips reported. 🎉');
  } else {
    for (const s of skips) lines.push(`• ${s.villa_label}`);
  }
  lines.push(``);
  lines.push(`Total: ${skips.length} villa${skips.length === 1 ? '' : 's'}`);
  lines.push(`Log a skip → odion.appweave.tech/garbage`);
  return { text: lines.join('\n'), count: skips.length, date };
}

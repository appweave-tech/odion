import crypto from 'node:crypto';

export type ParsedMessage = {
  ts: Date;
  sender: string;
  body: string;
  content_hash: string;
};

// iOS WhatsApp export header line:
//   [14/09/25, 12:52:08 PM] ~ Kumar: message body...
// Date is DD/MM/YY, time is 12h with AM/PM (IST for our group).
const HEADER = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2}), (\d{1,2}):(\d{2}):(\d{2})\s?(AM|PM)\]\s(.+?):\s?(.*)$/i;

// Lines we never want to keep (group lifecycle noise).
const SYSTEM_PHRASES = [
  'Messages and calls are end-to-end encrypted',
  'created this group',
  'joined using a group link',
  'added you',
  'You were added',
  'changed the group description',
  'changed this group',
  'changed the subject',
  'changed their phone number',
];

// "‎" U+200E left-to-right mark sneaks into iOS exports; strip it.
const LTR = /‎/g;

const IST_OFFSET_MIN = 330; // +05:30

function toUtcDate(d: number, m: number, y2: number, h: number, mi: number, s: number, ampm: string): Date {
  const year = 2000 + y2;
  let hour = h % 12;
  if (ampm.toUpperCase() === 'PM') hour += 12;
  // Build IST wall-clock as UTC ms, then subtract the IST offset to get true UTC.
  const ist = Date.UTC(year, m - 1, d, hour, mi, s);
  return new Date(ist - IST_OFFSET_MIN * 60_000);
}

function hashMessage(ts: Date, sender: string, body: string): string {
  return crypto
    .createHash('sha256')
    .update(`${ts.toISOString()}|${sender}|${body}`)
    .digest('hex');
}

export function parseWhatsAppChat(text: string): ParsedMessage[] {
  const lines = text.replace(LTR, '').split(/\r?\n/);
  const out: ParsedMessage[] = [];
  let cur: ParsedMessage | null = null;

  for (const raw of lines) {
    const m = HEADER.exec(raw);
    if (m) {
      if (cur) out.push(cur);
      const [, dd, mm, yy, hh, mi, ss, ampm, sender, body] = m;
      const ts = toUtcDate(+dd, +mm, +yy, +hh, +mi, +ss, ampm);
      const trimmedBody = (body ?? '').trim();
      if (SYSTEM_PHRASES.some((p) => trimmedBody.includes(p))) {
        cur = null;
        continue;
      }
      cur = {
        ts,
        sender: sender.replace(/^~\s*/, '').trim(),
        body: trimmedBody,
        content_hash: '',
      };
    } else if (cur) {
      // Continuation of previous message.
      const extra = raw.trim();
      if (extra) cur.body = cur.body ? `${cur.body}\n${extra}` : extra;
    }
  }
  if (cur) out.push(cur);

  // Filter out empty / pure-attachment lines, hash the rest.
  const cleaned: ParsedMessage[] = [];
  for (const msg of out) {
    if (!msg.body) continue;
    if (/^(image|video|sticker|audio|gif|document|contact card|location)\s+omitted$/i.test(msg.body)) continue;
    msg.content_hash = hashMessage(msg.ts, msg.sender, msg.body);
    cleaned.push(msg);
  }
  return cleaned;
}

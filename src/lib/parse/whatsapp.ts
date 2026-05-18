import crypto from 'node:crypto';

export type ParsedMessage = {
  ts: Date;
  sender: string;
  body: string;
  content_hash: string;
};

// Two WhatsApp export header formats:
//   iOS:     [14/09/25, 12:52:08 PM] ~ Kumar: message body...
//   Android: 14/09/25, 12:52 - Kumar: message body...
// Year may be 2 or 4 digits depending on locale/version. Seconds optional. AM/PM optional (Android can be 24h).
const HEADER_IOS =
  /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}), (\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM)?\]\s(.+?):\s?(.*)$/i;
const HEADER_ANDROID =
  /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?(AM|PM))?\s-\s(.+?):\s?(.*)$/i;

// System messages have no `Sender: body` pattern — bracketed-timestamp followed by free text.
// Catch them structurally: bracket header without a colon-separated body, OR Android dash-form
// without a colon. Plus a fallback phrase list for stray cases.
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
  'left',
  'removed',
  'changed to admin',
  'Disappearing messages',
  'This message was deleted',
  'Tap to learn more',
  'Missed voice call',
  'Missed video call',
];

// LTR/RTL marks, zero-width chars, BOM — iOS injects these and they break dedup.
const INVISIBLE = /[​-‏‪-‮﻿]/g;

const IST_OFFSET_MIN = 330; // +05:30. India doesn't observe DST.

// Phone numbers — Indian 10-digit mobiles (start 6-9), 11-12 with country code, generic 8-15 digit blocks.
const PHONE_RE = /\b(?:\+?91[\s-]?)?[6-9]\d{9}\b|\b\d{10,12}\b/g;
const EMAIL_RE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;

function redactPII(body: string): string {
  return body.replace(PHONE_RE, '[phone]').replace(EMAIL_RE, '[email]');
}

function toUtcDate(d: number, m: number, y: number, h: number, mi: number, s: number, ampm: string): Date {
  const year = y < 100 ? 2000 + y : y;
  let hour = h;
  if (ampm) {
    hour = h % 12;
    if (ampm.toUpperCase() === 'PM') hour += 12;
  }
  // Build IST wall-clock as UTC ms, then subtract the IST offset to get true UTC.
  const ist = Date.UTC(year, m - 1, d, hour, mi, s);
  return new Date(ist - IST_OFFSET_MIN * 60_000);
}

// Normalize body for stable hashing: NFKC + collapse whitespace + lowercase sender.
// Two exports of the same chat that differ only in invisible chars or emoji presentation
// must produce the same hash.
function hashMessage(ts: Date, sender: string, body: string): string {
  const normBody = body.normalize('NFKC').replace(/\s+/g, ' ').trim();
  const normSender = sender.normalize('NFKC').toLowerCase().trim();
  const epoch = Math.floor(ts.getTime() / 1000); // second precision; ignores sub-second drift
  return crypto.createHash('sha256').update(`${epoch}|${normSender}|${normBody}`).digest('hex');
}

// Cap classifier input length — bounds regex backtracking on multi-line forwarded essays.
const MAX_BODY_LEN = 2000;

export function parseWhatsAppChat(text: string): ParsedMessage[] {
  // Strip invisibles up front so every downstream comparison is on clean text.
  const lines = text.replace(INVISIBLE, '').split(/\r?\n/);
  const out: ParsedMessage[] = [];
  let cur: ParsedMessage | null = null;

  for (const raw of lines) {
    const m = HEADER_IOS.exec(raw) ?? HEADER_ANDROID.exec(raw);
    if (m) {
      if (cur) out.push(cur);
      const [, dd, mm, yy, hh, mi, ss, ampm, sender, body] = m;
      const ts = toUtcDate(+dd, +mm, +yy, +hh, +mi, +(ss || 0), ampm || '');
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
      const extra = raw.trim();
      if (extra) cur.body = cur.body ? `${cur.body}\n${extra}` : extra;
    }
  }
  if (cur) out.push(cur);

  const cleaned: ParsedMessage[] = [];
  for (const msg of out) {
    if (!msg.body) continue;
    // Drop media-omitted placeholders in both common renderings.
    if (/^(image|video|sticker|audio|gif|document|contact card|location)\s+omitted$/i.test(msg.body)) continue;
    if (/^<\s*media\s+omitted\s*>$/i.test(msg.body)) continue;
    if (/^null$/i.test(msg.body)) continue;

    // Redact PII before storing.
    msg.body = redactPII(msg.body).slice(0, MAX_BODY_LEN);
    msg.content_hash = hashMessage(msg.ts, msg.sender, msg.body);
    cleaned.push(msg);
  }
  return cleaned;
}

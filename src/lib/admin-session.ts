import 'server-only';
import crypto from 'node:crypto';

// HMAC-signed admin session token.
// Format: <random_token>.<hmac_first_16_chars>
// Verification is constant-time. Old `=1` cookies fail verification, forcing re-login.
//
// SECRET selection:
// 1. ADMIN_SESSION_SECRET env (preferred — independent rotation)
// 2. derived from ADMIN_PASSCODE (auto fallback; sessions invalidate when passcode rotates,
//    which is the correct behaviour anyway)

function getSecret(): string {
  const explicit = process.env.ADMIN_SESSION_SECRET;
  if (explicit) return explicit;
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) throw new Error('ADMIN_PASSCODE or ADMIN_SESSION_SECRET must be set');
  return crypto.createHash('sha256').update(passcode + ':odion-session:v1').digest('base64url');
}

export function signSession(): string {
  const token = crypto.randomBytes(24).toString('base64url');
  const mac = crypto
    .createHmac('sha256', getSecret())
    .update(token)
    .digest('base64url')
    .slice(0, 24);
  return `${token}.${mac}`;
}

export function verifySession(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const dot = value.indexOf('.');
  if (dot <= 0 || dot === value.length - 1) return false;
  const token = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  const expected = crypto
    .createHmac('sha256', getSecret())
    .update(token)
    .digest('base64url')
    .slice(0, 24);
  const a = Buffer.from(mac, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

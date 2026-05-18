'use server';

import { sql } from '@/lib/db';
import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

function getClientMeta() {
  const h = headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    h.get('x-real-ip') ||
    null;
  const ua = h.get('user-agent') || null;
  return { ip, ua };
}

const ADMIN_COOKIE = 'odion-admin';

export async function adminLogin(passcode: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) throw new Error('ADMIN_PASSCODE not configured');
  if (passcode !== expected) return false;
  cookies().set(ADMIN_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 12, // 12 hours
    path: '/',
  });
  revalidatePath('/garbage/admin');
  revalidatePath('/garbage/admin/villas');
  return true;
}

export async function adminLogout() {
  cookies().delete(ADMIN_COOKIE);
  revalidatePath('/garbage/admin');
}

export async function isAdmin(): Promise<boolean> {
  return cookies().get(ADMIN_COOKIE)?.value === '1';
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error('Admin auth required');
}

export async function adminVerifyVilla(villaId: string) {
  await requireAdmin();
  await sql()`UPDATE odion.villas SET verified = true WHERE id = ${villaId}`;
  const { ip, ua } = getClientMeta();
  await sql()`
    INSERT INTO odion.garbage_admin_actions (action, target_id, target_kind, ip_address, user_agent)
    VALUES ('verify_villa', ${villaId}, 'villa', ${ip}, ${ua})
  `;
  revalidatePath('/garbage/admin/villas');
}

export async function adminDeleteVilla(villaId: string) {
  await requireAdmin();
  await sql()`DELETE FROM odion.villas WHERE id = ${villaId}`;
  const { ip: ip2, ua: ua2 } = getClientMeta();
  await sql()`
    INSERT INTO odion.garbage_admin_actions (action, target_id, target_kind, ip_address, user_agent)
    VALUES ('delete_villa', ${villaId}, 'villa', ${ip2}, ${ua2})
  `;
  revalidatePath('/garbage/admin/villas');
}

export async function adminVoidEvent(eventId: string, note?: string) {
  await requireAdmin();
  const row = await sql()<{ villa_id: string; skip_date: string }[]>`
    SELECT villa_id, skip_date FROM odion.garbage_skip_events WHERE id = ${eventId} LIMIT 1
  `;
  if (row.length === 0) return;
  await sql()`
    INSERT INTO odion.garbage_skip_events
      (villa_id, skip_date, supersedes_event_id, void)
    VALUES (${row[0].villa_id}, ${row[0].skip_date}, ${eventId}, true)
  `;
  const { ip: ip3, ua: ua3 } = getClientMeta();
  await sql()`
    INSERT INTO odion.garbage_admin_actions (action, target_id, target_kind, note, ip_address, user_agent)
    VALUES ('void_event', ${eventId}, 'skip_event', ${note ?? null}, ${ip3}, ${ua3})
  `;
  revalidatePath('/garbage/history');
  revalidatePath('/garbage/today');
}

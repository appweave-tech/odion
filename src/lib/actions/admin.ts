'use server';

import { sql } from '@/lib/db';
import { cookies } from 'next/headers';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getClientMeta } from '@/lib/request';
import { signSession, verifySession } from '@/lib/admin-session';
import crypto from 'node:crypto';

const ADMIN_COOKIE = 'odion-admin';

export async function adminLogin(passcode: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) throw new Error('ADMIN_PASSCODE not configured');
  const a = Buffer.from(passcode, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  cookies().set(ADMIN_COOKIE, signSession(), {
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
  return verifySession(cookies().get(ADMIN_COOKIE)?.value);
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error('Admin auth required');
}

export async function adminVerifyVilla(villaId: string) {
  await requireAdmin();
  const { ip, ua } = getClientMeta();
  await sql().begin(async (tx) => {
    await tx`UPDATE odion.villas SET verified = true WHERE id = ${villaId}`;
    await tx`
      INSERT INTO odion.garbage_admin_actions (action, target_id, target_kind, ip_address, user_agent)
      VALUES ('verify_villa', ${villaId}, 'villa', ${ip}, ${ua})
    `;
  });
  revalidatePath('/garbage/admin/villas');
  revalidateTag('villas');
}

// Soft delete — sets deleted_at, preserves the villa row + all its skip events.
// Restore via adminRestoreVilla.
export async function adminDeleteVilla(villaId: string) {
  await requireAdmin();
  const { ip, ua } = getClientMeta();
  await sql().begin(async (tx) => {
    await tx`UPDATE odion.villas SET deleted_at = now() WHERE id = ${villaId}`;
    await tx`
      INSERT INTO odion.garbage_admin_actions (action, target_id, target_kind, ip_address, user_agent)
      VALUES ('soft_delete_villa', ${villaId}, 'villa', ${ip}, ${ua})
    `;
  });
  revalidatePath('/garbage/admin/villas');
  revalidateTag('villas');
}

export async function adminRestoreVilla(villaId: string) {
  await requireAdmin();
  const { ip, ua } = getClientMeta();
  await sql().begin(async (tx) => {
    await tx`UPDATE odion.villas SET deleted_at = NULL WHERE id = ${villaId}`;
    await tx`
      INSERT INTO odion.garbage_admin_actions (action, target_id, target_kind, ip_address, user_agent)
      VALUES ('restore_villa', ${villaId}, 'villa', ${ip}, ${ua})
    `;
  });
  revalidatePath('/garbage/admin/villas');
  revalidateTag('villas');
}

export async function adminVoidEvent(eventId: string, note?: string) {
  await requireAdmin();
  const { ip, ua } = getClientMeta();
  await sql().begin(async (tx) => {
    const row = await tx<{ villa_id: string; skip_date: string }[]>`
      SELECT villa_id, skip_date FROM odion.garbage_skip_events WHERE id = ${eventId} LIMIT 1
    `;
    if (row.length === 0) return;
    await tx`
      INSERT INTO odion.garbage_skip_events
        (villa_id, skip_date, supersedes_event_id, void, ip_address, user_agent)
      VALUES (${row[0].villa_id}, ${row[0].skip_date}, ${eventId}, true, ${ip}, ${ua})
    `;
    await tx`
      INSERT INTO odion.garbage_admin_actions (action, target_id, target_kind, note, ip_address, user_agent)
      VALUES ('void_event', ${eventId}, 'skip_event', ${note ?? null}, ${ip}, ${ua})
    `;
  });
  revalidatePath('/garbage/history');
  revalidateTag('skips');
}

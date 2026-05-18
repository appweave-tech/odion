'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { todayIST, daysAgoIST } from '@/lib/utils';
import type { SkipEventWithVilla } from '@/lib/types';

function getClientMeta() {
  const h = headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    h.get('x-real-ip') ||
    null;
  const ua = h.get('user-agent') || null;
  return { ip, ua };
}

const EDIT_WINDOW_DAYS = 7;

export type CurrentSkipForVilla = {
  skip_date: string;
  event_id: string;
};

export async function markSkip(input: {
  villaId: string;
  deviceId: string;
  date?: string;
  note?: string;
}) {
  const { villaId, deviceId } = input;
  const date = input.date ?? todayIST();
  if (!villaId || !deviceId) throw new Error('villaId and deviceId required');

  const { ip, ua } = getClientMeta();

  await sql().begin(async (tx) => {
    const existing = await tx<{ id: string; void: boolean }[]>`
      SELECT e.id, e.void
      FROM odion.garbage_skip_events_current e
      WHERE e.villa_id = ${villaId} AND e.skip_date = ${date}
      LIMIT 1
    `;
    if (existing.length > 0 && !existing[0].void) return; // idempotent

    if (existing.length > 0 && existing[0].void) {
      await tx`
        INSERT INTO odion.garbage_skip_events
          (villa_id, skip_date, reported_by_device, supersedes_event_id, void, note, ip_address, user_agent)
        VALUES (${villaId}, ${date}, ${deviceId}, ${existing[0].id}, false, ${input.note ?? null}, ${ip}, ${ua})
      `;
    } else {
      await tx`
        INSERT INTO odion.garbage_skip_events
          (villa_id, skip_date, reported_by_device, void, note, ip_address, user_agent)
        VALUES (${villaId}, ${date}, ${deviceId}, false, ${input.note ?? null}, ${ip}, ${ua})
      `;
    }
    await tx`
      UPDATE odion.devices SET last_ip = ${ip}, user_agent = COALESCE(${ua}, user_agent), last_seen = now()
      WHERE id = ${deviceId}
    `;
  });
  revalidatePath('/garbage');
  revalidatePath('/garbage/today');
  revalidatePath('/garbage/history');
}

export async function unmarkSkip(input: { villaId: string; deviceId: string; date: string }) {
  const { villaId, deviceId, date } = input;
  if (!villaId || !deviceId || !date) throw new Error('villaId, deviceId, date required');

  const existing = await sql()<{ id: string }[]>`
    SELECT id FROM odion.garbage_skip_events_current
    WHERE villa_id = ${villaId} AND skip_date = ${date} AND void = false
    LIMIT 1
  `;
  if (existing.length === 0) return;

  const { ip, ua } = getClientMeta();
  await sql()`
    INSERT INTO odion.garbage_skip_events
      (villa_id, skip_date, reported_by_device, supersedes_event_id, void, ip_address, user_agent)
    VALUES (${villaId}, ${date}, ${deviceId}, ${existing[0].id}, true, ${ip}, ${ua})
  `;
  revalidatePath('/garbage');
  revalidatePath('/garbage/today');
  revalidatePath('/garbage/history');
}

export async function listTodaySkips(): Promise<SkipEventWithVilla[]> {
  const date = todayIST();
  return sql()<SkipEventWithVilla[]>`
    SELECT e.id, e.villa_id, e.skip_date::text AS skip_date, e.reported_by_device, e.note,
           e.supersedes_event_id, e.void, e.created_at,
           v.phase AS villa_phase, v.number AS villa_number, v.label AS villa_label,
           d.name AS reporter_name
    FROM odion.garbage_skip_events_current e
    JOIN odion.villas v ON v.id = e.villa_id
    LEFT JOIN odion.devices d ON d.id = e.reported_by_device
    WHERE e.skip_date = ${date} AND e.void = false
    ORDER BY v.phase, v.number
  `;
}

export async function listSkipsLastNDays(n: number): Promise<SkipEventWithVilla[]> {
  const from = daysAgoIST(n);
  return sql()<SkipEventWithVilla[]>`
    SELECT e.id, e.villa_id, e.skip_date::text AS skip_date, e.reported_by_device, e.note,
           e.supersedes_event_id, e.void, e.created_at,
           v.phase AS villa_phase, v.number AS villa_number, v.label AS villa_label,
           d.name AS reporter_name
    FROM odion.garbage_skip_events_current e
    JOIN odion.villas v ON v.id = e.villa_id
    LEFT JOIN odion.devices d ON d.id = e.reported_by_device
    WHERE e.skip_date >= ${from} AND e.void = false
    ORDER BY e.skip_date DESC, v.phase, v.number
  `;
}

export async function getVillaSkipDates(villaId: string, daysBack = 365): Promise<string[]> {
  const from = daysAgoIST(daysBack);
  const rows = await sql()<{ skip_date: string }[]>`
    SELECT skip_date::text AS skip_date FROM odion.garbage_skip_events_current
    WHERE villa_id = ${villaId} AND void = false AND skip_date >= ${from}
    ORDER BY skip_date DESC
  `;
  return rows.map((r) => String(r.skip_date));
}

export async function getEditWindow(): Promise<{ minDate: string; maxDate: string }> {
  return { minDate: daysAgoIST(EDIT_WINDOW_DAYS), maxDate: todayIST() };
}

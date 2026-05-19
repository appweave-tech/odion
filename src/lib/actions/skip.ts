'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getClientMeta } from '@/lib/request';
import { todayIST, daysAgoIST } from '@/lib/utils';
import type { SkipEventWithVilla } from '@/lib/types';

function requireDeviceCookie(): string {
  const id = cookies().get('odion-device')?.value;
  if (!id) throw new Error('Device cookie missing — reload the page');
  return id;
}

// Trust-boundary gate: a device can only mark/unmark its own claimed villa.
async function assertDeviceOwnsVilla(deviceId: string, villaId: string) {
  const rows = await sql()<{ villa_id: string | null }[]>`
    SELECT villa_id FROM odion.devices WHERE id = ${deviceId} LIMIT 1
  `;
  if (rows.length === 0 || rows[0].villa_id !== villaId) {
    throw new Error('Device not claimed for this villa — pick your villa first');
  }
}

const EDIT_WINDOW_DAYS = 3;

export type CurrentSkipForVilla = {
  skip_date: string;
  event_id: string;
};

export async function markSkip(input: {
  villaId: string;
  date?: string;
  note?: string;
}) {
  const { villaId } = input;
  const deviceId = requireDeviceCookie();
  const date = input.date ?? todayIST();
  if (!villaId) throw new Error('villaId required');
  if (date < daysAgoIST(EDIT_WINDOW_DAYS) || date > todayIST()) {
    throw new Error('Edit window exceeded — ask admin');
  }
  await assertDeviceOwnsVilla(deviceId, villaId);

  const { ip, ua } = getClientMeta();

  try {
    await sql().begin(async (tx) => {
      // Head of the audit chain for this (villa, date), regardless of void state.
      // Querying garbage_skip_events_current would hide void heads — that masks the
      // unmark→re-mark path and the new insert collides with gse_active_uniq.
      const head = await tx<{ id: string; void: boolean }[]>`
        SELECT e.id, e.void
        FROM odion.garbage_skip_events e
        WHERE e.villa_id = ${villaId} AND e.skip_date = ${date}
          AND NOT EXISTS (
            SELECT 1 FROM odion.garbage_skip_events s
            WHERE s.supersedes_event_id = e.id
          )
        ORDER BY e.created_at DESC
        LIMIT 1
      `;
      if (head.length > 0 && !head[0].void) return; // already marked

      if (head.length > 0) {
        // Head is a void row from a previous unmark — chain the new mark off it.
        await tx`
          INSERT INTO odion.garbage_skip_events
            (villa_id, skip_date, reported_by_device, supersedes_event_id, void, note, ip_address, user_agent)
          VALUES (${villaId}, ${date}, ${deviceId}, ${head[0].id}, false, ${input.note ?? null}, ${ip}, ${ua})
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
  } catch (e: unknown) {
    // gse_active_uniq violation = a parallel call already wrote this same mark. Treat as success.
    const code = (e as { code?: string } | null)?.code;
    if (code !== '23505') throw e;
  }
  revalidatePath('/garbage');
  revalidatePath('/garbage/history');
}

export async function unmarkSkip(input: { villaId: string; date: string }) {
  const { villaId, date } = input;
  const deviceId = requireDeviceCookie();
  if (!villaId || !date) throw new Error('villaId, date required');
  if (date < daysAgoIST(EDIT_WINDOW_DAYS) || date > todayIST()) {
    throw new Error('Edit window exceeded — ask admin');
  }
  await assertDeviceOwnsVilla(deviceId, villaId);

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

'use server';

import { sql } from '@/lib/db';
import { cookies } from 'next/headers';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';

// Villa list barely changes — admin verifies/deletes/restores happen rarely,
// and findOrCreateVilla auto-creates handful per week. 5min cache is safe;
// mutations call revalidateTag(VILLAS_TAG) to bust it on demand.
const VILLAS_TAG = 'villas';
const VILLAS_REVALIDATE_S = 300;
import { getClientMeta } from '@/lib/request';
import type { Villa } from '@/lib/types';

const PHASE_ORDER = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'NGC'];
const VILLA_COLS = `id, phase, number, label, display_order, auto_created, verified, created_at, deleted_at`;

// Rate limit on auto-created villas — per device, per 24h.
// Tunable: bump if community has a real onboarding burst.
const AUTOCREATE_PER_DEVICE_DAILY = 5;

function phaseRank(p: string): number {
  const i = PHASE_ORDER.indexOf(p);
  return i === -1 ? 999 : i;
}

const _listVillasCached = unstable_cache(
  async (): Promise<Villa[]> => {
    const rows = await sql()<Villa[]>`
      SELECT id, phase, number, label, display_order, auto_created, verified, created_at, deleted_at
      FROM odion.villas
      WHERE deleted_at IS NULL
      ORDER BY phase, number
    `;
    return [...rows].sort((a, b) => {
      const r = phaseRank(a.phase) - phaseRank(b.phase);
      return r !== 0 ? r : a.number - b.number;
    });
  },
  ['villas:list:v1'],
  { revalidate: VILLAS_REVALIDATE_S, tags: [VILLAS_TAG] },
);
export async function listVillas(): Promise<Villa[]> {
  return _listVillasCached();
}

// Admin-only: includes soft-deleted villas so they can be restored.
export async function listVillasIncludingDeleted(): Promise<Villa[]> {
  const rows = await sql()<Villa[]>`
    SELECT id, phase, number, label, display_order, auto_created, verified, created_at, deleted_at
    FROM odion.villas
    ORDER BY phase, number
  `;
  return [...rows].sort((a, b) => {
    const r = phaseRank(a.phase) - phaseRank(b.phase);
    return r !== 0 ? r : a.number - b.number;
  });
}

// Cheap count for the welcome card. Keeps the first-paint payload tiny so
// /garbage can render with a single COUNT(*) instead of hauling the full
// villa list every visit.
const _villaCountCached = unstable_cache(
  async (): Promise<number> => {
    const [row] = await sql()<{ c: string }[]>`
      SELECT COUNT(*)::text AS c FROM odion.villas WHERE deleted_at IS NULL
    `;
    return Number(row.c);
  },
  ['villas:count:v1'],
  { revalidate: VILLAS_REVALIDATE_S, tags: [VILLAS_TAG] },
);
export async function getVillaCount(): Promise<number> {
  return _villaCountCached();
}

// Resolves the device's claimed villa via the httpOnly cookie. Returns null
// if the device hasn't claimed one yet (or no cookie was set). Used by
// /garbage to render the villa view server-side instead of waiting for a
// client-side localStorage hydration round-trip.
export async function getClaimedVilla(): Promise<{ id: string; label: string } | null> {
  const deviceId = cookies().get('odion-device')?.value;
  if (!deviceId) return null;
  const rows = await sql()<{ id: string; label: string }[]>`
    SELECT v.id, v.label
    FROM odion.devices d
    JOIN odion.villas v ON v.id = d.villa_id
    WHERE d.id = ${deviceId} AND v.deleted_at IS NULL
    LIMIT 1
  `;
  return rows[0] ?? null;
}

const _listPhasesCached = unstable_cache(
  async (): Promise<{ phase: string; count: number }[]> => {
    const rows = await sql()<{ phase: string; count: string }[]>`
      SELECT phase, COUNT(*) AS count
      FROM odion.villas
      WHERE deleted_at IS NULL
      GROUP BY phase
      ORDER BY phase
    `;
    return rows
      .map((r) => ({ phase: r.phase, count: Number(r.count) }))
      .sort((a, b) => phaseRank(a.phase) - phaseRank(b.phase));
  },
  ['villas:phases:v1'],
  { revalidate: VILLAS_REVALIDATE_S, tags: [VILLAS_TAG] },
);
export async function listPhases(): Promise<{ phase: string; count: number }[]> {
  return _listPhasesCached();
}

export async function listVillasInPhase(phase: string): Promise<Villa[]> {
  const rows = await sql()<Villa[]>`
    SELECT id, phase, number, label, display_order, auto_created, verified, created_at, deleted_at
    FROM odion.villas
    WHERE phase = ${phase} AND deleted_at IS NULL
    ORDER BY number
  `;
  return rows;
}

export async function findOrCreateVilla(phaseRaw: string, numberRaw: number): Promise<Villa> {
  const phase = phaseRaw.trim().toUpperCase();
  const number = Math.floor(Number(numberRaw));
  if (!phase || !Number.isFinite(number) || number <= 0) {
    throw new Error('Invalid phase or number');
  }
  if (phase.length > 8 || number > 9999) {
    throw new Error('Invalid phase or number');
  }

  // Look for existing villa (including soft-deleted — we'll restore those).
  const existing = await sql()<Villa[]>`
    SELECT id, phase, number, label, display_order, auto_created, verified, created_at, deleted_at
    FROM odion.villas
    WHERE phase = ${phase} AND number = ${number}
    LIMIT 1
  `;
  if (existing.length > 0) {
    const villa = existing[0];
    if (villa.deleted_at) {
      await sql()`UPDATE odion.villas SET deleted_at = NULL WHERE id = ${villa.id}`;
      revalidatePath('/garbage/admin/villas');
      revalidateTag(VILLAS_TAG);
      return { ...villa, deleted_at: null };
    }
    return villa;
  }

  // Rate limit per device — protects the pending-villa queue from spam.
  const deviceId = cookies().get('odion-device')?.value || null;
  if (deviceId) {
    const [row] = await sql()<{ recent: string }[]>`
      SELECT COUNT(*)::text AS recent
      FROM odion.villas
      WHERE auto_created = true
        AND created_by_device = ${deviceId}
        AND created_at > now() - interval '24 hours'
    `;
    if (Number(row.recent) >= AUTOCREATE_PER_DEVICE_DAILY) {
      throw new Error(
        `Too many new villas added from this device today (limit ${AUTOCREATE_PER_DEVICE_DAILY}). Ask an admin.`,
      );
    }
  }

  const { ip } = getClientMeta();
  const inserted = await sql()<Villa[]>`
    INSERT INTO odion.villas (phase, number, auto_created, verified, created_by_ip, created_by_device)
    VALUES (${phase}, ${number}, true, false, ${ip}, ${deviceId})
    RETURNING id, phase, number, label, display_order, auto_created, verified, created_at, deleted_at
  `;
  revalidatePath('/garbage');
  revalidatePath('/garbage/admin/villas');
  revalidateTag(VILLAS_TAG);
  return inserted[0];
}

export async function claimVilla(
  villaId: string,
  opts: { name?: string; phone?: string } = {},
) {
  if (!villaId) throw new Error('villaId required');
  // Device identity comes from the httpOnly cookie set by middleware — client can't forge it.
  const deviceId = cookies().get('odion-device')?.value;
  if (!deviceId) throw new Error('Device cookie missing — reload the page');
  const { ip, ua } = getClientMeta();
  await sql()`
    INSERT INTO odion.devices (id, villa_id, name, phone, user_agent, last_ip, first_seen, last_seen)
    VALUES (${deviceId}, ${villaId}, ${opts.name ?? null}, ${opts.phone ?? null}, ${ua}, ${ip}, now(), now())
    ON CONFLICT (id) DO UPDATE
      SET villa_id = EXCLUDED.villa_id,
          name = COALESCE(EXCLUDED.name, odion.devices.name),
          phone = COALESCE(EXCLUDED.phone, odion.devices.phone),
          last_ip = EXCLUDED.last_ip,
          last_seen = now()
  `;
  // 'layout' invalidates the layout segment too so the server-resolved
  // claimedVilla on /garbage updates on the next navigation, not just the
  // current refresh. (The header chip is client-side via useVilla() now.)
  revalidatePath('/garbage', 'layout');
}

// Drops this device's claim — server-side counterpart to clearVilla() in
// device.ts. Without this, Settings → Clear only wipes localStorage and the
// server still resolves the old claim on the next /garbage visit.
export async function unclaimDevice() {
  const deviceId = cookies().get('odion-device')?.value;
  if (!deviceId) return;
  await sql()`
    UPDATE odion.devices
    SET villa_id = NULL, last_seen = now()
    WHERE id = ${deviceId}
  `;
  revalidatePath('/garbage', 'layout');
}

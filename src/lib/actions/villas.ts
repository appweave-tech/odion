'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { Villa } from '@/lib/types';

const PHASE_ORDER = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'NGC'];

function phaseRank(p: string): number {
  const i = PHASE_ORDER.indexOf(p);
  return i === -1 ? 999 : i;
}

export async function listVillas(): Promise<Villa[]> {
  const rows = await sql()<Villa[]>`
    SELECT id, phase, number, label, display_order, auto_created, verified, created_at
    FROM odion.villas
    ORDER BY phase, number
  `;
  return [...rows].sort((a, b) => {
    const r = phaseRank(a.phase) - phaseRank(b.phase);
    return r !== 0 ? r : a.number - b.number;
  });
}

export async function listPhases(): Promise<{ phase: string; count: number }[]> {
  const rows = await sql()<{ phase: string; count: string }[]>`
    SELECT phase, COUNT(*) AS count
    FROM odion.villas
    GROUP BY phase
    ORDER BY phase
  `;
  return rows
    .map((r) => ({ phase: r.phase, count: Number(r.count) }))
    .sort((a, b) => phaseRank(a.phase) - phaseRank(b.phase));
}

export async function listVillasInPhase(phase: string): Promise<Villa[]> {
  const rows = await sql()<Villa[]>`
    SELECT id, phase, number, label, display_order, auto_created, verified, created_at
    FROM odion.villas
    WHERE phase = ${phase}
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

  const existing = await sql()<Villa[]>`
    SELECT id, phase, number, label, display_order, auto_created, verified, created_at
    FROM odion.villas
    WHERE phase = ${phase} AND number = ${number}
    LIMIT 1
  `;
  if (existing.length > 0) return existing[0];

  const inserted = await sql()<Villa[]>`
    INSERT INTO odion.villas (phase, number, auto_created, verified)
    VALUES (${phase}, ${number}, true, false)
    RETURNING id, phase, number, label, display_order, auto_created, verified, created_at
  `;
  revalidatePath('/garbage');
  revalidatePath('/garbage/admin/villas');
  return inserted[0];
}

export async function claimVilla(
  deviceId: string,
  villaId: string,
  opts: { name?: string; phone?: string; userAgent?: string } = {},
) {
  if (!deviceId || !villaId) throw new Error('deviceId and villaId required');
  await sql()`
    INSERT INTO odion.devices (id, villa_id, name, phone, user_agent, first_seen, last_seen)
    VALUES (${deviceId}, ${villaId}, ${opts.name ?? null}, ${opts.phone ?? null}, ${opts.userAgent ?? null}, now(), now())
    ON CONFLICT (id) DO UPDATE
      SET villa_id = EXCLUDED.villa_id,
          name = COALESCE(EXCLUDED.name, odion.devices.name),
          phone = COALESCE(EXCLUDED.phone, odion.devices.phone),
          last_seen = now()
  `;
  revalidatePath('/garbage');
}

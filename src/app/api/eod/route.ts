import { NextResponse } from 'next/server';
import { renderEodDigest } from '@/lib/actions/eod';

// Triggered daily at 20:00 IST by Vercel cron (see vercel.json).
// Returns the digest text. v1: caller (or the resident copying from /today)
// posts manually to WhatsApp. v2 will swap in Twilio here.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const digest = await renderEodDigest();
  return NextResponse.json(digest);
}

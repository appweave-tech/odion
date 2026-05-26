import 'server-only';
import { headers } from 'next/headers';

export async function getClientMeta(): Promise<{ ip: string | null; ua: string | null }> {
  const h = await headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    h.get('x-real-ip') ||
    null;
  const ua = h.get('user-agent') || null;
  return { ip, ua };
}

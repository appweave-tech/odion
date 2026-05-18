import { isAdmin } from '@/lib/actions/admin';
import { AdminLogin } from './_login';
import { AdminDashboard } from './_dashboard';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const authed = await isAdmin();
  if (!authed) return <AdminLogin />;

  const [{ villa_count }] = await sql()<{ villa_count: string }[]>`
    SELECT COUNT(*)::text AS villa_count FROM odion.villas
  `;
  const [{ pending_count }] = await sql()<{ pending_count: string }[]>`
    SELECT COUNT(*)::text AS pending_count FROM odion.villas WHERE verified = false
  `;
  const [{ events_count }] = await sql()<{ events_count: string }[]>`
    SELECT COUNT(*)::text AS events_count FROM odion.garbage_skip_events_current WHERE void = false
  `;

  return (
    <AdminDashboard
      stats={{
        villas: Number(villa_count),
        pending: Number(pending_count),
        events: Number(events_count),
      }}
    />
  );
}

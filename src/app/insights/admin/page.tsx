import { isAdmin } from '@/lib/actions/admin';
import { AdminLogin } from '@/app/garbage/admin/_login';
import {
  getLastIngest,
  getOverallStats,
  getRecentIngests,
} from '@/lib/actions/insights';
import { InsightsAdmin } from './_view';

export const dynamic = 'force-dynamic';

export default async function InsightsAdminPage() {
  const authed = await isAdmin();
  if (!authed) return <AdminLogin />;

  const [last, overall, recent] = await Promise.all([
    getLastIngest(),
    getOverallStats(),
    getRecentIngests(10),
  ]);

  return <InsightsAdmin last={last} overall={overall} recent={recent} />;
}

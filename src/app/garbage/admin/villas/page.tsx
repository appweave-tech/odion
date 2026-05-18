import { isAdmin } from '@/lib/actions/admin';
import { listVillas } from '@/lib/actions/villas';
import { redirect } from 'next/navigation';
import { AdminVillas } from './_view';

export const dynamic = 'force-dynamic';

export default async function AdminVillasPage() {
  if (!(await isAdmin())) redirect('/garbage/admin');
  const villas = await listVillas();
  return <AdminVillas villas={villas} />;
}

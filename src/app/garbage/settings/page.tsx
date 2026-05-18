import { listPhases, listVillas } from '@/lib/actions/villas';
import { SettingsView } from './_view';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [phases, allVillas] = await Promise.all([listPhases(), listVillas()]);
  return <SettingsView phases={phases} allVillas={allVillas} />;
}

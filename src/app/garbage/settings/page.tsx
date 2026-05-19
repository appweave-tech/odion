import { listPhases, listVillas } from '@/lib/actions/villas';
import { SettingsView } from './_view';

// ISR: villa list + phases barely change. 5-minute cache is plenty.
export const revalidate = 300;

export default async function SettingsPage() {
  const [phases, allVillas] = await Promise.all([listPhases(), listVillas()]);
  return <SettingsView phases={phases} allVillas={allVillas} />;
}

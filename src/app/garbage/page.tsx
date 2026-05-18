import { listPhases, listVillas } from '@/lib/actions/villas';
import { GarbageHome } from './_home';

export const dynamic = 'force-dynamic';

export default async function GarbagePage() {
  const [phases, allVillas] = await Promise.all([listPhases(), listVillas()]);
  return <GarbageHome phases={phases} allVillas={allVillas} />;
}

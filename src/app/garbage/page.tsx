import { listPhases, listVillas } from '@/lib/actions/villas';
import { listTodaySkips } from '@/lib/actions/skip';
import { GarbageHome } from './_home';

export const dynamic = 'force-dynamic';

export default async function GarbagePage() {
  const [phases, allVillas, todaySkips] = await Promise.all([
    listPhases(),
    listVillas(),
    listTodaySkips(),
  ]);
  return (
    <GarbageHome
      phases={phases}
      allVillas={allVillas}
      stats={{ villas: allVillas.length, skipsToday: todaySkips.length }}
    />
  );
}

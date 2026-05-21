import { getClaimedVilla, getVillaCount } from '@/lib/actions/villas';
import { GarbageHome } from './_home';

// Welcome card is cached for 5 minutes — villa count barely moves. The villa
// view (when the device has claimed) is per-resident and reads through to
// fresh data via its own cached actions.
export const revalidate = 300;

export default async function GarbagePage() {
  // Resolve villa server-side from the httpOnly device cookie so we skip the
  // localStorage hydration flicker. Falls back to the client picker if null.
  const [claimedVilla, villaCount] = await Promise.all([
    getClaimedVilla(),
    getVillaCount(),
  ]);

  return <GarbageHome claimedVilla={claimedVilla} villaCount={villaCount} />;
}

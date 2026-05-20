import { SettingsView } from './_view';

// Settings is a thin shell — the picker now fetches its own data lazily,
// so the page doesn't need to pre-fetch phases/villas anymore.
export const revalidate = 300;

export default function SettingsPage() {
  return <SettingsView />;
}

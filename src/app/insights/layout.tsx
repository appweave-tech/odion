import { Fraunces } from 'next/font/google';

// Fraunces — warm serif for the Pulse Feed display headings. Loaded only on
// /insights so garbage residents don't ship a font they never see.
const display = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} flex-1 flex flex-col`}>{children}</div>;
}

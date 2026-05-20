import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import './globals.css';

// Plus Jakarta Sans — humanist, friendly, distinctive without being weird.
// JetBrains Mono — for the WhatsApp digest preformatted block.
// Fraunces (display serif) is loaded only inside /insights to keep /garbage
// pages from shipping a font they never render.
const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Odion · Community Ops',
  description: 'Community tools for Odion The Woods of East — by Appweave.',
  applicationName: 'Odion',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Odion', statusBarStyle: 'default' },
  openGraph: {
    title: 'Odion · Community Ops',
    description: 'Built by Appweave for Odion The Woods of East.',
    url: 'https://odion.appweave.tech',
    siteName: 'Odion',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom intentionally allowed (WCAG 1.4.4). Residents zoom into the
  // heatmap and date chips, especially older users on smaller phones.
  viewportFit: 'cover',
  themeColor: '#16a34a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans">
        <ConfirmProvider>
          <div className="min-h-dvh flex flex-col">{children}</div>
        </ConfirmProvider>
        {/* bottom-center keeps confirmations close to the tap target on mobile.
            offset lifts toasts above the 96px-tall sticky bottom nav. */}
        <Toaster
          position="bottom-center"
          offset={112}
          mobileOffset={112}
        />
      </body>
    </html>
  );
}

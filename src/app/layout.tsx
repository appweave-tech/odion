import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

// Plus Jakarta Sans — humanist, friendly, distinctive without being weird.
// JetBrains Mono — for the WhatsApp digest preformatted block.
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
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#16a34a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans">
        <div className="min-h-dvh flex flex-col">{children}</div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

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
    <html lang="en">
      <body>
        <div className="min-h-dvh flex flex-col">{children}</div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '../src/hooks/useAuth';
import ClientAuthProvider from '../src/components/ClientAuthProvider';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'CardVela - 卡维拉',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/cardvela-mark.svg', type: 'image/svg+xml' },
    ],
    apple: '/brand/cardvela-mark.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        <ClientAuthProvider>{children}</ClientAuthProvider>
      </body>
    </html>
  );
}

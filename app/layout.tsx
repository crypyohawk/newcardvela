import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '../src/hooks/useAuth';
import ClientAuthProvider from '../src/components/ClientAuthProvider';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CardVela - 卡维拉',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
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

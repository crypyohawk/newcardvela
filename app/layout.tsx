import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '../src/hooks/useAuth';

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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

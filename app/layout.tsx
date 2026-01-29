import type { Metadata } from 'next';
import { AuthProvider } from '../src/hooks/useAuth';
import './globals.css';

export const metadata = {
  title: 'CardVela - 卡维拉',
  description: '卡维拉 - 专业虚拟卡管理平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

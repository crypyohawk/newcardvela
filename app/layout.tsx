import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '../src/hooks/useAuth';

export const metadata: Metadata = {
  title: 'CardVela - 卡维拉 | 海外支付管理平台',
  description: '安全、便捷、高效的虚拟信用卡服务，支持全球主流支付场景，助您轻松管理国际支付',
  keywords: 'CardVela, 卡维拉, 虚拟卡, 虚拟信用卡, 国际支付, VISA, MasterCard',
  icons: {
    icon: '/favicon.ico',
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

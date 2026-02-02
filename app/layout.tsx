import './globals.css';
import { AuthProvider } from '../src/hooks/useAuth';

export const metadata = {
  title: 'CardVela',
  description: 'Virtual Card Service',
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

import './globals.css';

export const metadata = {
  title: 'CardVela',
  description: 'Virtual Card Service',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}

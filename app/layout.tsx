import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Suma — Copiloto financiero',
  description:
    'Ordena tus movimientos, anticipa pagos y toma mejores decisiones financieras desde un solo lugar.',
  applicationName: 'Suma',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
  appleWebApp: { capable: true, title: 'Suma', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#0f293a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

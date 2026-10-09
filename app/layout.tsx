import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import '@/styles/components.css';

export const metadata: Metadata = {
  title: {
    template: '%s | WashGo',
    default: 'WashGo — Smart Laundry Pickup & Delivery',
  },
  description:
    'Schedule laundry pickup and delivery, track it in real time, and pay online. AI-powered wash recommendations and delivery estimates.',
  keywords: ['laundry', 'pickup', 'delivery', 'wash', 'WashGo', 'smart laundry'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WashGo',
  },
  icons: {
    icon: '/icons/gowashgo-icon.png',
    apple: '/icons/gowashgo-icon.png',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

export const viewport: Viewport = {
  themeColor: '#FAF8F5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};


export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/gowashgo-icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/gowashgo-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}

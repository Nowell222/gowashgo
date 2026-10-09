import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome | GoWashGo',
  description: 'Doorstep laundry service with calibrated hanging scales in San Juan, Batangas.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#FAF8F5' }}>
      {children}
    </div>
  );
}

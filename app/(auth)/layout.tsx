import '@/styles/auth-layout.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      {children}
    </div>
  );
}

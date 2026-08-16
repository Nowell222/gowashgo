'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/notifications/NotificationBell';
import '@/styles/mobile-layout.css';

/**
 * Mobile layout shell — fixed 430px width, centered on desktop.
 * Shared by Customer and Rider route groups.
 */
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isCustomer = pathname.startsWith('/customer');
  const isRider = pathname.startsWith('/rider');

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="mobile-shell">
      {/* Header */}
      <header className="mobile-header">
        <div className="mobile-header__logo">
          <span className="gradient-text">WashGo</span>
        </div>
        <div className="mobile-header__actions">
          <NotificationBell />
          <button
            className="btn btn--ghost btn--icon"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
          >
            ⏻
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mobile-content">
        {children}
      </main>

      {/* Bottom Navigation */}
      {isCustomer && (
        <nav className="bottom-nav" aria-label="Customer navigation">
          <Link
            href="/customer"
            className={`bottom-nav__item ${pathname === '/customer' ? 'bottom-nav__item--active' : ''}`}
          >
            <span className="bottom-nav__icon">🏠</span>
            <span>Home</span>
          </Link>
          <Link
            href="/customer/book"
            className={`bottom-nav__item ${pathname.startsWith('/customer/book') ? 'bottom-nav__item--active' : ''}`}
          >
            <span className="bottom-nav__icon">➕</span>
            <span>Book</span>
          </Link>
          <Link
            href="/customer/orders"
            className={`bottom-nav__item ${pathname.startsWith('/customer/orders') ? 'bottom-nav__item--active' : ''}`}
          >
            <span className="bottom-nav__icon">📋</span>
            <span>Orders</span>
          </Link>
          <Link
            href="/customer/profile"
            className={`bottom-nav__item ${pathname.startsWith('/customer/profile') ? 'bottom-nav__item--active' : ''}`}
          >
            <span className="bottom-nav__icon">👤</span>
            <span>Profile</span>
          </Link>
        </nav>
      )}

      {isRider && (
        <nav className="bottom-nav" aria-label="Rider navigation">
          <Link
            href="/rider"
            className={`bottom-nav__item ${pathname === '/rider' ? 'bottom-nav__item--active' : ''}`}
          >
            <span className="bottom-nav__icon">🏠</span>
            <span>Active</span>
          </Link>
          <Link
            href="/rider/orders"
            className={`bottom-nav__item ${pathname.startsWith('/rider/orders') ? 'bottom-nav__item--active' : ''}`}
          >
            <span className="bottom-nav__icon">📋</span>
            <span>Orders</span>
          </Link>
          <Link
            href="/rider/history"
            className={`bottom-nav__item ${pathname.startsWith('/rider/history') ? 'bottom-nav__item--active' : ''}`}
          >
            <span className="bottom-nav__icon">📊</span>
            <span>History</span>
          </Link>
          <Link
            href="/rider/profile"
            className={`bottom-nav__item ${pathname.startsWith('/rider/profile') ? 'bottom-nav__item--active' : ''}`}
          >
            <span className="bottom-nav__icon">👤</span>
            <span>Profile</span>
          </Link>
        </nav>
      )}
    </div>
  );
}

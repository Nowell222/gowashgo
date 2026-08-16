'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/auth/roles';
import NotificationBell from '@/components/notifications/NotificationBell';
import type { UserRole, User } from '@/lib/types';
import '@/styles/desktop-layout.css';

/**
 * Desktop layout shell — sidebar navigation + main content area.
 * Shared by Staff, Branch Manager, and Platform Admin.
 */
export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (profile) setUser(profile as User);
      }
    }
    loadUser();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const role = user?.role as UserRole | undefined;

  return (
    <div className="desktop-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__brand-icon">W</div>
          <div>
            <div className="sidebar__brand-name">WashGo</div>
            {role && (
              <div className="sidebar__brand-role">{ROLE_LABELS[role]}</div>
            )}
          </div>
        </div>

        <nav className="sidebar__nav">
          {/* Staff Navigation */}
          {role === 'staff' && (
            <>
              <div className="sidebar__section-title">Operations</div>
              <Link
                href="/staff"
                className={`sidebar__link ${pathname === '/staff' ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">📊</span>
                Dashboard
              </Link>
              <Link
                href="/staff/orders"
                className={`sidebar__link ${pathname.startsWith('/staff/orders') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">📋</span>
                Orders
              </Link>
              <Link
                href="/staff/riders"
                className={`sidebar__link ${pathname.startsWith('/staff/riders') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">🏍️</span>
                Riders
              </Link>
            </>
          )}

          {/* Branch Manager Navigation */}
          {role === 'branch_manager' && (
            <>
              <div className="sidebar__section-title">Overview</div>
              <Link
                href="/manager"
                className={`sidebar__link ${pathname === '/manager' ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">📊</span>
                Dashboard
              </Link>
              <Link
                href="/manager/orders"
                className={`sidebar__link ${pathname.startsWith('/manager/orders') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">📋</span>
                Orders
              </Link>

              <div className="sidebar__section-title">Team</div>
              <Link
                href="/manager/staff"
                className={`sidebar__link ${pathname.startsWith('/manager/staff') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">👥</span>
                Staff
              </Link>
              <Link
                href="/manager/riders"
                className={`sidebar__link ${pathname.startsWith('/manager/riders') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">🏍️</span>
                Riders
              </Link>
              <Link
                href="/manager/invites"
                className={`sidebar__link ${pathname.startsWith('/manager/invites') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">✉️</span>
                Invites
              </Link>

              <div className="sidebar__section-title">Settings</div>
              <Link
                href="/manager/pricing"
                className={`sidebar__link ${pathname.startsWith('/manager/pricing') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">💰</span>
                Pricing
              </Link>
              <Link
                href="/manager/settings"
                className={`sidebar__link ${pathname.startsWith('/manager/settings') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">⚙️</span>
                Settings
              </Link>
            </>
          )}

          {/* Platform Admin Navigation */}
          {role === 'platform_admin' && (
            <>
              <div className="sidebar__section-title">Platform</div>
              <Link
                href="/admin"
                className={`sidebar__link ${pathname === '/admin' ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">📊</span>
                Dashboard
              </Link>
              <Link
                href="/admin/branches"
                className={`sidebar__link ${pathname.startsWith('/admin/branches') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">🏪</span>
                Branches
              </Link>
              <Link
                href="/admin/users"
                className={`sidebar__link ${pathname.startsWith('/admin/users') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">👥</span>
                Users
              </Link>
              <Link
                href="/admin/settings"
                className={`sidebar__link ${pathname.startsWith('/admin/settings') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">⚙️</span>
                Settings
              </Link>
            </>
          )}
        </nav>

        {/* User info at bottom */}
        <div className="sidebar__user">
          <div className="avatar avatar--sm">
            {user?.full_name?.charAt(0) || '?'}
          </div>
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{user?.full_name || 'Loading...'}</div>
            <div className="sidebar__user-role">{user?.email || ''}</div>
          </div>
          <button
            className="btn btn--ghost btn--icon"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
          >
            ⏻
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="desktop-main">
        <header className="desktop-header">
          <div className="desktop-header__title">
            {pathname.split('/')[1]?.toUpperCase() || 'DASHBOARD'}
          </div>
          <div className="desktop-header__actions">
            <NotificationBell />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

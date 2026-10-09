'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/auth/roles';
import NotificationBell from '@/components/notifications/NotificationBell';
import {
  BasketIcon,
  ReceiptTicketIcon,
  ScooterCourierIcon,
  MachineDrumIcon,
  CareTagIcon,
  ScaleIcon,
  HangerIcon,
  WaterDropIcon,
  SignOutIcon,
} from '@/components/icons';
import type { UserRole, User } from '@/lib/types';
import '@/styles/desktop-layout.css';

/**
 * Desktop layout shell — sidebar navigation + main content area.
 * Custom laundry-themed interface for Staff, Branch Manager, and Platform Admin.
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
          <img src="/icons/gowashgo-icon.png" alt="GoWashGo" width={32} height={32} style={{ borderRadius: 6, objectFit: 'contain' }} />
          <div>
            <div className="sidebar__brand-name">gowashgo</div>
            {role && (
              <div className="sidebar__brand-role">{ROLE_LABELS[role]}</div>
            )}
          </div>
        </div>

        <nav className="sidebar__nav">
          {/* Staff Navigation */}
          {role === 'staff' && (
            <>
              <div className="sidebar__section-title">Facility Ops</div>
              <Link
                href="/staff"
                className={`sidebar__link ${pathname === '/staff' ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">
                  <BasketIcon size={16} />
                </span>
                Facility Queue
              </Link>
              <Link
                href="/staff/orders"
                className={`sidebar__link ${pathname.startsWith('/staff/orders') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">
                  <ReceiptTicketIcon size={16} />
                </span>
                All Orders
              </Link>
              <Link
                href="/staff/riders"
                className={`sidebar__link ${pathname.startsWith('/staff/riders') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">
                  <ScooterCourierIcon size={16} />
                </span>
                Couriers
              </Link>
            </>
          )}

          {/* Branch Manager Navigation */}
          {role === 'branch_manager' && (
            <>
              <div className="sidebar__section-title">Shop Management</div>
              <Link
                href="/manager"
                className={`sidebar__link ${pathname === '/manager' ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">
                  <MachineDrumIcon size={16} />
                </span>
                Shift Overview
              </Link>
              <Link
                href="/manager/orders"
                className={`sidebar__link ${pathname.startsWith('/manager/orders') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">
                  <ReceiptTicketIcon size={16} />
                </span>
                Orders
              </Link>

              <div className="sidebar__section-title">Team & Couriers</div>
              <Link
                href="/manager/staff"
                className={`sidebar__link ${pathname.startsWith('/manager/staff') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">
                  <CareTagIcon size={16} />
                </span>
                Staff Team
              </Link>
              <Link
                href="/manager/riders"
                className={`sidebar__link ${pathname.startsWith('/manager/riders') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">
                  <ScooterCourierIcon size={16} />
                </span>
                Courier Fleet
              </Link>
              <Link
                href="/manager/invites"
                className={`sidebar__link ${pathname.startsWith('/manager/invites') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">
                  <WaterDropIcon size={16} />
                </span>
                Staff Invites
              </Link>

              <div className="sidebar__section-title">Shop Settings</div>
              <Link
                href="/manager/pricing"
                className={`sidebar__link ${pathname.startsWith('/manager/pricing') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">
                  <ScaleIcon size={16} />
                </span>
                Wash Rates
              </Link>
              <Link
                href="/manager/settings"
                className={`sidebar__link ${pathname.startsWith('/manager/settings') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">
                  <HangerIcon size={16} />
                </span>
                Branch Settings
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
                <span className="sidebar__link-icon">
                  <MachineDrumIcon size={16} />
                </span>
                Operations
              </Link>
              <Link
                href="/admin/branches"
                className={`sidebar__link ${pathname.startsWith('/admin/branches') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">
                  <BasketIcon size={16} />
                </span>
                Branches
              </Link>
              <Link
                href="/admin/users"
                className={`sidebar__link ${pathname.startsWith('/admin/users') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">
                  <CareTagIcon size={16} />
                </span>
                Users
              </Link>
              <Link
                href="/admin/settings"
                className={`sidebar__link ${pathname.startsWith('/admin/settings') ? 'sidebar__link--active' : ''}`}
              >
                <span className="sidebar__link-icon">
                  <HangerIcon size={16} />
                </span>
                Settings
              </Link>
            </>
          )}
        </nav>

        {/* User info at bottom */}
        <div className="sidebar__user">
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 2,
            background: '#ECFEFF',
            color: '#0E7490',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 12,
            fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
          }}>
            {user?.full_name?.charAt(0) || 'W'}
          </div>
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{user?.full_name || 'Loading...'}</div>
            <div className="sidebar__user-role">{user?.email || ''}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            style={{
              padding: 6,
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SignOutIcon size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="desktop-main">
        <header className="desktop-header">
          <div className="desktop-header__title">
            {pathname.startsWith('/staff') ? 'FACILITY WORKFLOW' : pathname.startsWith('/manager') ? 'BRANCH SUPERVISION' : 'PLATFORM OVERVIEW'}
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

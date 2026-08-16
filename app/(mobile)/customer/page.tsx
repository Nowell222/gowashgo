'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User, Order } from '@/lib/types';

export default function CustomerHomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (profile) setUser(profile as User);

        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(3);
        if (orders) setRecentOrders(orders as Order[]);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="fade-in">
        <div className="skeleton" style={{ height: 24, width: 200, marginBottom: 'var(--space-2)' }} />
        <div className="skeleton" style={{ height: 16, width: 280, marginBottom: 'var(--space-8)' }} />
        <div className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)' }} />
        <div className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-3)' }} />
        <div className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Greeting */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>
          {greeting()}, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
          Need your laundry done? We&apos;ve got you covered.
        </p>
      </div>

      {/* Quick Book CTA */}
      <Link
        href="/customer/book"
        className="card card--interactive"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
          background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.15), rgba(0, 210, 211, 0.1))',
          border: '1px solid rgba(108, 92, 231, 0.2)',
          textDecoration: 'none',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'var(--text-xl)', flexShrink: 0,
        }}>
          🧺
        </div>
        <div>
          <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-md)' }}>
            Schedule a Pickup
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            We&apos;ll pick up, wash, and deliver back to you
          </div>
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--color-primary-light)', fontSize: 'var(--text-xl)' }}>→</span>
      </Link>

      {/* Recent Orders */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 'var(--space-4)',
        }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>
            Recent Orders
          </h2>
          {recentOrders.length > 0 && (
            <Link href="/customer/orders" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-light)' }}>
              View all →
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
            <div className="empty-state__icon">📋</div>
            <p className="empty-state__title">No orders yet</p>
            <p className="empty-state__description">
              Book your first laundry pickup and we&apos;ll take care of the rest!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/customer/orders/${order.id}`}
                className="card card--interactive"
                style={{ textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>
                      {order.order_number}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {new Date(order.created_at).toLocaleDateString('en-PH', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <span className={`status-badge status-badge--${getStatusColor(order.status)}`}>
                    {formatStatus(order.status)}
                  </span>
                </div>
                <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  ₱{(order.total / 100).toFixed(2)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'delivered':
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'error';
    case 'pending':
      return 'neutral';
    default:
      return 'info';
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

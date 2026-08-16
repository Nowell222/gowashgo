'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import type { OrderWithItems, OrderStatus } from '@/lib/types';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      try {
        const res = await fetch('/api/orders');
        const json = await res.json();
        if (json.data) {
          setOrders(json.data);
        }
      } catch (err) {
        console.error('Failed to load customer orders:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') {
      return !['delivered', 'completed', 'cancelled'].includes(o.status);
    }
    if (filter === 'completed') {
      return ['delivered', 'completed', 'cancelled'].includes(o.status);
    }
    return true;
  });

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>
            My Orders
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 2 }}>
            Track your laundry progress in real time.
          </p>
        </div>
        <Link href="/customer/book" className="btn btn--primary btn--sm">
          + New
        </Link>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: 6,
        background: 'var(--color-bg-elevated)',
        padding: 4,
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-5)'
      }}>
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              flex: 1,
              padding: '6px 0',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textTransform: 'capitalize',
              background: filter === f ? 'var(--color-primary)' : 'transparent',
              color: filter === f ? 'white' : 'var(--color-text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            {f} ({orders.filter((o) => {
              if (f === 'active') return !['delivered', 'completed', 'cancelled'].includes(o.status);
              if (f === 'completed') return ['delivered', 'completed', 'cancelled'].includes(o.status);
              return true;
            }).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-10) 0' }}>
          <div className="empty-state__icon">🧺</div>
          <p className="empty-state__title">No {filter !== 'all' ? filter : ''} orders found</p>
          <p className="empty-state__description">
            {filter === 'active' ? 'You have no active laundry requests right now.' : 'Ready for clean clothes? Schedule your pickup now.'}
          </p>
          <Link href="/customer/book" className="btn btn--primary" style={{ marginTop: 'var(--space-4)' }}>
            Book a Pickup
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredOrders.map((order) => {
            const isActive = !['delivered', 'completed', 'cancelled'].includes(order.status);
            const statusColor = getOrderStatusColor(order.status as OrderStatus);
            const totalItems = order.order_items ? order.order_items.reduce((s, it) => s + it.quantity, 0) : 0;

            return (
              <Link
                key={order.id}
                href={`/customer/orders/${order.id}`}
                className="card card--interactive"
                style={{
                  textDecoration: 'none',
                  border: isActive ? '1px solid rgba(108, 92, 231, 0.3)' : '1px solid var(--color-border)',
                  background: isActive ? 'linear-gradient(135deg, rgba(22, 33, 62, 0.9), rgba(15, 15, 26, 0.9))' : 'var(--color-bg-card)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isActive && <div className="pulse-dot" />}
                      <span style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                        {order.order_number}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {new Date(order.created_at).toLocaleDateString('en-PH', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <span className={`status-badge status-badge--${statusColor}`}>
                    {formatOrderStatus(order.status as OrderStatus)}
                  </span>
                </div>

                <div className="divider" style={{ margin: '10px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  <span>{totalItems > 0 ? `${totalItems} items` : '1 package'}</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--color-text)' }}>
                    {formatPeso(order.total)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

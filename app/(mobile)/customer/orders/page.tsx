'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import type { OrderWithItems, OrderStatus } from '@/lib/types';

export default function CustomerOrdersPage() {
  const router = useRouter();
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
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
            My Orders
          </h1>
          <p style={{ color: '#64748B', fontSize: 'var(--text-xs)', marginTop: 2 }}>
            Track your laundry progress in real time.
          </p>
        </div>
        <Link href="/customer/book" className="btn btn--primary btn--sm">
          + Book Pickup
        </Link>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: 6,
        background: '#F1F5F9',
        padding: 4,
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-4)'
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
              fontWeight: 700,
              textTransform: 'capitalize',
              background: filter === f ? '#0284C7' : 'transparent',
              color: filter === f ? '#FFFFFF' : '#64748B',
              border: 'none',
              cursor: 'pointer',
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
            const isCompleted = ['delivered', 'completed'].includes(order.status);
            const statusColor = getOrderStatusColor(order.status as OrderStatus);

            return (
              <div
                key={order.id}
                className="card card--interactive"
                style={{
                  padding: 16,
                  border: isActive ? '1.5px solid #BAE6FD' : '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  boxShadow: isActive ? '0 4px 15px rgba(2, 132, 199, 0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <Link
                  href={`/customer/orders/${order.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isActive && <div className="pulse-dot" />}
                        <span style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                          {order.order_number}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: 4 }}>
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748B' }}>
                    <span>{order.weight_kg ? `⚖️ ${order.weight_kg} kg verified` : 'Standard bag'} • {order.payment_method === 'online' ? 'Online' : 'COD'}</span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#0284C7' }}>
                      {formatPeso(order.total)}
                    </span>
                  </div>
                </Link>

                {/* Tier B3: Reorder / Repeat Button */}
                {isCompleted && (
                  <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => router.push(`/customer/book?reorder_id=${order.id}`)}
                      style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', color: '#0284C7', border: '1px solid #BAE6FD' }}
                    >
                      🔄 Book Again
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

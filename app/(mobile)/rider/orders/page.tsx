'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import type { OrderWithDetails, OrderStatus } from '@/lib/types';

export default function RiderOrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const res = await fetch('/api/orders');
      const json = await res.json();
      if (json.data) setOrders(json.data);
    } catch (err) {
      console.error('Failed to load rider orders:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeOrders = orders.filter((o) => !['delivered', 'completed', 'cancelled'].includes(o.status));

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>
          Assigned Orders
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
          All active delivery assignments for your shift
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-10) 0' }}>
          <div className="empty-state__icon">📋</div>
          <p className="empty-state__title">No active orders</p>
          <p className="empty-state__description">Branch staff will assign incoming orders to you.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {activeOrders.map((order) => {
            const statusColor = getOrderStatusColor(order.status as OrderStatus);
            return (
              <Link
                key={order.id}
                href={`/rider/orders/${order.id}`}
                className="card card--interactive"
                style={{ textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontWeight: 'var(--font-bold)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
                      {order.order_number}
                    </span>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {order.customer?.full_name}
                    </div>
                  </div>
                  <span className={`status-badge status-badge--${statusColor}`}>
                    {formatOrderStatus(order.status as OrderStatus)}
                  </span>
                </div>

                <div className="divider" style={{ margin: '8px 0' }} />

                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  <div><strong>Pickup:</strong> {order.pickup_address}</div>
                  <div><strong>Delivery:</strong> {order.delivery_address}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 'var(--text-xs)' }}>
                  <span>{order.order_items?.reduce((s, i) => s + i.quantity, 0) || 0} items</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{formatPeso(order.total)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

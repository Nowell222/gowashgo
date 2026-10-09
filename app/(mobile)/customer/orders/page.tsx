'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import LaundryIcons from '@/components/common/LaundryIcons';
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
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <LaundryIcons.CareTag size={16} color="var(--color-primary)" />
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
              Order History
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--color-text-dark)', letterSpacing: '-0.02em' }}>
            My Orders
          </h1>
        </div>
        <Link
          href="/customer/book"
          style={{
            background: 'var(--color-primary)',
            color: '#FFFFFF',
            padding: '8px 14px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 800,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <LaundryIcons.Plus size={14} color="#FFFFFF" />
          <span>Book Pickup</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: '#F3EFE6',
          padding: 4,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        {(['all', 'active', 'completed'] as const).map((f) => {
          const count = orders.filter((o) => {
            if (f === 'active') return !['delivered', 'completed', 'cancelled'].includes(o.status);
            if (f === 'completed') return ['delivered', 'completed', 'cancelled'].includes(o.status);
            return true;
          }).length;

          const isSelected = filter === f;

          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'capitalize',
                background: isSelected ? 'var(--color-primary)' : 'transparent',
                color: isSelected ? '#FFFFFF' : 'var(--color-text-muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {f} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 96, background: '#F3EFE6', borderRadius: 14 }} />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flat-block" style={{ textAlign: 'center', padding: '40px 16px', background: '#F3EFE6' }}>
          <LaundryIcons.Basket size={36} color="#8C827A" />
          <p style={{ fontWeight: 800, fontSize: 15, margin: '10px 0 4px', color: 'var(--color-text-dark)' }}>
            No {filter !== 'all' ? filter : ''} orders found
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
            {filter === 'active'
              ? 'You have no active laundry requests right now.'
              : 'Ready for clean laundry? Schedule a doorstep pickup.'}
          </p>
          <Link
            href="/customer/book"
            style={{
              display: 'inline-block',
              background: 'var(--color-primary)',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 800,
              textDecoration: 'none',
              marginTop: 16,
            }}
          >
            Book a Pickup
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredOrders.map((order) => {
            const isActive = !['delivered', 'completed', 'cancelled'].includes(order.status);
            const isCompleted = ['delivered', 'completed'].includes(order.status);
            const statusColor = getOrderStatusColor(order.status as OrderStatus);

            return (
              <div
                key={order.id}
                style={{
                  background: isActive ? '#ECFEFF' : '#F3EFE6',
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <Link
                  href={`/customer/orders/${order.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-text-dark)', fontFamily: 'var(--font-mono)' }}>
                          {order.order_number}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {new Date(order.created_at).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <span className={`status-badge status-badge--${statusColor}`}>
                      {formatOrderStatus(order.status as OrderStatus)}
                    </span>
                  </div>

                  <div style={{ height: 1, background: 'rgba(0, 0, 0, 0.06)', margin: '10px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)' }}>
                      <LaundryIcons.Scale size={13} color="var(--color-primary)" />
                      <span>
                        {order.weight_kg ? `${Number(order.weight_kg).toFixed(1)} kg verified` : 'Awaiting scale'}
                      </span>
                      <span>•</span>
                      <span>{order.payment_method === 'online' ? 'Online' : 'COD'}</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                      {formatPeso(order.total)}
                    </span>
                  </div>
                </Link>

                {isCompleted && (
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(0, 0, 0, 0.05)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => router.push(`/customer/book?reorder_id=${order.id}`)}
                      style={{
                        background: '#FFFFFF',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 800,
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <LaundryIcons.Refresh size={12} color="var(--color-primary)" />
                      <span>Book Again</span>
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

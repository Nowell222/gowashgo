'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import LaundryIcons from '@/components/common/LaundryIcons';
import type { OrderWithDetails } from '@/lib/types';

export default function RiderHistoryPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadHistory() {
    try {
      const res = await fetch('/api/orders');
      const json = await res.json();
      if (json.data) {
        setOrders(json.data.filter((o: OrderWithDetails) => ['delivered', 'completed'].includes(o.status)));
      }
    } catch (err) {
      console.error('Error loading rider history:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <LaundryIcons.CheckmarkBadge size={16} color="var(--color-primary)" />
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            Completed Deliveries
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--color-text-dark)', letterSpacing: '-0.02em' }}>
          Delivery Log
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12, margin: '4px 0 0' }}>
          {orders.length} total completed laundry runs
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 80, background: '#F3EFE6', borderRadius: 14 }} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flat-block" style={{ textAlign: 'center', padding: '40px 16px', background: '#F3EFE6' }}>
          <LaundryIcons.ReceiptTicket size={36} color="#8C827A" />
          <p style={{ fontWeight: 800, fontSize: 15, margin: '10px 0 4px', color: 'var(--color-text-dark)' }}>
            No completed delivery runs yet
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
            Deliveries you conclude will be permanently logged here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/rider/orders/${order.id}`}
              style={{
                background: '#F3EFE6',
                borderRadius: 14,
                padding: 14,
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-text-dark)' }}>
                    {order.order_number}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {new Date(order.updated_at).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    • {order.weight_kg ? `${Number(order.weight_kg).toFixed(1)} kg weighed` : 'Completed'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      background: '#ECFDF5',
                      color: '#065F46',
                      fontWeight: 800,
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 4,
                      display: 'inline-block',
                      textTransform: 'uppercase',
                    }}
                  >
                    Delivered
                  </span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: 'var(--color-primary)', marginTop: 4 }}>
                    {formatPeso(order.total)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

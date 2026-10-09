'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import LaundryIcons from '@/components/common/LaundryIcons';
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
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <LaundryIcons.DeliveryScooter size={16} color="var(--color-primary)" />
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            Active Dispatch Run
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--color-text-dark)', letterSpacing: '-0.02em' }}>
          Assigned Orders
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12, margin: '4px 0 0' }}>
          Doorstep pickups with portable scale and return deliveries
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 100, background: '#F3EFE6', borderRadius: 14 }} />
          ))}
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="flat-block" style={{ textAlign: 'center', padding: '40px 16px', background: '#F3EFE6' }}>
          <LaundryIcons.DeliveryScooter size={36} color="#8C827A" />
          <p style={{ fontWeight: 800, fontSize: 15, margin: '10px 0 4px', color: 'var(--color-text-dark)' }}>
            No active deliveries right now
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
            New pickup assignments from your shop branch will appear here in real time.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeOrders.map((order) => {
            const statusColor = getOrderStatusColor(order.status as OrderStatus);
            const needsWeighing = ['pending', 'confirmed', 'rider_assigned', 'pickup_en_route'].includes(order.status) && !order.weight_kg;

            return (
              <Link
                key={order.id}
                href={`/rider/orders/${order.id}`}
                style={{
                  background: needsWeighing ? '#FEF3C7' : '#F3EFE6',
                  borderRadius: 14,
                  padding: 14,
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-text-dark)' }}>
                      {order.order_number}
                    </span>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', marginTop: 2 }}>
                      {order.customer?.full_name || 'Customer'}
                    </div>
                  </div>
                  <span className={`status-badge status-badge--${statusColor}`}>
                    {formatOrderStatus(order.status as OrderStatus)}
                  </span>
                </div>

                <div style={{ height: 1, background: 'rgba(0, 0, 0, 0.06)', margin: '10px 0' }} />

                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>Pickup: </span>
                    {order.pickup_address}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>Delivery: </span>
                    {order.delivery_address}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LaundryIcons.Scale size={14} color={needsWeighing ? '#D97706' : 'var(--color-primary)'} />
                    <span style={{ fontWeight: 700, color: needsWeighing ? '#B45309' : 'var(--color-text-dark)' }}>
                      {order.weight_kg ? `${Number(order.weight_kg).toFixed(1)} kg verified` : 'Scale Weighing Needed'}
                    </span>
                  </div>
                  <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-primary)' }}>
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

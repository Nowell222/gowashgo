'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import type { OrderWithDetails, OrderStatus } from '@/lib/types';

export default function ManagerOrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  async function loadData() {
    try {
      const res = await fetch('/api/orders?limit=100');
      const json = await res.json();
      if (json.data) setOrders(json.data);
    } catch (err) {
      console.error('Failed to load manager orders:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    return o.status === statusFilter;
  });

  const totalRevenue = orders
    .filter((o) => ['delivered', 'completed'].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);

  const activePipelineRevenue = orders
    .filter((o) => !['delivered', 'completed', 'cancelled'].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Branch Orders &amp; Revenue</h1>
          <p className="page-heading__subtitle">
            Supervise all orders, track delivery performance, and analyze financial throughput.
          </p>
        </div>
      </div>

      {/* Revenue & Pipeline Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Total Orders Processed</div>
          <div className="stat-card__value">{orders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Realized Revenue (Completed)</div>
          <div className="stat-card__value" style={{ color: '#059669' }}>{formatPeso(totalRevenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">In-Pipeline Value (Active)</div>
          <div className="stat-card__value" style={{ color: '#0284C7' }}>{formatPeso(activePipelineRevenue)}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        {[
          { key: 'all', label: 'All Orders' },
          { key: 'pending', label: 'Pending' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'at_facility', label: 'In Washing' },
          { key: 'delivery_en_route', label: 'Out for Delivery' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`btn btn--sm ${statusFilter === tab.key ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label} ({orders.filter((o) => tab.key === 'all' || o.status === tab.key).length})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--space-4)' }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 60 }} />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
            <div className="empty-state__icon">📋</div>
            <p className="empty-state__title">No orders found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Pickup / Delivery</th>
                  <th>Status</th>
                  <th>Rider</th>
                  <th>Items</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const statusColor = getOrderStatusColor(order.status as OrderStatus);
                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 'var(--font-bold)', fontFamily: 'var(--font-mono)' }}>
                        {order.order_number}
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 'normal' }}>
                          {new Date(order.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{order.customer?.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{order.customer?.phone || order.customer?.email}</div>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', maxWidth: 200 }}>
                        <div><strong>From:</strong> {order.pickup_address}</div>
                        <div><strong>To:</strong> {order.delivery_address}</div>
                      </td>
                      <td>
                        <span className={`status-badge status-badge--${statusColor}`}>
                          {formatOrderStatus(order.status as OrderStatus)}
                        </span>
                      </td>
                      <td>{order.rider?.full_name || <span style={{ color: 'var(--color-text-muted)' }}>Unassigned</span>}</td>
                      <td>{order.order_items?.reduce((s, i) => s + i.quantity, 0) || 0} pcs</td>
                      <td style={{ fontWeight: 600 }}>{formatPeso(order.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

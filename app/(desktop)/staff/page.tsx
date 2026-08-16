'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor, getNextStatuses } from '@/lib/orders/status-machine';
import WeighIntakeModal from '@/components/staff/WeighIntakeModal';
import type { OrderWithDetails, OrderStatus } from '@/lib/types';

export default function StaffDashboardPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [intakeOrder, setIntakeOrder] = useState<OrderWithDetails | null>(null);

  async function loadData() {
    try {
      const res = await fetch('/api/orders?limit=25');
      const json = await res.json();
      if (json.data) {
        setOrders(json.data);
      }
    } catch (err) {
      console.error('Error loading staff orders:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleAdvanceStatus(orderId: string, nextStatus: OrderStatus) {
    const orderToAdvance = orders.find((o) => o.id === orderId);
    // If order is at_facility and moving to washing, prompt for weighing & intake!
    if (orderToAdvance && orderToAdvance.status === 'at_facility' && nextStatus === 'washing') {
      setIntakeOrder(orderToAdvance);
      return;
    }

    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          note: `Advanced by facility staff to ${nextStatus}`,
        }),
      });
      if (res.ok) {
        loadData();
      } else {
        const json = await res.json();
        alert(json.error?.message || 'Failed to update status');
      }
    } catch {
      alert('Network error updating status');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleConfirmIntake(data: any) {
    if (!intakeOrder) return;
    setUpdatingId(intakeOrder.id);
    try {
      const res = await fetch(`/api/orders/${intakeOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'washing',
          intake: data,
        }),
      });
      if (res.ok) {
        loadData();
      } else {
        const json = await res.json();
        alert(json.error?.message || 'Failed to record intake');
      }
    } catch {
      alert('Network error recording intake');
    } finally {
      setUpdatingId(null);
      setIntakeOrder(null);
    }
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const inFacilityCount = orders.filter((o) => ['at_facility', 'washing', 'drying', 'folding'].includes(o.status)).length;
  const readyCount = orders.filter((o) => o.status === 'ready_for_delivery').length;
  const completedTodayCount = orders.filter((o) => ['delivered', 'completed'].includes(o.status)).length;

  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Staff Operations Hub</h1>
          <p className="page-heading__subtitle">
            Real-time branch queue, digital scale intake, and wash workflow processing.
          </p>
        </div>
        <Link href="/staff/orders" className="btn btn--primary">
          View All Orders →
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Needs Confirmation</div>
          <div className="stat-card__value" style={{ color: '#D97706' }}>{pendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">In Washing / Care</div>
          <div className="stat-card__value" style={{ color: '#0284C7' }}>{inFacilityCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Ready for Dispatch</div>
          <div className="stat-card__value" style={{ color: '#0369A1' }}>{readyCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Delivered / Done</div>
          <div className="stat-card__value" style={{ color: '#059669' }}>{completedTodayCount}</div>
        </div>
      </div>

      {/* Live Orders Queue Table */}
      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Active Facility Queue</h2>
          <span className="status-badge status-badge--neutral">Auto-updating</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 56 }} />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
            <div className="empty-state__icon">🧺</div>
            <p className="empty-state__title">Queue is empty</p>
            <p className="empty-state__description">New customer pickup orders will appear here automatically.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Load / Weight</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const nextOptions = getNextStatuses(order.status as OrderStatus, 'staff');
                  const primaryNext = nextOptions.find((s) => s !== 'cancelled');
                  const statusColor = getOrderStatusColor(order.status as OrderStatus);

                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {order.order_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{order.customer?.full_name || 'Customer'}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{order.customer?.phone || 'No phone'}</div>
                      </td>
                      <td>
                        {order.weight_kg ? (
                          <div style={{ fontWeight: 700, color: '#0284C7' }}>
                            ⚖️ {order.weight_kg} kg
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                            Pending Scale
                          </div>
                        )}
                        {order.order_items?.[0]?.wash_recommendation && (
                          <div style={{ fontSize: '10px', color: '#0369A1' }}>
                            {order.order_items[0].wash_recommendation.wash_program}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-badge--${statusColor}`}>
                          {formatOrderStatus(order.status as OrderStatus)}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: order.payment_method === 'online' ? '#EFF6FF' : '#F0FDF4',
                          color: order.payment_method === 'online' ? '#1D4ED8' : '#15803D',
                        }}>
                          {order.payment_method === 'online' ? '💳 Online' : '💵 Cash (COD)'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>
                        {order.weight_kg ? formatPeso(order.total) : `${formatPeso(order.total)} (Est)`}
                      </td>
                      <td>
                        {order.status === 'at_facility' ? (
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            style={{ background: '#0284C7', fontWeight: 700 }}
                            onClick={() => setIntakeOrder(order)}
                          >
                            ⚖️ Weigh &amp; Start Wash
                          </button>
                        ) : primaryNext ? (
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            disabled={updatingId === order.id}
                            onClick={() => handleAdvanceStatus(order.id, primaryNext)}
                          >
                            {updatingId === order.id ? (
                              <span className="btn__spinner" />
                            ) : (
                              `→ Mark ${formatOrderStatus(primaryNext)}`
                            )}
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                            {order.status === 'completed' ? 'Completed' : 'Awaiting Delivery'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Weigh & Intake Modal */}
      {intakeOrder && (
        <WeighIntakeModal
          order={intakeOrder}
          isOpen={Boolean(intakeOrder)}
          onClose={() => setIntakeOrder(null)}
          onConfirm={handleConfirmIntake}
        />
      )}
    </div>
  );
}

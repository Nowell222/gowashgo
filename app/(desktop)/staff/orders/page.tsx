'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor, getNextStatuses } from '@/lib/orders/status-machine';
import WeighIntakeModal from '@/components/staff/WeighIntakeModal';
import type { OrderWithDetails, OrderStatus, User } from '@/lib/types';

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [riders, setRiders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [assigningOrder, setAssigningOrder] = useState<OrderWithDetails | null>(null);
  const [intakeOrder, setIntakeOrder] = useState<OrderWithDetails | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState('');

  async function loadData() {
    try {
      const res = await fetch('/api/orders?limit=50');
      const json = await res.json();
      if (json.data) setOrders(json.data);

      const supabase = createClient();
      const { data: ridersData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'rider')
        .eq('is_active', true);

      if (ridersData) {
        setRiders(ridersData as User[]);
        if (ridersData.length > 0 && !selectedRiderId) {
          setSelectedRiderId(ridersData[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load staff orders:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleStatusChange(orderId: string, targetStatus: OrderStatus) {
    const orderToAdvance = orders.find((o) => o.id === orderId);
    if (orderToAdvance && orderToAdvance.status === 'at_facility' && targetStatus === 'washing') {
      setIntakeOrder(orderToAdvance);
      return;
    }

    setUpdating(true);
    setActionError('');
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          note: `Staff updated status to ${targetStatus}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionError(json.error?.message || 'Failed to update order status');
      } else {
        loadData();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder((prev) => prev ? { ...prev, status: targetStatus } : null);
        }
      }
    } catch {
      setActionError('Network error updating status');
    } finally {
      setUpdating(false);
    }
  }

  async function handleConfirmIntake(data: any) {
    if (!intakeOrder) return;
    setUpdating(true);
    setActionError('');
    try {
      const res = await fetch(`/api/orders/${intakeOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'washing',
          intake: data,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionError(json.error?.message || 'Failed to record intake');
      } else {
        loadData();
        setIntakeOrder(null);
      }
    } catch {
      setActionError('Network error recording intake');
    } finally {
      setUpdating(false);
    }
  }

  async function handleAssignRider(e: React.FormEvent) {
    e.preventDefault();
    if (!assigningOrder || !selectedRiderId) return;

    setUpdating(true);
    setActionError('');

    try {
      const res = await fetch(`/api/orders/${assigningOrder.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_id: selectedRiderId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionError(json.error?.message || 'Failed to assign rider');
      } else {
        setAssigningOrder(null);
        loadData();
      }
    } catch {
      setActionError('Network error assigning rider');
    } finally {
      setUpdating(false);
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    return o.status === statusFilter;
  });

  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Branch Order Management</h1>
          <p className="page-heading__subtitle">
            Inspect customer laundry items, AI recommendations, dispatch riders, and track progress.
          </p>
        </div>
      </div>

      {actionError && (
        <div className="toast toast--error" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">{actionError}</div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 'var(--space-4)',
      }}>
        {[
          { key: 'all', label: 'All Orders' },
          { key: 'pending', label: 'Pending' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'at_facility', label: 'At Facility' },
          { key: 'washing', label: 'Washing' },
          { key: 'ready_for_delivery', label: 'Ready for Dispatch' },
          { key: 'delivery_en_route', label: 'Out for Delivery' },
          { key: 'completed', label: 'Completed' },
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

      {/* Orders Table */}
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--space-4)' }}>
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 60 }} />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-10) 0' }}>
            <div className="empty-state__icon">📋</div>
            <p className="empty-state__title">No orders in this category</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Assigned Rider</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const nextOptions = getNextStatuses(order.status as OrderStatus, 'staff');
                  const statusColor = getOrderStatusColor(order.status as OrderStatus);

                  return (
                    <tr key={order.id}>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          style={{
                            fontWeight: 'var(--font-bold)',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-primary-light)',
                            textDecoration: 'underline',
                          }}
                        >
                          {order.order_number}
                        </button>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {new Date(order.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{order.customer?.full_name || 'Customer'}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{order.customer?.phone || '—'}</div>
                      </td>
                      <td>
                        <span className={`status-badge status-badge--${statusColor}`}>
                          {formatOrderStatus(order.status as OrderStatus)}
                        </span>
                      </td>
                      <td>
                        {order.rider ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>🏍️</span>
                            <span style={{ fontSize: 'var(--text-sm)' }}>{order.rider.full_name}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => setAssigningOrder(order)}
                          >
                            + Assign Rider
                          </button>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: 'var(--text-sm)' }}>
                          {order.order_items?.length || 0} types ({order.order_items?.reduce((s, i) => s + i.quantity, 0) || 0} pcs)
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatPeso(order.total)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {nextOptions.filter((s) => s !== 'cancelled').slice(0, 2).map((nextStatus) => (
                            <button
                              key={nextStatus}
                              type="button"
                              className="btn btn--primary btn--sm"
                              disabled={updating}
                              onClick={() => handleStatusChange(order.id, nextStatus)}
                            >
                              {formatOrderStatus(nextStatus)}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rider Assignment Modal */}
      {assigningOrder && (
        <div className="modal-backdrop" onClick={() => setAssigningOrder(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Assign Rider</h2>
              <button className="modal__close" onClick={() => setAssigningOrder(null)}>✕</button>
            </div>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
              Assigning a delivery driver for order <strong>{assigningOrder.order_number}</strong>.
            </p>

            <form onSubmit={handleAssignRider}>
              <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
                <label className="input-group__label">Select Active Branch Rider</label>
                {riders.length === 0 ? (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>
                    No active riders found for this branch. Invite riders from Manager &gt; Invites.
                  </p>
                ) : (
                  <select
                    className="input"
                    value={selectedRiderId}
                    onChange={(e) => setSelectedRiderId(e.target.value)}
                  >
                    {riders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.full_name} ({r.phone || r.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="modal__footer">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setAssigningOrder(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={updating || riders.length === 0}
                >
                  {updating ? <span className="btn__spinner" /> : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal / Drawer */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h2 className="modal__title" style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                  {selectedOrder.order_number}
                </h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <span className={`status-badge status-badge--${getOrderStatusColor(selectedOrder.status as OrderStatus)}`}>
                    {formatOrderStatus(selectedOrder.status as OrderStatus)}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: selectedOrder.payment_method === 'online' ? '#EFF6FF' : '#FEF3C7',
                    color: selectedOrder.payment_method === 'online' ? '#1D4ED8' : '#B45309',
                  }}>
                    {selectedOrder.payment_method === 'online' ? '💳 Online Payment' : '💵 Cash on Delivery'}
                  </span>
                </div>
              </div>
              <button className="modal__close" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Customer & Location Info */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: 14 }}>
                <div style={{ fontSize: 10, color: '#0284C7', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em', marginBottom: 4 }}>
                  Customer Details
                </div>
                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{selectedOrder.customer?.full_name}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{selectedOrder.customer?.email} • {selectedOrder.customer?.phone || 'No phone'}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, fontSize: 12, color: '#334155', borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                  <div><strong>Pickup:</strong> {selectedOrder.pickup_address}</div>
                  <div><strong>Delivery:</strong> {selectedOrder.delivery_address}</div>
                </div>
              </div>

              {/* Verified Scale Weight & Billing Summary */}
              <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 'var(--radius-md)', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#0369A1', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                      Weight &amp; Bill
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0284C7', marginTop: 2 }}>
                      {selectedOrder.weight_kg ? `⚖️ ${selectedOrder.weight_kg} kg Verified` : 'Pending Intake Scale Weight'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 11, color: '#64748B' }}>Total Amount</span>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                      {formatPeso(selectedOrder.total)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Laundry Items with AI Wash Care Rules */}
              {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                    Laundry Inspection Tags &amp; AI Wash Rules
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedOrder.order_items.map((it) => (
                      <div key={it.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>
                            {it.quantity}x {it.clothing_type.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', background: '#E0F2FE', padding: '2px 8px', borderRadius: 4 }}>
                            Included in Load
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                          Fabric: {it.fabric_type} • Tone: {it.color_category}
                          {it.has_stains && ` • Pre-treat stain: ${it.stain_description || 'Yes'}`}
                        </div>
                        {it.wash_recommendation && (
                          <div style={{
                            marginTop: 6,
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: '#F0F9FF',
                            border: '1px solid #BAE6FD',
                            fontSize: '11px',
                            color: '#0369A1',
                          }}>
                            🫧 <strong>{it.wash_recommendation.wash_program}</strong> cycle • {it.wash_recommendation.water_temp} water
                            {it.wash_recommendation.special_handling?.length > 0 && ` • ${it.wash_recommendation.special_handling.join(', ')}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tier A4: Intake Discrepancy Alert */}
              {selectedOrder.intake_discrepancy_note && (
                <div style={{
                  background: '#FFFBEB',
                  border: '1.5px solid #FDE68A',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ⚠️ Counter Intake Discrepancy Remark
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginTop: 2 }}>
                    &ldquo;{selectedOrder.intake_discrepancy_note}&rdquo;
                  </div>
                </div>
              )}

              {/* Photo Proofs Thumbnails */}
              {(selectedOrder.picked_up_proof_url || selectedOrder.delivery_proof_url) && (
                <div style={{ display: 'grid', gridTemplateColumns: selectedOrder.picked_up_proof_url && selectedOrder.delivery_proof_url ? '1fr 1fr' : '1fr', gap: 10 }}>
                  {selectedOrder.picked_up_proof_url && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', marginBottom: 4 }}>🧺 Bag Pickup Proof</div>
                      <div style={{ height: 90, borderRadius: 4, overflow: 'hidden' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedOrder.picked_up_proof_url} alt="Pickup Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </div>
                  )}
                  {selectedOrder.delivery_proof_url && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', marginBottom: 4 }}>✓ Delivery Proof Handover</div>
                      <div style={{ height: 90, borderRadius: 4, overflow: 'hidden' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedOrder.delivery_proof_url} alt="Delivery Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status advancement options */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
                <h3 style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                  Advance Order Status
                </h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {getNextStatuses(selectedOrder.status as OrderStatus, 'staff').map((nextStatus) => (
                    <button
                      key={nextStatus}
                      type="button"
                      className={`btn ${nextStatus === 'cancelled' ? 'btn--danger' : 'btn--primary'}`}
                      disabled={updating}
                      onClick={() => handleStatusChange(selectedOrder.id, nextStatus)}
                    >
                      Set to &quot;{formatOrderStatus(nextStatus)}&quot;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

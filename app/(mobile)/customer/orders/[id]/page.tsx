'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import { useOrderRealtime, useRiderLocationRealtime } from '@/lib/supabase/realtime';
import LiveTrackingMap from '@/components/maps/LiveTrackingMap';
import PaymentModal from '@/components/payments/PaymentModal';
import type { OrderWithDetails, OrderStatus, RiderLocation } from '@/lib/types';

// Stages in logical sequence for visualization
const ORDER_STAGES: { key: OrderStatus; label: string; icon: string; desc: string }[] = [
  { key: 'pending', label: 'Order Placed', icon: '📝', desc: 'Awaiting confirmation' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅', desc: 'Branch confirmed your order' },
  { key: 'rider_assigned', label: 'Rider Assigned', icon: '🏍️', desc: 'Rider heading to pickup' },
  { key: 'pickup_en_route', label: 'Pickup En Route', icon: '📍', desc: 'Rider near your location' },
  { key: 'picked_up', label: 'Picked Up', icon: '🧺', desc: 'Laundry in transit to branch' },
  { key: 'at_facility', label: 'At Facility', icon: '🏪', desc: 'Arrived at laundry shop' },
  { key: 'washing', label: 'Washing', icon: '🫧', desc: 'Custom AI wash cycle active' },
  { key: 'drying', label: 'Drying', icon: '💨', desc: 'Tumble or flat drying' },
  { key: 'folding', label: 'Folding & Packing', icon: '👕', desc: 'Folded & quality checked' },
  { key: 'ready_for_delivery', label: 'Ready for Dispatch', icon: '📦', desc: 'Packaged for delivery' },
  { key: 'delivery_en_route', label: 'Out for Delivery', icon: '🛵', desc: 'Rider on the way to you' },
  { key: 'delivered', label: 'Delivered', icon: '🎉', desc: 'Handed over to customer' },
  { key: 'completed', label: 'Completed', icon: '⭐', desc: 'Order closed' },
];

export default function CustomerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [liveRiderCoord, setLiveRiderCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<any | null>(null);
  const [error, setError] = useState('');

  async function loadOrder() {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const json = await res.json();
      if (json.data) {
        setOrder(json.data);

        // Fetch latest rider GPS ping if available
        try {
          const locRes = await fetch(`/api/riders/location?order_id=${id}`);
          const locJson = await locRes.json();
          if (locJson.data) {
            setLiveRiderCoord({
              lat: locJson.data.latitude,
              lng: locJson.data.longitude,
            });
          }
        } catch {}
      } else {
        setError(json.error?.message || 'Failed to load order');
      }
    } catch {
      setError('Network error loading order');
    } finally {
      setLoading(false);
    }
  }

  // Initial load + fallback poll
  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 8000);
    return () => clearInterval(interval);
  }, [id]);

  // Realtime Supabase subscription for instant status updates
  useOrderRealtime(id, {
    onOrderUpdate: (updated) => {
      setOrder((prev) => prev ? { ...prev, ...updated } : null);
    },
    onNewStatusEvent: () => {
      loadOrder();
    },
  });

  // Realtime GPS ping subscription
  useRiderLocationRealtime(id, (locationPing: RiderLocation) => {
    setLiveRiderCoord({
      lat: locationPing.latitude,
      lng: locationPing.longitude,
    });
  });

  async function handleCancelOrder() {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          note: 'Cancelled by customer',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error?.message || 'Failed to cancel order');
      } else {
        loadOrder();
      }
    } catch {
      alert('Error cancelling order');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="fade-in">
        <div className="skeleton" style={{ height: 28, width: '50%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!order || error) {
    return (
      <div className="fade-in empty-state">
        <div className="empty-state__icon">⚠️</div>
        <p className="empty-state__title">Order Not Found</p>
        <p className="empty-state__description">{error || 'Could not find the requested order.'}</p>
        <Link href="/customer/orders" className="btn btn--secondary" style={{ marginTop: 'var(--space-4)' }}>
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const currentStageIndex = ORDER_STAGES.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'cancelled';
  const statusColor = getOrderStatusColor(order.status);
  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const isPaid = Boolean(
    paymentReceipt ||
    (order.payments && (order.payments as any[]).some((p: any) => p.status === 'paid')) ||
    ['delivered', 'completed'].includes(order.status)
  );

  // Show Mapbox map for all active orders
  const showLiveMap = !isCancelled;
  const isPickupStage = ['pending', 'confirmed', 'rider_assigned', 'pickup_en_route', 'picked_up'].includes(order.status);

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-10)' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <Link href="/customer/orders" style={{ fontSize: 'var(--text-sm)', color: '#0284C7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Back
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {showLiveMap && <div className="pulse-dot" />}
          <span className={`status-badge status-badge--${statusColor}`}>
            {formatOrderStatus(order.status)}
          </span>
        </div>
      </div>

      {/* Order Number & Meta */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
          {order.order_number}
        </h1>
        <p style={{ color: '#64748B', fontSize: 'var(--text-xs)', marginTop: 2 }}>
          Placed on {new Date(order.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>

      {/* ================= Real-Time Mapbox Tracking Map ================= */}
      {showLiveMap && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <LiveTrackingMap
            branchLocation={order.branch ? {
              lat: order.branch.latitude,
              lng: order.branch.longitude,
              label: order.branch.name,
            } : undefined}
            targetLocation={{
              lat: isPickupStage ? order.pickup_latitude : order.delivery_latitude,
              lng: isPickupStage ? order.pickup_longitude : order.delivery_longitude,
            }}
            riderLocation={liveRiderCoord}
            riderName={order.rider?.full_name}
            orderStatus={order.status}
            targetLabel={isPickupStage ? 'Pickup Address' : 'Delivery Address'}
            orderNumber={order.order_number}
            isSimulating={!liveRiderCoord}
          />
        </div>
      )}

      {/* ETA Banner */}
      {!isCancelled && order.delivery_estimated_at && (
        <div className="card" style={{
          marginBottom: 'var(--space-4)',
          background: '#F0F9FF',
          border: '1px solid #BAE6FD',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.5rem' }}>⏱️</span>
            <div>
              <div style={{ fontSize: '11px', color: '#0369A1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Estimated Ready &amp; Delivery Time
              </div>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 800, color: '#0284C7', marginTop: 2 }}>
                {new Date(order.delivery_estimated_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                {' '}({new Date(order.delivery_estimated_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancelled Banner */}
      {isCancelled && (
        <div className="toast toast--error" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">This order was cancelled.</div>
        </div>
      )}

      {/* Assigned Rider Card */}
      {order.rider && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', border: '1px solid #BAE6FD', background: '#F8FCFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div className="avatar avatar--md">
                {order.rider.full_name?.charAt(0) || 'R'}
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#0284C7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Assigned Rider
                </div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#0F172A' }}>
                  {order.rider.full_name}
                </div>
              </div>
            </div>
            {order.rider.phone && (
              <a
                href={`tel:${order.rider.phone}`}
                className="btn btn--secondary btn--sm"
                style={{ borderRadius: 'var(--radius-full)', border: '1px solid #BAE6FD', color: '#0284C7' }}
              >
                📞 Call Rider
              </a>
            )}
          </div>
        </div>
      )}

      {/* Interactive Status Timeline */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-4)', color: '#0F172A' }}>
          Live Status Timeline
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', position: 'relative' }}>
          {ORDER_STAGES.map((stage, idx) => {
            const isPassed = !isCancelled && currentStageIndex >= idx;
            const isCurrent = !isCancelled && currentStageIndex === idx;

            return (
              <div
                key={stage.key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-3)',
                  opacity: isPassed ? 1 : 0.35,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 'var(--radius-full)',
                  background: isCurrent
                    ? '#0284C7'
                    : isPassed
                    ? '#10B981'
                    : '#F1F5F9',
                  border: isCurrent ? '2px solid #38BDF8' : isPassed ? 'none' : '1px solid #CBD5E1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: isPassed ? 'white' : '#64748B', flexShrink: 0,
                  boxShadow: isCurrent ? '0 0 12px rgba(2, 132, 199, 0.3)' : 'none',
                }}>
                  {isPassed && !isCurrent ? '✓' : stage.icon}
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#0284C7' : '#0F172A' }}>
                    {stage.label}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: '#64748B' }}>
                    {stage.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Items & AI Wash Advice Breakdown (if logged at facility) */}
      {order.order_items && order.order_items.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-3)', color: '#0F172A' }}>
            Laundry Items &amp; AI Care Rules
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {order.order_items.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '12px 14px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#0F172A' }}>
                    {item.quantity}x {item.clothing_type.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', background: '#E0F2FE', padding: '2px 8px', borderRadius: 4 }}>
                    Included in Load
                  </div>
                </div>

              <div style={{ fontSize: 'var(--text-xs)', color: '#64748B', marginTop: 2 }}>
                Fabric: {item.fabric_type} • Tone: {item.color_category}
                {item.has_stains && ` • Stain: ${item.stain_description || 'Yes'}`}
              </div>

              {item.wash_recommendation && (
                <div style={{
                  marginTop: 6,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  fontSize: '11px',
                  color: '#0369A1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <span>🫧</span>
                  <span>
                    Cycle: <strong>{item.wash_recommendation.wash_program}</strong> ({item.wash_recommendation.water_temp} water)
                    {item.wash_recommendation.special_handling?.length > 0 && ` • ${item.wash_recommendation.special_handling.join(', ')}`}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )}

      {/* Delivery Handover Proof (if delivered) */}
      {order.delivery_proof_url && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
              ✓ Delivery Proof Handover
            </div>
            <span style={{ fontSize: 11, color: '#15803D', fontWeight: 700 }}>Verified</span>
          </div>
          <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 160 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.delivery_proof_url}
              alt="Delivery Proof"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      )}

      {/* Bill & Logistics Breakdown */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-3)', color: '#0F172A' }}>
          Payment &amp; Weighing Summary
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--text-sm)' }}>
          {/* Payment Method Badge */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: order.payment_method === 'online' ? '#EFF6FF' : '#FEF3C7',
            border: order.payment_method === 'online' ? '1px solid #BFDBFE' : '1px solid #FDE68A',
            marginBottom: 4,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: order.payment_method === 'online' ? '#1E40AF' : '#92400E' }}>
              Payment Method: {order.payment_method === 'online' ? '💳 Online (GCash/Maya/Card)' : '💵 Cash on Delivery (COD)'}
            </span>
            {order.cash_collected ? (
              <span style={{ fontSize: 10, fontWeight: 800, color: '#15803D', background: '#DCFCE7', padding: '2px 6px', borderRadius: 4 }}>
                Cash Collected
              </span>
            ) : null}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
            <span>Pickup Address</span>
            <span style={{ color: '#0F172A', maxWidth: 200, textAlign: 'right', fontWeight: 500 }}>{order.pickup_address}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
            <span>Delivery Address</span>
            <span style={{ color: '#0F172A', maxWidth: 200, textAlign: 'right', fontWeight: 500 }}>{order.delivery_address}</span>
          </div>
          {order.special_instructions && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
              <span>Special Notes</span>
              <span style={{ color: '#0F172A', maxWidth: 200, textAlign: 'right' }}>{order.special_instructions}</span>
            </div>
          )}

          <div className="divider" style={{ margin: '8px 0' }} />

          {/* Scale Weight Log */}
          {order.weight_kg ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369A1', background: '#F0F9FF', padding: '6px 10px', borderRadius: 4, fontWeight: 600 }}>
              <span>⚖️ Verified Scale Weight</span>
              <span style={{ fontWeight: 800 }}>{order.weight_kg} kg</span>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: 12 }}>
              <span>⚖️ Scale Weight</span>
              <span>Pending Arrival at Facility</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
            <span>Wash-Dry-Fold Subtotal</span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>{formatPeso(order.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
            <span>Delivery Fee</span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>{formatPeso(order.delivery_fee)}</span>
          </div>

          <div className="divider" style={{ margin: '8px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-md)', fontWeight: 800 }}>
            <span style={{ color: '#0F172A' }}>Total Amount</span>
            <span style={{ fontSize: 20, color: '#0284C7' }}>{formatPeso(order.total)}</span>
          </div>

          {/* Payment Settlement Status Badge */}
          {order.payment_method === 'online' ? (
            isPaid ? (
              <div style={{
                marginTop: 8,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 'var(--text-xs)',
              }}>
                <span style={{ color: '#065F46', fontWeight: 700 }}>
                  ✓ Paid Online ({paymentReceipt?.payment_method?.toUpperCase() || 'VERIFIED'})
                </span>
                <span style={{ fontSize: 10, color: '#047857', fontWeight: 600 }}>Settled</span>
              </div>
            ) : (
              <div style={{
                marginTop: 8,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 'var(--text-xs)',
              }}>
                <span style={{ color: '#1E40AF', fontWeight: 700 }}>
                  💳 Online Payment Pending
                </span>
                <span style={{ fontSize: 10, color: '#2563EB', fontWeight: 600 }}>Unpaid</span>
              </div>
            )
          ) : (
            <div style={{
              marginTop: 8,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: order.cash_collected || ['delivered', 'completed'].includes(order.status) ? '#ECFDF5' : '#FFFBEB',
              border: order.cash_collected || ['delivered', 'completed'].includes(order.status) ? '1px solid #A7F3D0' : '1px solid #FDE68A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 'var(--text-xs)',
            }}>
              <span style={{ color: order.cash_collected || ['delivered', 'completed'].includes(order.status) ? '#065F46' : '#92400E', fontWeight: 700 }}>
                {order.cash_collected || ['delivered', 'completed'].includes(order.status) ? '✓ Cash Collected by Rider' : `💵 Pay ${formatPeso(order.total)} to Rider upon Delivery`}
              </span>
              <span style={{ fontSize: 10, color: '#047857', fontWeight: 600 }}>
                {order.cash_collected || ['delivered', 'completed'].includes(order.status) ? 'Settled' : 'COD'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Online Payment Button (Only when unpaid and order is active / not yet completed) */}
      {!isCancelled && !['delivered', 'completed'].includes(order.status) && order.payment_method === 'online' && !isPaid && (
        <button
          type="button"
          className="btn btn--primary btn--full btn--lg"
          style={{ marginBottom: 'var(--space-3)' }}
          onClick={() => setIsPaymentOpen(true)}
        >
          💳 Pay {formatPeso(order.total)} Online (GCash / Maya / Card)
        </button>
      )}

      {/* Action buttons */}
      {canCancel && (
        <button
          type="button"
          className="btn btn--danger btn--full"
          disabled={cancelling}
          onClick={handleCancelOrder}
        >
          {cancelling ? <span className="btn__spinner" /> : 'Cancel Order'}
        </button>
      )}

      {/* Payment Checkout Modal */}
      <PaymentModal
        orderId={order.id}
        orderNumber={order.order_number}
        amount={order.total}
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onPaymentSuccess={(receipt) => {
          setPaymentReceipt(receipt);
          loadOrder();
        }}
      />
    </div>
  );
}

'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import { useOrderRealtime, useRiderLocationRealtime } from '@/lib/supabase/realtime';
import LiveTrackingMap from '@/components/maps/LiveTrackingMap';
import PaymentModal from '@/components/payments/PaymentModal';
import QrCodeDisplay from '@/components/common/QrCodeDisplay';
import LaundryIcons from '@/components/common/LaundryIcons';
import type { OrderWithDetails, OrderStatus, RiderLocation, OrderRating } from '@/lib/types';

// Streamlined 4-stage laundry lifecycle
const STREAMLINED_LIFECYCLE: {
  id: string;
  label: string;
  desc: string;
  icon: keyof typeof LaundryIcons;
  matches: OrderStatus[];
}[] = [
  {
    id: 'stage-pickup',
    label: 'Pickup & Weighing',
    desc: 'Rider scale intake & instant pricing',
    icon: 'Scale',
    matches: ['pending', 'confirmed', 'rider_assigned', 'pickup_en_route', 'picked_up'],
  },
  {
    id: 'stage-processing',
    label: 'In Processing',
    desc: 'Wash, dry, fold & fabric care',
    icon: 'Washer',
    matches: ['at_facility', 'washing', 'drying', 'folding'],
  },
  {
    id: 'stage-dispatch',
    label: 'Ready & Out for Delivery',
    desc: 'En route to customer doorstep',
    icon: 'DeliveryScooter',
    matches: ['ready_for_delivery', 'delivery_en_route'],
  },
  {
    id: 'stage-completed',
    label: 'Delivered & Closed',
    desc: 'Fresh laundry safely handed over',
    icon: 'CheckmarkBadge',
    matches: ['delivered', 'completed'],
  },
];

export default function CustomerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [liveRiderCoord, setLiveRiderCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [switchingPayment, setSwitchingPayment] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<any | null>(null);
  const [error, setError] = useState('');

  // Star Rating state
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingNote, setRatingNote] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [existingRating, setExistingRating] = useState<OrderRating | null>(null);

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

        // Fetch rating if completed
        if (['delivered', 'completed'].includes(json.data.status)) {
          fetch(`/api/orders/${id}/rating`)
            .then((r) => r.json())
            .then((rJson) => {
              if (rJson.data) {
                setExistingRating(rJson.data);
                setRatingSubmitted(true);
              }
            })
            .catch(() => {});
        }
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
      setOrder((prev) => (prev ? { ...prev, ...updated } : null));
    },
    onNewStatusEvent: () => {
      loadOrder();
    },
  });

  // Realtime GPS ping subscription
  useRiderLocationRealtime(
    id,
    (locationPing: RiderLocation) => {
      setLiveRiderCoord({
        lat: locationPing.latitude,
        lng: locationPing.longitude,
      });
    },
    order?.rider_id
  );

  async function handleTogglePaymentMethod() {
    if (!order) return;
    const target = order.payment_method === 'online' ? 'cash' : 'online';
    setSwitchingPayment(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: target }),
      });
      const json = await res.json();
      if (res.ok) {
        setOrder((prev) => (prev ? { ...prev, payment_method: target } : null));
      } else {
        alert(json.error?.message || 'Failed to switch payment method');
      }
    } catch {
      alert('Error updating payment preference');
    } finally {
      setSwitchingPayment(false);
    }
  }

  async function handleCancelOrder() {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancellation_reason: 'Cancelled by customer',
          note: 'Customer requested cancellation',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error?.message || 'Failed to cancel order');
      } else {
        loadOrder();
      }
    } catch {
      alert('Network error cancelling order');
    } finally {
      setCancelling(false);
    }
  }

  async function handleRatingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/orders/${id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stars: ratingStars,
          note: ratingNote.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setExistingRating(json.data);
        setRatingSubmitted(true);
      } else {
        alert(json.error?.message || 'Failed to submit rating');
      }
    } catch {
      alert('Error submitting rating');
    } finally {
      setSubmittingRating(false);
    }
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: '16px 0' }}>
        <div style={{ height: 180, background: '#F3EFE6', borderRadius: 16, marginBottom: 16 }} />
        <div style={{ height: 260, background: '#F3EFE6', borderRadius: 16, marginBottom: 16 }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flat-block" style={{ textAlign: 'center', padding: '32px 16px' }}>
        <p style={{ color: '#BE123C', fontWeight: 600 }}>{error || 'Order not found'}</p>
        <Link
          href="/customer/orders"
          className="btn btn--secondary btn--sm"
          style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <LaundryIcons.ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to Orders
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const statusColor = getOrderStatusColor(order.status);
  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const isPaid = Boolean(
    paymentReceipt ||
    (order.payments && (order.payments as any[]).some((p: any) => p.status === 'paid')) ||
    order.cash_collected ||
    ['delivered', 'completed'].includes(order.status)
  );

  const showLiveMap = !isCancelled;
  const isPickupStage = ['pending', 'confirmed', 'rider_assigned', 'pickup_en_route'].includes(order.status);

  // Compute active streamlined stage index
  const activeStageIdx = STREAMLINED_LIFECYCLE.findIndex((st) => st.matches.includes(order.status));

  return (
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      {/* Top Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Link
          href="/customer/orders"
          style={{
            fontSize: 13,
            color: 'var(--color-primary)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
          }}
        >
          <LaundryIcons.ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
          <span>Orders</span>
        </Link>
        <span className={`status-badge status-badge--${statusColor}`}>
          {formatOrderStatus(order.status)}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP SPOTLIGHT TICKET: VERIFIED SCALE WEIGHT & INSTANT PRICING           */}
      {/* ========================================================================= */}
      <div
        className="spotlight-ticket"
        style={{
          background: '#0E7490',
          color: '#FFFFFF',
          borderRadius: 18,
          padding: '20px 20px 18px',
          marginBottom: 18,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85, fontWeight: 700 }}>
              Order Reference
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, letterSpacing: '0.02em', marginTop: 2 }}>
              {order.order_number}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85, fontWeight: 700 }}>
              Shop Branch
            </div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {order.branch?.name || 'San Juan Central Hub'}
            </div>
          </div>
        </div>

        {/* Big Dual Spotlight: Verified Weight & Total Amount */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9, fontSize: 11, fontWeight: 700 }}>
              <LaundryIcons.Scale size={14} color="#A5F3FC" />
              <span>Doorstep Scale</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800, marginTop: 4, letterSpacing: '-0.02em' }}>
              {order.weight_kg ? `${Number(order.weight_kg).toFixed(1)} kg` : '-- kg'}
            </div>
            <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
              {order.weight_kg ? 'Verified on Rider Scale' : 'Weighing at pickup'}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9, fontSize: 11, fontWeight: 700 }}>
              <LaundryIcons.ReceiptTicket size={14} color="#FEF08A" />
              <span>Total Price</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800, marginTop: 4, color: '#FEF08A', letterSpacing: '-0.02em' }}>
              {formatPeso(order.total)}
            </div>
            <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
              {order.weight_kg
                ? `${order.weight_kg}kg × ₱${(order.branch as any)?.price_per_kg ? ((order.branch as any).price_per_kg / 100).toFixed(0) : '35'}/kg + ${formatPeso(order.delivery_fee)} del.`
                : 'Auto-computed at scale'}
            </div>
          </div>
        </div>

        {/* Payment Action / Remote Settlement (GCash/Maya/Card) */}
        {!isCancelled && !['delivered', 'completed'].includes(order.status) && (
          <div>
            {order.payment_method === 'online' ? (
              isPaid ? (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.25)',
                    padding: '8px 12px',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LaundryIcons.CheckmarkBadge size={14} color="#86EFAC" />
                    Paid Online ({paymentReceipt?.payment_method?.toUpperCase() || 'VERIFIED'})
                  </span>
                  <span style={{ fontSize: 10, background: '#10B981', padding: '2px 8px', borderRadius: 4 }}>
                    Settled
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setIsPaymentOpen(true)}
                    style={{
                      width: '100%',
                      background: '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '12px 14px',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
                    }}
                  >
                    <LaundryIcons.ReceiptTicket size={18} color="#FFFFFF" />
                    <span>Pay {formatPeso(order.total)} via GCash / Maya</span>
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, opacity: 0.9 }}>
                    <span>Not at home? Pay remotely anytime</span>
                    <button
                      type="button"
                      onClick={handleTogglePaymentMethod}
                      disabled={switchingPayment}
                      style={{ background: 'none', border: 'none', color: '#A5F3FC', textDecoration: 'underline', cursor: 'pointer', fontSize: 11 }}
                    >
                      {switchingPayment ? 'Switching...' : 'Switch to Cash (COD)'}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.12)', padding: '8px 12px', borderRadius: 10, fontSize: 12 }}>
                <div>
                  <span style={{ fontWeight: 700 }}>Payment Method: </span>
                  <span>Cash on Delivery (COD)</span>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePaymentMethod}
                  disabled={switchingPayment}
                  style={{
                    background: '#FFFFFF',
                    color: '#0E7490',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {switchingPayment ? '...' : 'Pay Online Instead'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. LIVE MAPBOX COURIER TRACKING (Clean Flat Container)                     */}
      {/* ========================================================================= */}
      {showLiveMap && (
        <div style={{ marginBottom: 18, borderRadius: 18, overflow: 'hidden' }}>
          <LiveTrackingMap
            branchLocation={
              order.branch
                ? {
                    lat: order.branch.latitude,
                    lng: order.branch.longitude,
                    label: order.branch.name,
                  }
                : undefined
            }
            targetLocation={{
              lat: isPickupStage ? order.pickup_latitude : order.delivery_latitude,
              lng: isPickupStage ? order.pickup_longitude : order.delivery_longitude,
            }}
            riderLocation={liveRiderCoord}
            riderName={order.rider?.full_name}
            orderStatus={order.status}
            targetLabel={isPickupStage ? 'Pickup Doorstep' : 'Delivery Address'}
            orderNumber={order.order_number}
            isSimulating={!liveRiderCoord}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DOORSTEP QR PASS FOR PICKUP HANDOVER                                   */}
      {/* ========================================================================= */}
      {isPickupStage && !isCancelled && (
        <div className="flat-block" style={{ marginBottom: 18, textAlign: 'center', background: '#F3EFE6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
            <LaundryIcons.QrPass size={16} color="var(--color-primary)" />
            <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-primary)' }}>
              Pickup Verification Pass
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Present this code to the rider when they arrive with the portable scale.
          </p>
          <div style={{ display: 'inline-block', background: '#FFFFFF', padding: 12, borderRadius: 12 }}>
            <QrCodeDisplay
              value={order.order_number}
              orderNumber={order.order_number}
              label="GoWashGo Doorstep Pass"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ASSIGNED RIDER DISPATCH CARD                                           */}
      {/* ========================================================================= */}
      {order.rider && (
        <div className="flat-block" style={{ marginBottom: 18, background: '#ECFEFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--color-primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 16,
                }}
              >
                {order.rider.full_name?.charAt(0) || 'R'}
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-primary)', fontWeight: 800 }}>
                  Assigned Courier
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-dark)' }}>
                  {order.rider.full_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <LaundryIcons.DeliveryScooter size={12} color="var(--color-primary)" />
                  <span>Equipped with portable scale</span>
                </div>
              </div>
            </div>

            {order.rider.phone && (
              <a
                href={`tel:${order.rider.phone}`}
                style={{
                  background: '#FFFFFF',
                  color: 'var(--color-primary)',
                  padding: '8px 12px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <LaundryIcons.Phone size={14} color="var(--color-primary)" />
                <span>Call</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. STREAMLINED 4-STAGE LAUNDRY CARE TIMELINE                              */}
      {/* ========================================================================= */}
      <div className="flat-block" style={{ marginBottom: 18, background: '#FAF8F5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <LaundryIcons.CareTag size={18} color="var(--color-primary)" />
          <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Laundry Processing Lifecycle
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
          {STREAMLINED_LIFECYCLE.map((stage, idx) => {
            const isPassed = !isCancelled && activeStageIdx >= idx;
            const isCurrent = !isCancelled && activeStageIdx === idx;
            const IconComp = LaundryIcons[stage.icon] || LaundryIcons.Washer;

            return (
              <div
                key={stage.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  opacity: isPassed ? 1 : 0.4,
                  transition: 'opacity 0.2s',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: isCurrent
                      ? 'var(--color-primary)'
                      : isPassed
                      ? '#10B981'
                      : '#E7E2D8',
                    color: isPassed ? '#FFFFFF' : '#8C827A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconComp size={18} color={isPassed ? '#FFFFFF' : '#8C827A'} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: isCurrent ? 800 : 700,
                      color: isCurrent ? 'var(--color-primary)' : 'var(--color-text-dark)',
                    }}
                  >
                    {stage.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {stage.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. VERIFIED BAG PROOFS (Pickup & Delivery Photo Blocks)                    */}
      {/* ========================================================================= */}
      {order.picked_up_proof_url && (
        <div className="flat-block" style={{ marginBottom: 18, background: '#F3EFE6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <LaundryIcons.Camera size={14} color="var(--color-primary)" /> Doorstep Scale & Bag Photo
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#ECFEFF', color: '#0E7490', padding: '2px 8px', borderRadius: 4 }}>
              Verified Handover
            </span>
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', height: 180, background: '#000000' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.picked_up_proof_url}
              alt="Pickup Scale Proof"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      )}

      {order.delivery_proof_url && (
        <div className="flat-block" style={{ marginBottom: 18, background: '#ECFDF5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#065F46', display: 'flex', alignItems: 'center', gap: 6 }}>
              <LaundryIcons.CheckmarkBadge size={14} color="#059669" /> Delivery Handover Proof
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#D1FAE5', color: '#047857', padding: '2px 8px', borderRadius: 4 }}>
              Delivered
            </span>
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', height: 180, background: '#000000' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.delivery_proof_url}
              alt="Delivery Proof"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. ADDRESS & LOGISTICS SUMMARY                                            */}
      {/* ========================================================================= */}
      <div className="flat-block" style={{ marginBottom: 18, background: '#F3EFE6' }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          Logistics Details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Pickup Address</span>
            <span style={{ fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{order.pickup_address}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Delivery Address</span>
            <span style={{ fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{order.delivery_address}</span>
          </div>
          {order.special_instructions && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Special Care Note</span>
              <span style={{ fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{order.special_instructions}</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 8. STAR RATING AFTER COMPLETION                                           */}
      {/* ========================================================================= */}
      {['delivered', 'completed'].includes(order.status) && (
        <div className="flat-block" style={{ marginBottom: 18, background: '#FAF8F5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <LaundryIcons.Sparkles size={16} color="var(--color-accent)" />
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
              Rate Your Wash Experience
            </h3>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Help us maintain top-tier laundry and courier service.
          </p>

          {ratingSubmitted ? (
            <div style={{ background: '#ECFDF5', padding: 12, borderRadius: 10, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    style={{
                      color: s <= (existingRating?.stars || ratingStars) ? '#D97706' : '#D1D5DB',
                      fontSize: 18,
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>
                Thank you for your rating!
              </div>
              {existingRating?.note && (
                <div style={{ fontSize: 11, color: '#047857', marginTop: 2, fontStyle: 'italic' }}>
                  &ldquo;{existingRating.note}&rdquo;
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleRatingSubmit}>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStars(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 26,
                      cursor: 'pointer',
                      color: star <= ratingStars ? '#D97706' : '#D1D5DB',
                      padding: 2,
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Optional review note (e.g. fresh scent, polite rider)..."
                  value={ratingNote}
                  onChange={(e) => setRatingNote(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="submit"
                className="btn btn--primary btn--full btn--sm"
                disabled={submittingRating}
              >
                {submittingRating ? 'Saving...' : 'Submit Rating'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Cancel Order Action */}
      {canCancel && (
        <button
          type="button"
          onClick={handleCancelOrder}
          disabled={cancelling}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            color: '#BE123C',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            padding: 8,
          }}
        >
          {cancelling ? 'Cancelling...' : 'Cancel Order'}
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

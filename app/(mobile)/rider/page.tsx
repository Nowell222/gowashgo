'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import { useRiderGpsTracker } from '@/lib/tracking/rider-gps';
import { LaundryIcons } from '@/components/common/LaundryIcons';
import LiveTrackingMap from '@/components/maps/LiveTrackingMap';
import PhotoCapture from '@/components/common/PhotoCapture';
import type { OrderWithDetails, OrderStatus } from '@/lib/types';

export default function RiderHomePage() {
  const [activeOrder, setActiveOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [gpsEmissionEnabled, setGpsEmissionEnabled] = useState(true);

  // Doorstep Portable Scale Weigh-in state (Pickup)
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [scaleWeight, setScaleWeight] = useState<string>('4.0');
  const [pickupProofUrl, setPickupProofUrl] = useState('');

  // Delivery Handover Modal state
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [cashCollected, setCashCollected] = useState(false);
  const [deliveryProofUrl, setDeliveryProofUrl] = useState('');
  const [queuedOrders, setQueuedOrders] = useState<OrderWithDetails[]>([]);

  // In-app Alert / Dialog Modal state
  const [systemAlert, setSystemAlert] = useState<string | null>(null);

  async function loadActiveOrder() {
    try {
      const res = await fetch('/api/orders');
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const assigned = json.data.filter((o: OrderWithDetails) =>
          ['rider_assigned', 'pickup_en_route', 'picked_up', 'ready_for_delivery', 'delivery_en_route'].includes(o.status)
        );
        setActiveOrder((prev) => {
          const current = prev ? assigned.find((o: OrderWithDetails) => o.id === prev.id) || assigned[0] : assigned[0];
          if (current?.cash_collected) setCashCollected(true);
          if (current?.delivery_proof_url) setDeliveryProofUrl(current.delivery_proof_url);
          if (current?.picked_up_proof_url) setPickupProofUrl(current.picked_up_proof_url);
          if (current?.weight_kg) setScaleWeight(String(current.weight_kg));
          return current || null;
        });
        setQueuedOrders((prev) => {
          const currentId = activeOrder?.id;
          return assigned.filter((o: OrderWithDetails) => o.id !== (currentId || assigned[0]?.id));
        });
      }
    } catch (err) {
      console.error('Error loading rider active assignment:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectStop(order: OrderWithDetails) {
    setActiveOrder(order);
    if (order.cash_collected) setCashCollected(true);
    if (order.delivery_proof_url) setDeliveryProofUrl(order.delivery_proof_url);
    if (order.picked_up_proof_url) setPickupProofUrl(order.picked_up_proof_url);
    if (order.weight_kg) setScaleWeight(String(order.weight_kg));
  }

  useEffect(() => {
    loadActiveOrder();
    const interval = setInterval(loadActiveOrder, 5000);
    return () => clearInterval(interval);
  }, []);

  // Hook in rider GPS tracking engine
  const {
    currentLocation,
    isTracking,
    wakeLockActive,
    pingsSent,
  } = useRiderGpsTracker({
    activeOrderId: activeOrder?.id,
    enabled: gpsEmissionEnabled && !!activeOrder,
  });

  const parsedScaleWeight = parseFloat(scaleWeight) || 0;
  const branchRatePerKg = (activeOrder?.branch as any)?.price_per_kg || 3500;
  const liveComputedSubtotal = Math.round(parsedScaleWeight * branchRatePerKg);
  const liveDeliveryFee = activeOrder?.delivery_fee || 5000;
  const liveComputedTotal = liveComputedSubtotal + liveDeliveryFee;

  const isPickupStage = activeOrder && ['rider_assigned', 'pickup_en_route'].includes(activeOrder.status);

  async function handleAdvanceStatus(targetStatus: OrderStatus) {
    if (!activeOrder) return;

    if (targetStatus === 'picked_up') {
      setIsPickupModalOpen(true);
      return;
    }

    if (targetStatus === 'delivered') {
      setIsHandoverOpen(true);
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          note: `Rider advanced status to ${targetStatus}`,
        }),
      });
      if (res.ok) {
        loadActiveOrder();
      } else {
        const json = await res.json();
        setSystemAlert(json.error?.message || 'Failed to update delivery status');
      }
    } catch {
      setSystemAlert('Network error updating delivery status. Please try again.');
    } finally {
      setUpdating(false);
    }
  }

  // Complete Doorstep Weighing & Pickup with Bag Proof Photo
  async function handleConfirmPickup() {
    if (!activeOrder) return;

    if (parsedScaleWeight <= 0) {
      setSystemAlert('Please enter a valid scale weight greater than 0 kg from your portable scale.');
      return;
    }

    if (!pickupProofUrl) {
      setSystemAlert('A photo proof of the weighed laundry bag is required before confirming pickup.');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'picked_up',
          note: `Rider verified doorstep weight: ${parsedScaleWeight} kg (Total: ${formatPeso(liveComputedTotal)})`,
          weight_kg: parsedScaleWeight,
          picked_up_proof_url: pickupProofUrl,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setIsPickupModalOpen(false);
        loadActiveOrder();
      } else {
        setSystemAlert(json.error?.message || 'Failed to confirm pickup');
      }
    } catch {
      setSystemAlert('Network error confirming pickup');
    } finally {
      setUpdating(false);
    }
  }

  // Complete Handover inside In-App Modal
  async function handleConfirmHandover() {
    if (!activeOrder) return;

    if (activeOrder.payment_method === 'cash' && !cashCollected) {
      setSystemAlert('Please confirm that you have collected cash from the customer.');
      return;
    }

    if (!deliveryProofUrl) {
      setSystemAlert('A delivery handover proof photo is required to complete delivery.');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'delivered',
          note: 'Rider confirmed delivery handover with proof photo',
          cash_collected: activeOrder.payment_method === 'cash' ? cashCollected : true,
          delivery_proof_url: deliveryProofUrl,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setIsHandoverOpen(false);
        loadActiveOrder();
      } else {
        setSystemAlert(json.error?.message || 'Failed to complete delivery');
      }
    } catch {
      setSystemAlert('Network error completing delivery');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="fade-in">
        <div className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-lg)', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* ================= TOP SPOTLIGHT: VERIFIED WEIGHT & INSTANT PRICE ================= */}
      {activeOrder && (
        <div className="spotlight-ticket" style={{ marginTop: 4, marginBottom: 16 }}>
          <div className="spotlight-ticket__header">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LaundryIcons.Scale size={16} color="#B45309" />
              Verified Scale Receipt
            </span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{activeOrder.order_number}</span>
          </div>

          <div className="spotlight-ticket__values">
            <div>
              <div style={{ fontSize: 10, color: '#78716C', textTransform: 'uppercase', fontWeight: 700 }}>
                {activeOrder.weight_kg ? 'Verified Weight' : 'Doorstep Scale'}
              </div>
              <div className="spotlight-ticket__weight">
                {activeOrder.weight_kg ? `${activeOrder.weight_kg} kg` : 'Pending Weigh-in'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#78716C', textTransform: 'uppercase', fontWeight: 700 }}>
                {activeOrder.weight_kg ? 'Instant Total Price' : 'Est. Base Price'}
              </div>
              <div className="spotlight-ticket__price">
                {formatPeso(activeOrder.total)}
              </div>
            </div>
          </div>

          <div className="spotlight-ticket__footer">
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {activeOrder.payment_method === 'online' ? (
                <>
                  <LaundryIcons.CreditCard size={14} color="#0E7490" />
                  Online Payment (GCash / Maya)
                </>
              ) : (
                <>
                  <LaundryIcons.Cash size={14} color="#B45309" />
                  Cash on Delivery (COD)
                </>
              )}
            </span>
            <span style={{ fontWeight: 800, color: activeOrder.weight_kg ? '#0E7490' : '#B45309' }}>
              {activeOrder.weight_kg ? 'Weighed by Courier ✓' : 'Weigh at Doorstep'}
            </span>
          </div>
        </div>
      )}

      {/* Screen Heading */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: '#1C1917', letterSpacing: '-0.02em' }}>
            Courier Cockpit
          </h1>
          <p style={{ color: '#78716C', fontSize: 'var(--text-xs)', marginTop: 2 }}>
            Active pickup &amp; delivery assignment
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="pulse-dot" />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
            Online
          </span>
        </div>
      </div>

      {!activeOrder ? (
        <div className="flat-block flat-block--linen" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
            <LaundryIcons.DeliveryScooter size={48} color="#0E7490" />
          </div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: '#1C1917' }}>No Active Job Assigned</h3>
          <p style={{ color: '#78716C', fontSize: 'var(--text-xs)', marginTop: 4, maxWidth: 280, margin: '4px auto 16px' }}>
            You are ready and on standby. New dispatch assignments from the branch manager will appear here in real time.
          </p>
          <Link href="/rider/orders" className="btn btn--secondary btn--sm">
            View All Branch Orders →
          </Link>
        </div>
      ) : (
        <div>
          {/* Real-time Telemetry Bar */}
          <div className={`flat-block ${isTracking ? 'flat-block--teal' : 'flat-block--amber'}`} style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LaundryIcons.Pin size={18} color={isTracking ? '#0E7490' : '#B45309'} />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: isTracking ? '#0E7490' : '#92400E' }}>
                    {isTracking ? 'GPS Live Tracking Active' : 'Waiting for GPS Lock'}
                  </div>
                  <div style={{ fontSize: '10px', color: isTracking ? '#0891B2' : '#B45309' }}>
                    {pingsSent} pings transmitted • {wakeLockActive ? 'Screen lock prevented' : 'Screen normal'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setGpsEmissionEnabled(!gpsEmissionEnabled)}
                style={{ fontSize: '10px', padding: '4px 8px' }}
              >
                {gpsEmissionEnabled ? 'Pause' : 'Resume'}
              </button>
            </div>
          </div>

          {/* Interactive Mapbox Courier Map */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <LiveTrackingMap
              branchLocation={activeOrder.branch ? {
                lat: activeOrder.branch.latitude,
                lng: activeOrder.branch.longitude,
                label: activeOrder.branch.name,
              } : undefined}
              targetLocation={{
                lat: isPickupStage ? activeOrder.pickup_latitude : activeOrder.delivery_latitude,
                lng: isPickupStage ? activeOrder.pickup_longitude : activeOrder.delivery_longitude,
              }}
              riderLocation={currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : null}
              riderName="You (Rider)"
              orderStatus={activeOrder.status}
              targetLabel={isPickupStage ? 'Customer Pickup' : 'Customer Delivery'}
              orderNumber={activeOrder.order_number}
              isSimulating={!currentLocation}
            />
          </div>

          {/* Active Job Card (Flat Linen Block) */}
          <div className="flat-block flat-block--linen">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#0E7490', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Current Task
                </span>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: '#1C1917', fontFamily: 'var(--font-mono)' }}>
                  {activeOrder.order_number}
                </h2>
              </div>
              <span className={`status-badge status-badge--${getOrderStatusColor(activeOrder.status as OrderStatus)}`}>
                {formatOrderStatus(activeOrder.status as OrderStatus)}
              </span>
            </div>

            {/* Destination Highlight */}
            <div style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', fontWeight: 700 }}>
                {isPickupStage ? 'Pickup Location (Customer)' : 'Delivery Location (Customer)'}
              </div>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: '#1C1917', marginTop: 2 }}>
                {isPickupStage ? activeOrder.pickup_address : activeOrder.delivery_address}
              </div>
            </div>

            {/* Customer Details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EBE5D8', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#1C1917' }}>{activeOrder.customer?.full_name}</div>
                <div style={{ fontSize: '11px', color: '#57534E' }}>
                  {activeOrder.weight_kg ? `${activeOrder.weight_kg} kg verified` : 'Portable scale at pickup'} • {formatPeso(activeOrder.total)}
                </div>
              </div>
              {activeOrder.customer?.phone && (
                <a href={`tel:${activeOrder.customer.phone}`} className="btn btn--primary btn--sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <LaundryIcons.Phone size={14} color="#FFFFFF" />
                  Call
                </a>
              )}
            </div>

            {/* Actions for current rider state */}
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeOrder.status === 'rider_assigned' && (
                <button
                  type="button"
                  className="btn btn--primary btn--lg btn--full"
                  disabled={updating}
                  onClick={() => handleAdvanceStatus('pickup_en_route')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {updating ? <span className="btn__spinner" /> : (
                    <>
                      <LaundryIcons.DeliveryScooter size={20} color="#FFFFFF" />
                      Start Pickup Navigation
                    </>
                  )}
                </button>
              )}

              {activeOrder.status === 'pickup_en_route' && (
                <button
                  type="button"
                  className="btn btn--primary btn--lg btn--full"
                  disabled={updating}
                  onClick={() => handleAdvanceStatus('picked_up')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#D97706' }}
                >
                  {updating ? <span className="btn__spinner" /> : (
                    <>
                      <LaundryIcons.Scale size={20} color="#FFFFFF" />
                      Weigh with Portable Scale &amp; Confirm
                    </>
                  )}
                </button>
              )}

              {activeOrder.status === 'ready_for_delivery' && (
                <button
                  type="button"
                  className="btn btn--primary btn--lg btn--full"
                  disabled={updating}
                  onClick={() => handleAdvanceStatus('delivery_en_route')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {updating ? <span className="btn__spinner" /> : (
                    <>
                      <LaundryIcons.DeliveryScooter size={20} color="#FFFFFF" />
                      Start Delivery to Customer
                    </>
                  )}
                </button>
              )}

              {activeOrder.status === 'delivery_en_route' && (
                <button
                  type="button"
                  className="btn btn--primary btn--lg btn--full"
                  disabled={updating}
                  onClick={() => setIsHandoverOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {updating ? <span className="btn__spinner" /> : (
                    <>
                      <LaundryIcons.CheckmarkBadge size={20} color="#FFFFFF" />
                      Complete Handover &amp; Delivery
                    </>
                  )}
                </button>
              )}

              <Link
                href={`/rider/orders/${activeOrder.id}`}
                className="btn btn--secondary btn--full"
                style={{ textAlign: 'center' }}
              >
                View Full Item Details &amp; Notes →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ================= MULTI-STOP PICKUP RUN QUEUE ================= */}
      {queuedOrders.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LaundryIcons.DeliveryScooter size={16} color="var(--color-primary)" />
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
                Multi-Stop Batch Run ({queuedOrders.length} Other {queuedOrders.length === 1 ? 'Stop' : 'Stops'})
              </span>
            </div>
            <span style={{ fontSize: 10, background: '#FEF3C7', color: '#92400E', fontWeight: 800, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
              Batched Queue
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {queuedOrders.map((ord, idx) => {
              const isPickup = ['rider_assigned', 'pickup_en_route'].includes(ord.status);
              return (
                <div
                  key={ord.id}
                  style={{
                    background: '#F3EFE6',
                    borderRadius: 14,
                    padding: 14,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, background: 'var(--color-primary)', color: '#FFFFFF', padding: '1px 6px', borderRadius: 4 }}>
                        Stop #{idx + 2}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13, color: 'var(--color-text-dark)' }}>
                        {ord.order_number}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-dark)' }}>
                      {ord.customer?.full_name || 'Customer'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {isPickup ? ord.pickup_address : ord.delivery_address}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectStop(ord)}
                    style={{
                      background: 'var(--color-primary)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Select Stop
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= IN-APP DOORSTEP SCALE WEIGH-IN MODAL (PICKUP) ================= */}
      {isPickupModalOpen && activeOrder && (
        <div className="modal-backdrop" onClick={() => setIsPickupModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h2 className="modal__title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LaundryIcons.Scale size={20} color="#0E7490" />
                  Doorstep Scale Weigh-in
                </h2>
                <div style={{ fontSize: 12, color: '#78716C', fontFamily: 'var(--font-mono)' }}>Order {activeOrder.order_number}</div>
              </div>
              <button className="modal__close" onClick={() => setIsPickupModalOpen(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Order Verification Notice */}
              <div className="flat-block flat-block--teal" style={{ padding: '12px 14px', marginBottom: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0E7490', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Customer Order Verification
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1917', marginTop: 4 }}>
                  Order: <span style={{ fontFamily: 'var(--font-mono)', color: '#0E7490' }}>{activeOrder.order_number}</span>
                </div>
                <div style={{ fontSize: 11, color: '#57534E', marginTop: 2 }}>
                  Verify customer&apos;s on-screen QR Pass or bag label before weighing.
                </div>
              </div>

              {/* Portable Scale Weight Input & Live Price Calculation */}
              <div className="flat-block flat-block--amber" style={{ padding: '14px 16px', marginBottom: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', marginBottom: 6 }}>
                  <LaundryIcons.Scale size={16} color="#92400E" />
                  Enter Portable Scale Weight (kg)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    required
                    value={scaleWeight}
                    onChange={(e) => setScaleWeight(e.target.value)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 26,
                      fontWeight: 800,
                      color: '#0E7490',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: '#FFFFFF',
                      width: '100%',
                    }}
                    placeholder="e.g. 4.2"
                  />
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#92400E' }}>kg</span>
                </div>

                {/* Instant Pricing Breakdown */}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed rgba(180, 83, 9, 0.25)', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716C' }}>
                    <span>{parsedScaleWeight.toFixed(1)} kg × ₱{(branchRatePerKg / 100).toFixed(2)}/kg:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1C1917' }}>{formatPeso(liveComputedSubtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716C', marginTop: 3 }}>
                    <span>Delivery Fee:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1C1917' }}>{formatPeso(liveDeliveryFee)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(180, 83, 9, 0.2)' }}>
                    <strong style={{ color: '#92400E', fontSize: 12, textTransform: 'uppercase' }}>Instant Total Bill:</strong>
                    <strong style={{ fontSize: 20, color: '#0E7490', fontFamily: 'var(--font-mono)' }}>{formatPeso(liveComputedTotal)}</strong>
                  </div>
                  <div style={{ fontSize: 10, color: '#B45309', marginTop: 4 }}>
                    {activeOrder.payment_method === 'online'
                      ? '💳 Customer will see this amount and can pay via GCash / Maya on their phone'
                      : '💵 Customer will pay in cash upon clean laundry delivery'}
                  </div>
                </div>
              </div>

              {/* Photo Proof with Portable Scale */}
              <div className="flat-block flat-block--linen" style={{ padding: '14px', marginBottom: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#1C1917', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LaundryIcons.Camera size={16} color="#0E7490" />
                  Mandatory Bag &amp; Scale Photo Proof
                </div>

                <PhotoCapture
                  value={pickupProofUrl}
                  onChange={(dataUrl) => setPickupProofUrl(dataUrl)}
                  onClear={() => setPickupProofUrl('')}
                  buttonText="Snap / Choose Bag Photo"
                  label="Bag Pickup Proof"
                  disabled={updating}
                />
              </div>

              {/* Confirm Pickup Button */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsPickupModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ flex: 2, background: '#0E7490' }}
                  disabled={updating || !pickupProofUrl || parsedScaleWeight <= 0}
                  onClick={handleConfirmPickup}
                >
                  {updating ? <span className="btn__spinner" /> : `Confirm ${parsedScaleWeight.toFixed(1)}kg (${formatPeso(liveComputedTotal)}) ✓`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= IN-APP HANDOVER & COMPLETION MODAL ================= */}
      {isHandoverOpen && activeOrder && (
        <div className="modal-backdrop" onClick={() => setIsHandoverOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h2 className="modal__title">Delivery Handover</h2>
                <div style={{ fontSize: 12, color: '#78716C', fontFamily: 'var(--font-mono)' }}>Order {activeOrder.order_number}</div>
              </div>
              <button className="modal__close" onClick={() => setIsHandoverOpen(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Payment Status Card */}
              {activeOrder.payment_method === 'cash' ? (
                <div className="flat-block flat-block--amber" style={{ padding: '14px', marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>
                      Cash to Collect:
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#B45309', fontFamily: 'var(--font-mono)' }}>
                      {formatPeso(activeOrder.total)}
                    </span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#92400E', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={cashCollected}
                      onChange={(e) => setCashCollected(e.target.checked)}
                      style={{ accentColor: '#D97706', width: 18, height: 18 }}
                    />
                    I have collected {formatPeso(activeOrder.total)} in cash from customer
                  </label>
                </div>
              ) : (
                <div className="flat-block flat-block--teal" style={{ padding: '14px', marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0E7490' }}>
                      Online Payment ({formatPeso(activeOrder.total)})
                    </div>
                    <div style={{ fontSize: 11, color: '#0891B2' }}>
                      Verified via PayMongo / Online Checkout
                    </div>
                  </div>
                  <LaundryIcons.CheckmarkBadge size={22} color="#0E7490" />
                </div>
              )}

              {/* Delivery Photo Proof */}
              <div className="flat-block flat-block--linen" style={{ padding: '14px', marginBottom: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#1C1917', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LaundryIcons.Camera size={16} color="#0E7490" />
                  Mandatory Delivery Proof Photo
                </div>

                <PhotoCapture
                  value={deliveryProofUrl}
                  onChange={(dataUrl) => setDeliveryProofUrl(dataUrl)}
                  onClear={() => setDeliveryProofUrl('')}
                  buttonText="Snap / Choose Handover Photo"
                  label="Delivery Handover Proof"
                  disabled={updating}
                />
              </div>

              {/* Confirm Completion Button */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsHandoverOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ flex: 2 }}
                  disabled={updating || (activeOrder.payment_method === 'cash' && !cashCollected) || !deliveryProofUrl}
                  onClick={handleConfirmHandover}
                >
                  {updating ? <span className="btn__spinner" /> : 'Confirm & Complete ✓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= IN-APP SYSTEM ALERT DIALOG ================= */}
      {systemAlert && (
        <div className="modal-backdrop" onClick={() => setSystemAlert(null)}>
          <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <LaundryIcons.AlertDiscrepancy size={24} color="#D97706" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1C1917', marginBottom: 6 }}>
              Action Required
            </h3>
            <p style={{ fontSize: 13, color: '#78716C', lineHeight: 1.4, marginBottom: 18 }}>
              {systemAlert}
            </p>
            <button
              type="button"
              className="btn btn--primary btn--full"
              onClick={() => setSystemAlert(null)}
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

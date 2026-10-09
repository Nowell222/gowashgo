'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import { useRiderGpsTracker } from '@/lib/tracking/rider-gps';
import { LaundryIcons } from '@/components/common/LaundryIcons';
import LiveTrackingMap from '@/components/maps/LiveTrackingMap';
import PhotoCapture from '@/components/common/PhotoCapture';
import type { OrderWithDetails, OrderStatus } from '@/lib/types';

export default function RiderOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [simStep, setSimStep] = useState(0);

  // Doorstep Portable Scale Weigh-in state
  const [scaleWeight, setScaleWeight] = useState<string>('4.0');
  const [cashCollected, setCashCollected] = useState(false);
  const [deliveryProofUrl, setDeliveryProofUrl] = useState<string>('');
  const [pickupProofUrl, setPickupProofUrl] = useState<string>('');
  const [systemAlert, setSystemAlert] = useState<string | null>(null);

  async function loadOrder() {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const json = await res.json();
      if (json.data) {
        setOrder(json.data);
        if (json.data.cash_collected) setCashCollected(true);
        if (json.data.delivery_proof_url) setDeliveryProofUrl(json.data.delivery_proof_url);
        if (json.data.picked_up_proof_url) setPickupProofUrl(json.data.picked_up_proof_url);
        if (json.data.weight_kg) setScaleWeight(String(json.data.weight_kg));
      }
    } catch (err) {
      console.error('Error loading rider order detail:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [id]);

  const isEnRoute = order && ['rider_assigned', 'pickup_en_route', 'delivery_en_route'].includes(order.status);
  const isPickupStage = order && ['rider_assigned', 'pickup_en_route'].includes(order.status);
  const isDeliveryStage = order && order.status === 'delivery_en_route';

  // Activate device GPS telemetry watch when en-route
  const { currentLocation, pingsSent, lastPingTime, isTracking } = useRiderGpsTracker({
    activeOrderId: id,
    enabled: Boolean(isEnRoute),
  });

  const parsedScaleWeight = parseFloat(scaleWeight) || 0;
  const branchRatePerKg = (order?.branch as any)?.price_per_kg || 3500;
  const liveComputedSubtotal = Math.round(parsedScaleWeight * branchRatePerKg);
  const liveDeliveryFee = order?.delivery_fee || 5000;
  const liveComputedTotal = liveComputedSubtotal + liveDeliveryFee;

  async function handleAdvanceStatus(targetStatus: OrderStatus) {
    if (targetStatus === 'picked_up') {
      if (parsedScaleWeight <= 0) {
        setSystemAlert('Please enter a valid scale weight from your portable scale.');
        return;
      }
      if (!pickupProofUrl) {
        setSystemAlert('Please take or upload a photo proof of the weighed laundry bag before confirming pickup.');
        return;
      }
    }

    if (targetStatus === 'delivered') {
      if (order?.payment_method === 'cash' && !cashCollected) {
        setSystemAlert('Please confirm that you have collected cash from the customer.');
        return;
      }
      if (!deliveryProofUrl) {
        setSystemAlert('Please take or upload a photo proof of delivery before completing.');
        return;
      }
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          note: `Rider advanced status to ${targetStatus}`,
          cash_collected: cashCollected,
          delivery_proof_url: deliveryProofUrl || undefined,
          picked_up_proof_url: pickupProofUrl || undefined,
          weight_kg: targetStatus === 'picked_up' ? parsedScaleWeight : undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        loadOrder();
      } else {
        setSystemAlert(json.error?.message || 'Failed to update status');
      }
    } catch {
      setSystemAlert('Network error updating status');
    } finally {
      setUpdating(false);
    }
  }

  // Simulated GPS Step emitter (for testing on laptop/localhost)
  async function handleSimulateGpsStep() {
    if (!order) return;
    const branchLat = order.branch?.latitude || 14.6538;
    const branchLng = order.branch?.longitude || 121.0685;
    const targetLat = isPickupStage ? order.pickup_latitude : order.delivery_latitude;
    const targetLng = isPickupStage ? order.pickup_longitude : order.delivery_longitude;

    const nextStep = (simStep + 1) % 10;
    setSimStep(nextStep);
    const progress = nextStep / 10;

    const lat = branchLat + (targetLat - branchLat) * progress + Math.sin(progress * Math.PI) * 0.0015;
    const lng = branchLng + (targetLng - branchLng) * progress + Math.cos(progress * Math.PI) * 0.001;

    try {
      await fetch('/api/riders/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          accuracy: 5,
          order_id: id,
          recorded_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Simulation ping error:', err);
    }
  }

  if (loading) {
    return (
      <div className="fade-in">
        <div className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-lg)', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flat-block flat-block--linen" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
        <p style={{ color: '#B91C1C', fontWeight: 700 }}>Order not found</p>
        <Link href="/rider" className="btn btn--secondary btn--sm" style={{ marginTop: 'var(--space-4)' }}>
          ← Back to Cockpit
        </Link>
      </div>
    );
  }

  const statusColor = getOrderStatusColor(order.status as OrderStatus);

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-10)' }}>
      {/* ================= TOP SPOTLIGHT: VERIFIED WEIGHT & INSTANT PRICE ================= */}
      <div className="spotlight-ticket">
        <div className="spotlight-ticket__header">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LaundryIcons.Scale size={16} color="#B45309" />
            Verified Scale Receipt
          </span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{order.order_number}</span>
        </div>

        <div className="spotlight-ticket__values">
          <div>
            <div style={{ fontSize: 10, color: '#78716C', textTransform: 'uppercase', fontWeight: 700 }}>
              {order.weight_kg ? 'Verified Weight' : 'Doorstep Scale'}
            </div>
            <div className="spotlight-ticket__weight">
              {order.weight_kg ? `${order.weight_kg} kg` : `${parsedScaleWeight.toFixed(1)} kg (Est)`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#78716C', textTransform: 'uppercase', fontWeight: 700 }}>
              {order.weight_kg ? 'Instant Total Price' : 'Calculated Total'}
            </div>
            <div className="spotlight-ticket__price">
              {order.weight_kg ? formatPeso(order.total) : formatPeso(liveComputedTotal)}
            </div>
          </div>
        </div>

        <div className="spotlight-ticket__footer">
          <span>
            {order.payment_method === 'online' ? 'Online Payment (GCash / Maya)' : 'Cash on Delivery (COD)'}
          </span>
          <span style={{ fontWeight: 800, color: order.weight_kg ? '#0E7490' : '#B45309' }}>
            {order.weight_kg ? 'Weighed by Courier ✓' : 'Weigh at Doorstep'}
          </span>
        </div>
      </div>

      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <Link href="/rider" style={{ fontSize: 'var(--text-sm)', color: '#0E7490', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Back to Cockpit
        </Link>
        <span className={`status-badge status-badge--${statusColor}`}>
          {formatOrderStatus(order.status as OrderStatus)}
        </span>
      </div>

      {/* Live Map Box */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
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
          riderLocation={currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : null}
          riderName="You (Courier)"
          orderStatus={order.status}
          targetLabel={isPickupStage ? 'Customer Pickup' : 'Customer Delivery'}
          orderNumber={order.order_number}
          isSimulating={!currentLocation}
        />
      </div>

      {/* Telemetry Status Bar */}
      {isEnRoute && (
        <div className={`flat-block ${isTracking ? 'flat-block--teal' : 'flat-block--amber'}`} style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LaundryIcons.Pin size={18} color={isTracking ? '#0E7490' : '#B45309'} />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: isTracking ? '#0E7490' : '#92400E' }}>
                  {isTracking ? 'Device GPS Telemetry Active' : 'Acquiring GPS Signal'}
                </div>
                <div style={{ fontSize: '10px', color: isTracking ? '#0891B2' : '#B45309' }}>
                  {pingsSent} pings sent {lastPingTime ? `• Last: ${lastPingTime.toLocaleTimeString()}` : ''}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={handleSimulateGpsStep}
              style={{ fontSize: '10px', padding: '4px 8px' }}
            >
              Simulate Move
            </button>
          </div>
        </div>
      )}

      {/* Doorstep Portable Scale Weigh-in Box (if pickup_en_route) */}
      {order.status === 'pickup_en_route' && (
        <div className="flat-block flat-block--amber" style={{ padding: '16px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <LaundryIcons.Scale size={18} color="#92400E" />
            Doorstep Scale Weigh-in &amp; Instant Pricing
          </div>
          <p style={{ fontSize: 11, color: '#78716C', marginTop: 2, marginBottom: 12 }}>
            Weigh bag on portable scale before pickup. Total price computes instantly for the customer.
          </p>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', marginBottom: 4 }}>
              Scale Weight (kg)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                step="0.1"
                min="0.5"
                required
                value={scaleWeight}
                onChange={(e) => setScaleWeight(e.target.value)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#0E7490',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: '#FFFFFF',
                  width: '100%',
                }}
              />
              <span style={{ fontSize: 18, fontWeight: 800, color: '#92400E' }}>kg</span>
            </div>

            {/* Instant Calculation */}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(180, 83, 9, 0.25)', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716C' }}>
                <span>{parsedScaleWeight.toFixed(1)} kg × ₱{(branchRatePerKg / 100).toFixed(2)}/kg:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{formatPeso(liveComputedSubtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716C', marginTop: 2 }}>
                <span>Delivery:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{formatPeso(liveDeliveryFee)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(180, 83, 9, 0.2)' }}>
                <strong style={{ color: '#92400E', fontSize: 12 }}>Instant Total:</strong>
                <strong style={{ fontSize: 18, color: '#0E7490', fontFamily: 'var(--font-mono)' }}>{formatPeso(liveComputedTotal)}</strong>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1C1917', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <LaundryIcons.Camera size={14} color="#0E7490" />
              Bag &amp; Scale Photo Proof
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

          <button
            type="button"
            className="btn btn--primary btn--full"
            style={{ background: '#0E7490', fontWeight: 800 }}
            disabled={updating || !pickupProofUrl || parsedScaleWeight <= 0}
            onClick={() => handleAdvanceStatus('picked_up')}
          >
            {updating ? <span className="btn__spinner" /> : `Confirm ${parsedScaleWeight.toFixed(1)}kg (${formatPeso(liveComputedTotal)}) & Pickup ✓`}
          </button>
        </div>
      )}

      {/* Delivery Handover Card (if delivery en route) */}
      {isDeliveryStage && (
        <div className="flat-block flat-block--linen" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 800, color: '#1C1917', marginBottom: 8 }}>
            Delivery Handover Checklist
          </h3>

          {order.payment_method === 'cash' ? (
            <div className="flat-block flat-block--amber" style={{ padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#92400E' }}>
                  Cash to Collect:
                </span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#B45309', fontFamily: 'var(--font-mono)' }}>
                  {formatPeso(order.total)}
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#92400E', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cashCollected}
                  onChange={(e) => setCashCollected(e.target.checked)}
                  style={{ accentColor: '#D97706', width: 16, height: 16 }}
                />
                I have collected {formatPeso(order.total)} in cash from customer
              </label>
            </div>
          ) : (
            <div className="flat-block flat-block--teal" style={{ padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0E7490' }}>
                  Online Payment ({formatPeso(order.total)})
                </div>
                <div style={{ fontSize: 11, color: '#0891B2' }}>
                  Verified via PayMongo / Online Checkout
                </div>
              </div>
              <LaundryIcons.CheckmarkBadge size={20} color="#0E7490" />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1C1917', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <LaundryIcons.Camera size={14} color="#0E7490" />
              Delivery Handover Proof Photo
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

          <button
            type="button"
            className="btn btn--primary btn--full"
            style={{ background: '#0E7490', fontWeight: 800 }}
            disabled={updating || (order.payment_method === 'cash' && !cashCollected) || !deliveryProofUrl}
            onClick={() => handleAdvanceStatus('delivered')}
          >
            {updating ? <span className="btn__spinner" /> : 'Confirm & Complete Delivery ✓'}
          </button>
        </div>
      )}

      {/* Customer & Address Details */}
      <div className="flat-block flat-block--linen">
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: '#1C1917', textTransform: 'uppercase', marginBottom: 8 }}>
          Order Information
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--text-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#78716C' }}>Customer</span>
            <span style={{ fontWeight: 700, color: '#1C1917' }}>{order.customer?.full_name}</span>
          </div>
          {order.customer?.phone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#78716C' }}>Phone</span>
              <a href={`tel:${order.customer.phone}`} style={{ color: '#0E7490', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <LaundryIcons.Phone size={14} color="#0E7490" />
                {order.customer.phone}
              </a>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#78716C' }}>Pickup At</span>
            <span style={{ maxWidth: 220, textAlign: 'right', color: '#1C1917' }}>{order.pickup_address}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#78716C' }}>Deliver To</span>
            <span style={{ maxWidth: 220, textAlign: 'right', color: '#1C1917' }}>{order.delivery_address}</span>
          </div>
        </div>
      </div>

      {/* In-App System Alert Dialog */}
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

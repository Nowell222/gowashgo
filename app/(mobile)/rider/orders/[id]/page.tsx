'use client';

import { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor, getNextStatuses } from '@/lib/orders/status-machine';
import { useRiderGpsTracker } from '@/lib/tracking/rider-gps';
import LiveTrackingMap from '@/components/maps/LiveTrackingMap';
import type { OrderWithDetails, OrderStatus } from '@/lib/types';

export default function RiderOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [simStep, setSimStep] = useState(0);

  // Delivery Handover verification state
  const [cashCollected, setCashCollected] = useState(false);
  const [deliveryProofUrl, setDeliveryProofUrl] = useState<string>('');
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);

  async function loadOrder() {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const json = await res.json();
      if (json.data) {
        setOrder(json.data);
        if (json.data.cash_collected) setCashCollected(true);
        if (json.data.delivery_proof_url) setDeliveryProofUrl(json.data.delivery_proof_url);
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
  const { currentLocation, pingsSent, lastPingTime, isTracking, gpsError } = useRiderGpsTracker({
    activeOrderId: id,
    enabled: Boolean(isEnRoute),
  });

  const [systemAlert, setSystemAlert] = useState<string | null>(null);

  async function handleAdvanceStatus(targetStatus: OrderStatus) {
    if (targetStatus === 'delivered') {
      if (order?.payment_method === 'cash' && !cashCollected) {
        setSystemAlert('Please confirm that you have collected the cash from the customer.');
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

  // Simulated Delivery Proof Photo (for fast testing on localhost/laptop)
  function handleSnapProofPhoto() {
    setIsCapturingPhoto(true);
    setTimeout(() => {
      // Sample high quality delivery handover image URL
      setDeliveryProofUrl('https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80');
      setIsCapturingPhoto(false);
    }, 600);
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
        <div className="skeleton" style={{ height: 28, width: '40%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="fade-in empty-state">
        <p className="empty-state__title">Order Not Found</p>
        <Link href="/rider/orders" className="btn btn--secondary" style={{ marginTop: 'var(--space-4)' }}>
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const nextOptions = getNextStatuses(order.status as OrderStatus, 'rider');
  const statusColor = getOrderStatusColor(order.status as OrderStatus);

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-10)' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <Link href="/rider/orders" style={{ fontSize: 'var(--text-sm)', color: '#0284C7', fontWeight: 600 }}>
          ← Back to Jobs
        </Link>
        <span className={`status-badge status-badge--${statusColor}`}>
          {formatOrderStatus(order.status as OrderStatus)}
        </span>
      </div>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
          {order.order_number}
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
          <span style={{ color: '#64748B', fontSize: 'var(--text-xs)' }}>
            Branch: {order.branch?.name}
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: 4,
            background: order.payment_method === 'online' ? '#EFF6FF' : '#FEF3C7',
            color: order.payment_method === 'online' ? '#1D4ED8' : '#B45309',
            textTransform: 'uppercase',
          }}>
            {order.payment_method === 'online' ? '💳 Online Payment' : '💵 Cash on Delivery'}
          </span>
        </div>
      </div>

      {/* Mapbox Route Preview */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
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
          targetLabel={isPickupStage ? 'Customer Pickup' : 'Customer Delivery'}
          orderNumber={order.order_number}
          isSimulating={!currentLocation}
        />
      </div>

      {/* Telemetry Broadcast Card */}
      {isEnRoute && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="pulse-dot" style={{ background: '#0284C7' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>
                GPS Telemetry Broadcast Active
              </span>
            </div>
            <span style={{ fontSize: 11, color: '#0284C7', fontWeight: 600 }}>
              {pingsSent} pings sent
            </span>
          </div>

          <button
            type="button"
            className="btn btn--secondary btn--sm btn--full"
            style={{ border: '1px solid #BAE6FD', color: '#0284C7', fontWeight: 700 }}
            onClick={handleSimulateGpsStep}
          >
            📍 Emit Live Test Movement Ping (Step {simStep + 1}/10)
          </button>
        </div>
      )}

      {/* ================= PAYMENT-GATED COMPLETION CARD (When Delivering) ================= */}
      {isDeliveryStage && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', background: '#FFFFFF', border: '2px solid #0284C7' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
            Handover &amp; Completion Requirements
          </div>

          {/* Payment Requirement */}
          {order.payment_method === 'cash' ? (
            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>
                  💵 Cash to Collect:
                </span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#B45309' }}>
                  {formatPeso(order.total)}
                </span>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#92400E', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cashCollected}
                  onChange={(e) => setCashCollected(e.target.checked)}
                  style={{ accentColor: '#D97706', width: 18, height: 18 }}
                />
                I have collected {formatPeso(order.total)} in cash from customer
              </label>
            </div>
          ) : (
            <div style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#1E40AF' }}>
                  💳 Online Payment (Total: {formatPeso(order.total)})
                </div>
                <div style={{ fontSize: 11, color: '#3B82F6' }}>
                  Verified via PayMongo / Checkout Link
                </div>
              </div>
              <span style={{ fontSize: 20 }}>✅</span>
            </div>
          )}

          {/* Delivery Proof Photo */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
              📸 Mandatory Delivery Proof Photo
            </div>

            {deliveryProofUrl ? (
              <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: 120 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={deliveryProofUrl}
                  alt="Delivery Proof"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={() => setDeliveryProofUrl('')}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 10,
                    padding: '2px 6px',
                    cursor: 'pointer',
                  }}
                >
                  Retake ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn--secondary btn--sm btn--full"
                onClick={handleSnapProofPhoto}
                disabled={isCapturingPhoto}
                style={{ border: '1px solid #CBD5E1', color: '#0F172A', fontWeight: 700 }}
              >
                {isCapturingPhoto ? '📸 Capturing...' : '📷 Snap / Attach Handover Photo'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action Prompts for Rider */}
      {nextOptions.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', border: '1px solid #0284C7', background: '#FFFFFF' }}>
          <div style={{ fontSize: '11px', color: '#0284C7', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
            Delivery Action
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nextOptions.map((status) => (
              <button
                key={status}
                type="button"
                className="btn btn--primary btn--full btn--lg"
                disabled={updating || (status === 'delivered' && ((order.payment_method === 'cash' && !cashCollected) || !deliveryProofUrl))}
                onClick={() => handleAdvanceStatus(status)}
              >
                {updating ? <span className="btn__spinner" /> : `Mark as "${formatOrderStatus(status)}"`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Customer & Address Details */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-3)', color: '#0F172A' }}>
          Customer &amp; Location
        </h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#0F172A' }}>{order.customer?.full_name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: '#64748B' }}>{order.customer?.phone || 'No phone'}</div>
          </div>
          {order.customer?.phone && (
            <a href={`tel:${order.customer.phone}`} className="btn btn--secondary btn--sm" style={{ border: '1px solid #CBD5E1' }}>
              📞 Call
            </a>
          )}
        </div>

        <div className="divider" style={{ margin: '8px 0' }} />

        <div style={{ fontSize: 'var(--text-xs)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>
            <span style={{ color: '#64748B', fontWeight: 700 }}>PICKUP: </span>
            <span style={{ color: '#0F172A' }}>{order.pickup_address}</span>
          </div>
          <div>
            <span style={{ color: '#64748B', fontWeight: 700 }}>DELIVERY: </span>
            <span style={{ color: '#0F172A' }}>{order.delivery_address}</span>
          </div>
          {order.special_instructions && (
            <div style={{ color: '#B45309', background: '#FFFBEB', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A', marginTop: 4 }}>
              <strong>Note:</strong> {order.special_instructions}
            </div>
          )}
        </div>
      </div>

      {/* In-App System Alert Dialog */}
      {systemAlert && (
        <div className="modal-backdrop" onClick={() => setSystemAlert(null)}>
          <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#FEF3C7',
              border: '2px solid #FDE68A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              margin: '0 auto 12px',
            }}>
              ⚠️
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
              Action Required
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.4, marginBottom: 18 }}>
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

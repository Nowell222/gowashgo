'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor, getNextStatuses } from '@/lib/orders/status-machine';
import { useRiderGpsTracker } from '@/lib/tracking/rider-gps';
import LiveTrackingMap from '@/components/maps/LiveTrackingMap';
import PhotoCapture from '@/components/common/PhotoCapture';
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
  const [pickupProofUrl, setPickupProofUrl] = useState<string>('');

  async function loadOrder() {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const json = await res.json();
      if (json.data) {
        setOrder(json.data);
        if (json.data.cash_collected) setCashCollected(true);
        if (json.data.delivery_proof_url) setDeliveryProofUrl(json.data.delivery_proof_url);
        if (json.data.picked_up_proof_url) setPickupProofUrl(json.data.picked_up_proof_url);
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
    if (targetStatus === 'picked_up') {
      if (!pickupProofUrl) {
        setSystemAlert('Please take or upload a photo proof of the laundry bag before confirming pickup.');
        return;
      }
    }

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
          picked_up_proof_url: pickupProofUrl || undefined,
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
        <div className="skeleton" style={{ height: 28, width: '40%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
        <p style={{ color: 'var(--color-danger)' }}>Order not found</p>
        <Link href="/rider" className="btn btn--secondary btn--sm" style={{ marginTop: 'var(--space-4)' }}>
          ← Back to Cockpit
        </Link>
      </div>
    );
  }

  const nextOptions = getNextStatuses(order.status as OrderStatus, 'rider');
  const statusColor = getOrderStatusColor(order.status as OrderStatus);

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-10)' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <Link href="/rider" style={{ fontSize: 'var(--text-sm)', color: '#0284C7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Back to Cockpit
        </Link>
        <span className={`status-badge status-badge--${statusColor}`}>
          {formatOrderStatus(order.status as OrderStatus)}
        </span>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
          {order.order_number}
        </h1>
        <p style={{ color: '#64748B', fontSize: 'var(--text-xs)', marginTop: 2 }}>
          {order.branch?.name} • Placed {new Date(order.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Live Map Box */}
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
          riderName="You (Courier)"
          orderStatus={order.status}
          targetLabel={isPickupStage ? 'Customer Pickup' : 'Customer Delivery'}
          orderNumber={order.order_number}
          isSimulating={!currentLocation}
        />
      </div>

      {/* Telemetry Status Bar */}
      {isEnRoute && (
        <div className="card" style={{
          marginBottom: 'var(--space-4)',
          background: isTracking ? '#F0FDF4' : '#FFFBEB',
          border: isTracking ? '1px solid #BBF7D0' : '1px solid #FDE68A',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{isTracking ? '📡' : '⚠️'}</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: isTracking ? '#166534' : '#92400E' }}>
                  {isTracking ? 'Device GPS Telemetry Active' : 'Acquiring GPS Signal'}
                </div>
                <div style={{ fontSize: '10px', color: isTracking ? '#15803D' : '#B45309' }}>
                  {pingsSent} pings sent {lastPingTime ? `• Last: ${lastPingTime.toLocaleTimeString()}` : ''}
                </div>
              </div>
            </div>

            {/* Quick simulation trigger for testing */}
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={handleSimulateGpsStep}
              style={{ fontSize: '10px', padding: '4px 8px' }}
            >
              Simulate Move 🛵
            </button>
          </div>
        </div>
      )}

      {/* Pickup Photo Proof Box (if in pickup_en_route) */}
      {order.status === 'pickup_en_route' && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', background: '#F8FAFC', border: '1.5px solid #BAE6FD' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
            🧺 Bag Pickup Photo Proof
          </div>
          <PhotoCapture
            value={pickupProofUrl}
            onChange={(dataUrl) => setPickupProofUrl(dataUrl)}
            onClear={() => setPickupProofUrl('')}
            buttonText="📷 Snap / Choose Bag Photo"
            label="Bag Pickup Proof"
            disabled={updating}
          />
        </div>
      )}

      {/* Delivery Handover Card (if delivery en route) */}
      {isDeliveryStage && (
        <div className="card" style={{
          marginBottom: 'var(--space-4)',
          border: '1.5px solid #BAE6FD',
          background: '#FFFFFF',
        }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
            Delivery Handover Checklist
          </h3>

          {/* Cash Collection Confirmation */}
          {order.payment_method === 'cash' ? (
            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#92400E' }}>
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
                  style={{ accentColor: '#D97706', width: 16, height: 16 }}
                />
                I have collected {formatPeso(order.total)} from the customer
              </label>
            </div>
          ) : (
            <div style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
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

          {/* REAL Device Camera / File Upload for Delivery Photo Proof */}
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

            <PhotoCapture
              value={deliveryProofUrl}
              onChange={(dataUrl) => setDeliveryProofUrl(dataUrl)}
              onClear={() => setDeliveryProofUrl('')}
              buttonText="📷 Snap / Choose Handover Photo"
              label="Delivery Handover Proof"
              disabled={updating}
            />
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
                disabled={
                  updating ||
                  (status === 'picked_up' && !pickupProofUrl) ||
                  (status === 'delivered' && ((order.payment_method === 'cash' && !cashCollected) || !deliveryProofUrl))
                }
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import { useRiderGpsTracker } from '@/lib/tracking/rider-gps';
import LiveTrackingMap from '@/components/maps/LiveTrackingMap';
import PhotoCapture from '@/components/common/PhotoCapture';
import type { OrderWithDetails, OrderStatus } from '@/lib/types';

export default function RiderHomePage() {
  const [activeOrder, setActiveOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [gpsEmissionEnabled, setGpsEmissionEnabled] = useState(true);

  // In-app Handover Modal state (Delivery)
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [cashCollected, setCashCollected] = useState(false);
  const [deliveryProofUrl, setDeliveryProofUrl] = useState('');

  // In-app Pickup Confirmation Modal state (Tier A1 & A3)
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [pickupProofUrl, setPickupProofUrl] = useState('');

  // In-app Alert / Dialog Modal state (replaces ugly browser alert)
  const [systemAlert, setSystemAlert] = useState<string | null>(null);

  async function loadActiveOrder() {
    try {
      const res = await fetch('/api/orders');
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const current = json.data.find((o: OrderWithDetails) =>
          ['rider_assigned', 'pickup_en_route', 'picked_up', 'ready_for_delivery', 'delivery_en_route'].includes(o.status)
        );
        setActiveOrder(current || null);
        if (current?.cash_collected) setCashCollected(true);
        if (current?.delivery_proof_url) setDeliveryProofUrl(current.delivery_proof_url);
        if (current?.picked_up_proof_url) setPickupProofUrl(current.picked_up_proof_url);
      }
    } catch (err) {
      console.error('Error loading rider active assignment:', err);
    } finally {
      setLoading(false);
    }
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
    lastPingTime,
    gpsError,
  } = useRiderGpsTracker({
    activeOrderId: activeOrder?.id,
    enabled: gpsEmissionEnabled && !!activeOrder,
  });

  async function handleAdvanceStatus(targetStatus: OrderStatus) {
    if (!activeOrder) return;

    // If attempting to pickup, open pickup proof modal
    if (targetStatus === 'picked_up') {
      setIsPickupModalOpen(true);
      return;
    }

    // If attempting to deliver, open handover modal
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

  // Complete Pickup with Bag Proof Photo
  async function handleConfirmPickup() {
    if (!activeOrder) return;

    if (!pickupProofUrl) {
      setSystemAlert('A photo proof of bag pickup is required to confirm pickup. Please take a photo or select an image.');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'picked_up',
          note: 'Rider confirmed bag pickup with proof photo',
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
      setSystemAlert('A delivery handover proof photo is required to complete delivery. Please take a photo or select an image.');
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
          cash_collected: cashCollected,
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
        <div className="skeleton" style={{ height: 28, width: '40%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  const isPickupStage = activeOrder && ['rider_assigned', 'pickup_en_route'].includes(activeOrder.status);

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-10)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
            Rider Cockpit
          </h1>
          <p style={{ color: '#64748B', fontSize: 'var(--text-xs)', marginTop: 2 }}>
            Active pickup &amp; delivery assignment
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="pulse-dot" />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
            Online
          </span>
        </div>
      </div>

      {!activeOrder ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>🛵</div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: '#0F172A' }}>No Active Job Assigned</h3>
          <p style={{ color: '#64748B', fontSize: 'var(--text-xs)', marginTop: 4, maxWidth: 280, margin: '4px auto 16px' }}>
            You are ready and on standby. New dispatch assignments from the branch manager will appear here in real time.
          </p>
          <Link href="/rider/orders" className="btn btn--secondary btn--sm">
            View All Branch Orders →
          </Link>
        </div>
      ) : (
        <div>
          {/* Real-time Telemetry Bar */}
          <div className="card" style={{
            marginBottom: 'var(--space-3)',
            background: isTracking ? '#F0FDF4' : '#FFFBEB',
            border: isTracking ? '1px solid #BBF7D0' : '1px solid #FDE68A',
            padding: '10px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{isTracking ? '📡' : '⚠️'}</span>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: isTracking ? '#166534' : '#92400E' }}>
                    {isTracking ? 'GPS Live Tracking Active' : 'Waiting for GPS Lock'}
                  </div>
                  <div style={{ fontSize: '10px', color: isTracking ? '#15803D' : '#B45309' }}>
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

          {/* Active Job Card */}
          <div className="card" style={{
            background: '#FFFFFF',
            border: '1.5px solid #BAE6FD',
            boxShadow: '0 4px 20px rgba(2, 132, 199, 0.08)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Current Task
                </span>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: '#0F172A' }}>
                  {activeOrder.order_number}
                </h2>
              </div>
              <span className={`status-badge status-badge--${getOrderStatusColor(activeOrder.status as OrderStatus)}`}>
                {formatOrderStatus(activeOrder.status as OrderStatus)}
              </span>
            </div>

            <div className="divider" style={{ margin: '12px 0' }} />

            {/* Destination Highlight */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                {isPickupStage ? 'Pickup Location (Customer)' : 'Delivery Location (Customer)'}
              </div>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                {isPickupStage ? activeOrder.pickup_address : activeOrder.delivery_address}
              </div>
            </div>

            {/* Customer Details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#0F172A' }}>{activeOrder.customer?.full_name}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  {activeOrder.weight_kg ? `⚖️ ${activeOrder.weight_kg} kg` : 'Standard Load'} • {formatPeso(activeOrder.total)} ({activeOrder.payment_method === 'online' ? 'Online' : 'COD'})
                </div>
              </div>
              {activeOrder.customer?.phone && (
                <a href={`tel:${activeOrder.customer.phone}`} className="btn btn--primary btn--sm" style={{ borderRadius: 'var(--radius-full)' }}>
                  📞 Call
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
                >
                  {updating ? <span className="btn__spinner" /> : '🚀 Start Pickup Navigation'}
                </button>
              )}

              {activeOrder.status === 'pickup_en_route' && (
                <button
                  type="button"
                  className="btn btn--primary btn--lg btn--full"
                  disabled={updating}
                  onClick={() => handleAdvanceStatus('picked_up')}
                >
                  {updating ? <span className="btn__spinner" /> : '🧺 Confirm Bags Picked Up'}
                </button>
              )}

              {activeOrder.status === 'ready_for_delivery' && (
                <button
                  type="button"
                  className="btn btn--primary btn--lg btn--full"
                  disabled={updating}
                  onClick={() => handleAdvanceStatus('delivery_en_route')}
                >
                  {updating ? <span className="btn__spinner" /> : '🛵 Start Delivery to Customer'}
                </button>
              )}

              {activeOrder.status === 'delivery_en_route' && (
                <button
                  type="button"
                  className="btn btn--primary btn--lg btn--full"
                  disabled={updating}
                  onClick={() => setIsHandoverOpen(true)}
                >
                  {updating ? <span className="btn__spinner" /> : '✅ Complete Handover & Delivery'}
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

      {/* ================= IN-APP PICKUP CONFIRMATION MODAL (Tier A1 & A3) ================= */}
      {isPickupModalOpen && activeOrder && (
        <div className="modal-backdrop" onClick={() => setIsPickupModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h2 className="modal__title">Confirm Laundry Pickup</h2>
                <div style={{ fontSize: 12, color: '#64748B' }}>Order {activeOrder.order_number}</div>
              </div>
              <button className="modal__close" onClick={() => setIsPickupModalOpen(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Order Verification Notice */}
              <div style={{
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  📱 Customer Order Verification
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>
                  Order: <span style={{ fontFamily: 'var(--font-mono)', color: '#0284C7' }}>{activeOrder.order_number}</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  Check customer&apos;s on-screen QR Pass or hand-written tape tag.
                </div>
              </div>

              {/* REAL Device Camera / File Upload for Pickup Photo Proof */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                  🧺 Mandatory Bag Pickup Photo
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
                  style={{ flex: 2 }}
                  disabled={updating || !pickupProofUrl}
                  onClick={handleConfirmPickup}
                >
                  {updating ? <span className="btn__spinner" /> : 'Confirm Pickup ✓'}
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
                <div style={{ fontSize: 12, color: '#64748B' }}>Order {activeOrder.order_number}</div>
              </div>
              <button className="modal__close" onClick={() => setIsHandoverOpen(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Payment Status Card */}
              {activeOrder.payment_method === 'cash' ? (
                <div style={{
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>
                      💵 Cash to Collect:
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#B45309' }}>
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
                <div style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1E40AF' }}>
                      💳 Online Payment ({formatPeso(activeOrder.total)})
                    </div>
                    <div style={{ fontSize: 11, color: '#3B82F6' }}>
                      Verified via PayMongo / Online Checkout
                    </div>
                  </div>
                  <span style={{ fontSize: 22 }}>✅</span>
                </div>
              )}

              {/* REAL Device Camera / File Upload for Delivery Photo Proof */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
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

      {/* ================= IN-APP SYSTEM ALERT DIALOG (No Native Browser Alerts) ================= */}
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

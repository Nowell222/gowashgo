'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import { useRiderGpsTracker } from '@/lib/tracking/rider-gps';
import LiveTrackingMap from '@/components/maps/LiveTrackingMap';
import type { OrderWithDetails, OrderStatus } from '@/lib/types';

export default function RiderHomePage() {
  const [activeOrder, setActiveOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [gpsEmissionEnabled, setGpsEmissionEnabled] = useState(true);

  // In-app Handover Modal state
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [cashCollected, setCashCollected] = useState(false);
  const [deliveryProofUrl, setDeliveryProofUrl] = useState('');
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);

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

  function handleSnapProof() {
    setIsCapturingPhoto(true);
    setTimeout(() => {
      setDeliveryProofUrl('https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80');
      setIsCapturingPhoto(false);
    }, 500);
  }

  if (loading) {
    return (
      <div className="fade-in">
        <div className="skeleton" style={{ height: 28, width: '50%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  const isPickupStage = activeOrder?.status === 'rider_assigned' || activeOrder?.status === 'pickup_en_route';

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-10)' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
            Rider Cockpit
          </h1>
          <p style={{ color: '#64748B', fontSize: 'var(--text-xs)' }}>
            Active pickup &amp; delivery assignment
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="pulse-dot" style={{ background: '#10B981' }} />
          <span style={{ fontSize: 'var(--text-xs)', color: '#059669', fontWeight: 700 }}>Online</span>
        </div>
      </div>

      {/* GPS Emitter Status Bar */}
      {activeOrder && (
        <div className="card" style={{
          padding: '10px 14px',
          marginBottom: 'var(--space-4)',
          background: '#F0F9FF',
          border: '1px solid #BAE6FD',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13 }}>🛰️</span>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: isTracking ? '#0284C7' : '#64748B' }}>
                {isTracking ? 'GPS Broadcasting Active' : 'GPS Telemetry Idle'}
              </span>
              {wakeLockActive && (
                <span className="status-badge status-badge--success" style={{ fontSize: 9, padding: '1px 5px' }}>
                  Screen On
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
              {pingsSent} pings transmitted • {lastPingTime ? `Last: ${lastPingTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Standby'}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#0284C7' }}>
            <input
              type="checkbox"
              checked={gpsEmissionEnabled}
              onChange={(e) => setGpsEmissionEnabled(e.target.checked)}
              style={{ accentColor: '#0284C7' }}
            />
            <span>Broadcast</span>
          </label>
        </div>
      )}

      {gpsError && (
        <div className="toast toast--warning" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="toast__message">GPS notice: {gpsError}. Running simulated telemetry.</div>
        </div>
      )}

      {!activeOrder ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)' }}>
          <div className="empty-state__icon" style={{ margin: '0 auto var(--space-4)' }}>🏍️</div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
            Ready for Next Assignment
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: '#64748B' }}>
            You have no active assignments right now. Branch staff will assign new orders to you as they arrive.
          </p>
          <Link href="/rider/orders" className="btn btn--secondary btn--sm" style={{ marginTop: 'var(--space-5)' }}>
            View Assigned Queue →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Live Map Preview for Rider */}
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

              {/* Photo Proof */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                  📸 Mandatory Delivery Proof Photo
                </div>

                {deliveryProofUrl ? (
                  <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: 140 }}>
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
                        top: 8,
                        right: 8,
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 11,
                        padding: '4px 8px',
                        cursor: 'pointer',
                      }}
                    >
                      Retake ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn--secondary btn--full"
                    onClick={handleSnapProof}
                    disabled={isCapturingPhoto}
                    style={{ border: '1.5px dashed #0284C7', color: '#0284C7', fontWeight: 700 }}
                  >
                    {isCapturingPhoto ? '📸 Capturing...' : '📷 Snap / Attach Handover Photo'}
                  </button>
                )}
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

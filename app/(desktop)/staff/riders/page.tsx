'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import LiveTrackingMap from '@/components/maps/LiveTrackingMap';
import type { User, OrderWithDetails } from '@/lib/types';

export default function StaffRidersPage() {
  const [riders, setRiders] = useState<User[]>([]);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState<User | null>(null);

  async function loadData() {
    try {
      const supabase = createClient();
      const { data: rData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'rider')
        .order('full_name');

      if (rData) {
        setRiders(rData as User[]);
        if (rData.length > 0 && !selectedRider) {
          setSelectedRider(rData[0] as User);
        }
      }

      const res = await fetch('/api/orders?limit=50');
      const json = await res.json();
      if (json.data) setOrders(json.data);
    } catch (err) {
      console.error('Error loading riders list:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const activeRiderOrder = selectedRider
    ? orders.find((o) => o.rider_id === selectedRider.id && !['delivered', 'completed', 'cancelled'].includes(o.status))
    : null;

  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Fleet &amp; Rider Operations</h1>
          <p className="page-heading__subtitle">
            Live GPS telemetry and workload allocation across branch delivery riders.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-6)' }}>
        {/* Left: Riders List */}
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Branch Riders ({riders.length})</h2>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 50 }} />)}
            </div>
          ) : riders.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              No riders registered. Generate an invite from Manager &gt; Invites.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {riders.map((r) => {
                const currentJob = orders.find(
                  (o) => o.rider_id === r.id && !['delivered', 'completed', 'cancelled'].includes(o.status)
                );
                const isSelected = selectedRider?.id === r.id;

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRider(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--color-primary-subtle)' : 'var(--color-bg-elevated)',
                      border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar avatar--sm">
                        {r.full_name?.charAt(0) || 'R'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                          {r.full_name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {r.phone || r.email}
                        </div>
                      </div>
                    </div>

                    <div>
                      {currentJob ? (
                        <span className="status-badge status-badge--warning" style={{ fontSize: 10 }}>
                          On Trip
                        </span>
                      ) : (
                        <span className="status-badge status-badge--success" style={{ fontSize: 10 }}>
                          Available
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Live GPS Telemetry & Active Assignment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {selectedRider ? (
            <>
              {/* Map Panel */}
              <div className="card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
                      Live Fleet Telemetry: {selectedRider.full_name}
                    </h3>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {activeRiderOrder ? `Assigned to ${activeRiderOrder.order_number}` : 'Idle — Stationary at Branch'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="pulse-dot" />
                    <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600 }}>GPS Linked</span>
                  </div>
                </div>

                <LiveTrackingMap
                  branchLocation={activeRiderOrder?.branch ? {
                    lat: activeRiderOrder.branch.latitude,
                    lng: activeRiderOrder.branch.longitude,
                    label: activeRiderOrder.branch.name,
                  } : undefined}
                  targetLocation={{
                    lat: activeRiderOrder ? activeRiderOrder.pickup_latitude : 14.6537,
                    lng: activeRiderOrder ? activeRiderOrder.pickup_longitude : 121.0685,
                  }}
                  targetLabel={activeRiderOrder ? 'Customer Delivery' : 'Standby Area'}
                  orderNumber={activeRiderOrder?.order_number}
                  isSimulating={true}
                />
              </div>

              {/* Active Trip Details */}
              {activeRiderOrder ? (
                <div className="card">
                  <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 8 }}>
                    Active Trip Order Information
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 'var(--text-sm)' }}>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Customer</div>
                      <div style={{ fontWeight: 600 }}>{activeRiderOrder.customer?.full_name} ({activeRiderOrder.customer?.phone})</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Destination</div>
                      <div style={{ fontWeight: 600 }}>{activeRiderOrder.delivery_address}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                    This rider is currently available for dispatch on new pickup orders.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="card empty-state">
              <p className="empty-state__description">Select a rider on the left to view live telemetry.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

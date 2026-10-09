'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import {
  MachineDrumIcon,
  BasketIcon,
  ScaleIcon,
  ScooterCourierIcon,
  ReceiptTicketIcon,
  CheckmarkBadgeIcon,
  CareTagIcon,
  WaterDropIcon,
  HangerIcon,
} from '@/components/icons';
import type { OrderStatus } from '@/lib/types';

interface AdminOverviewData {
  summary: {
    totalBranches: number;
    activeBranches: number;
    totalOrders: number;
    totalRevenueCentavos: number;
    todayOrders: number;
    todayRevenueCentavos: number;
    totalWeightKg: number;
    activeFacilityOrders: number;
    outForDeliveryOrders: number;
    completedOrders: number;
    totalUsers: number;
    customerCount: number;
    staffCount: number;
    riderCount: number;
    managerCount: number;
    adminCount: number;
  };
  branches: Array<{
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    pricePerKg: number;
    baseProcessingMinutes: number;
    isActive: boolean;
    ordersCount: number;
    activeOrdersCount: number;
    staffCount: number;
    revenueCentavos: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    branchName: string;
    status: string;
    totalCentavos: number;
    weightKg: number | null;
    paymentMethod: string;
    createdAt: string;
  }>;
  recentEvents: Array<{
    id: string;
    orderNumber: string;
    status: string;
    changedByName: string;
    note: string;
    createdAt: string;
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadOverview() {
    try {
      const res = await fetch('/api/admin/overview');
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
      } else {
        setError(json.error?.message || 'Failed to load platform overview');
      }
    } catch {
      setError('Network error loading platform overview');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
    const interval = setInterval(loadOverview, 8000);
    return () => clearInterval(interval);
  }, []);

  function handleExportCsv() {
    if (!data) return;
    const headers = ['Order Number', 'Customer', 'Branch', 'Status', 'Weight (kg)', 'Payment', 'Total (PHP)', 'Created At'];
    const rows = data.recentOrders.map((o) => [
      o.orderNumber,
      `"${o.customerName}"`,
      `"${o.branchName}"`,
      o.status,
      o.weightKg || '—',
      o.paymentMethod,
      (o.totalCentavos / 100).toFixed(2),
      o.createdAt,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gowashgo-platform-ledger-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const s = data?.summary;

  return (
    <div
      style={{
        padding: '20px 24px 60px',
        maxWidth: 1400,
        margin: '0 auto',
        fontFamily: 'var(--font-karla, "Karla", sans-serif)',
        color: '#0F172A',
      }}
    >
      {/* Page Heading with Action Buttons */}
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Platform Operations Cockpit</h1>
          <p className="page-heading__subtitle">
            Enterprise analytics across all WashGo branches, facilities, courier fleets, and finances.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn--secondary btn--sm"
            style={{ fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}
          >
            Export Platform Ledger
          </button>
          <Link href="/admin/branches/new" className="btn btn--primary btn--sm">
            <BasketIcon size={14} /> + New Branch
          </Link>
          <Link href="/admin/users" className="btn btn--secondary btn--sm">
            <CareTagIcon size={14} /> Users ({s?.totalUsers || 0})
          </Link>
        </div>
      </div>

      {error && (
        <div className="toast toast--error" style={{ marginBottom: 16 }}>
          <div className="toast__message">{error}</div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HIGHLIGHT BLOCK: ALL-TIME GMV & ACTIVE PLATFORM LOAD               */}
      {/* ========================================================================= */}
      <div
        style={{
          background: '#164E63',
          color: '#FFFFFF',
          padding: '24px 28px',
          marginBottom: 20,
          borderRadius: 2,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#67E8F9',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                marginBottom: 6,
              }}
            >
              LIFETIME REVENUE · GROSS MERCHANDISE VALUE
            </div>
            <div
              style={{
                fontSize: 'clamp(32px, 4vw, 44px)',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              }}
            >
              {loading ? 'Loading...' : formatPeso(s?.totalRevenueCentavos || 0)}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#CFFAFE',
                marginTop: 6,
              }}
            >
              {s?.completedOrders || 0} completed laundry cycles across {s?.totalBranches || 0} active hubs · {s?.totalWeightKg || 0} kg clean garments handled
            </div>
          </div>

          {/* Real-time Platform Pulse Counters */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '12px 18px', borderRadius: 2 }}>
              <div style={{ fontSize: 10, color: '#67E8F9', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Washing Facility Loads
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}>
                {s?.activeFacilityOrders || 0}
              </div>
              <div style={{ fontSize: 11, color: '#A5F3FC' }}>in machines / sorting</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '12px 18px', borderRadius: 2 }}>
              <div style={{ fontSize: 10, color: '#FDE68A', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Couriers on Road
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#FDE68A', fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}>
                {s?.outForDeliveryOrders || 0}
              </div>
              <div style={{ fontSize: 11, color: '#FEF3C7' }}>pickup &amp; delivery en route</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '12px 18px', borderRadius: 2 }}>
              <div style={{ fontSize: 10, color: '#86EFAC', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Today's Orders
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#86EFAC', fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}>
                {s?.todayOrders || 0}
              </div>
              <div style={{ fontSize: 11, color: '#DCFCE7' }}>{formatPeso(s?.todayRevenueCentavos || 0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATS GRID: 4 KEY ENTERPRISE DIMENSIONS                                */}
      {/* ========================================================================= */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Active Hub Locations</div>
          <div className="stat-card__value">{s?.totalBranches || 0}</div>
          <div className="stat-card__hint">
            {data?.branches?.map((b) => b.name).join(' · ') || 'Active hubs'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Registered Users</div>
          <div className="stat-card__value">{s?.totalUsers || 0}</div>
          <div className="stat-card__hint">
            {s?.customerCount || 0} customers · {s?.staffCount || 0} staff · {s?.riderCount || 0} couriers · {s?.managerCount || 0} managers
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Total Orders Processed</div>
          <div className="stat-card__value">{s?.totalOrders || 0}</div>
          <div className="stat-card__hint">
            {s?.completedOrders || 0} fulfilled · {s?.activeFacilityOrders || 0} in progress
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Clean Garments Delivered</div>
          <div className="stat-card__value">{s?.totalWeightKg || 0} kg</div>
          <div className="stat-card__hint">Doorstep hanging scale verified weighing</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BRANCH HUBS OPERATIONAL COMPARISON                                      */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#0F172A',
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            Branch Hubs &amp; Operational Throughput
          </h2>
          <Link href="/admin/branches" style={{ fontSize: 13, color: '#0E7490', fontWeight: 600, textDecoration: 'none' }}>
            Manage All Hubs ({data?.branches?.length || 0}) &rarr;
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          {(data?.branches || []).map((b) => (
            <div
              key={b.id}
              style={{
                background: '#FFFFFF',
                padding: '20px 22px',
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 4px', fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}>
                      {b.name}
                    </h3>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{b.address}</div>
                  </div>
                  <span className={`status-badge status-badge--${b.isActive ? 'success' : 'error'}`}>
                    {b.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    margin: '16px 0',
                    background: '#FAF8F5',
                    padding: '12px 14px',
                    borderRadius: 2,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Orders Volume</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#164E63', fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}>
                      {b.ordersCount} ({b.activeOrdersCount} active)
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Gross Revenue</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#059669', fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}>
                      {formatPeso(b.revenueCentavos)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Team</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                      {b.staffCount} staff &amp; couriers
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Wash Rate</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                      ₱{(b.pricePerKg / 100).toFixed(0)}/kg · {b.baseProcessingMinutes}m
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Link
                  href={`/admin/branches/${b.id}`}
                  className="btn btn--secondary btn--sm"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  Hub Details
                </Link>
                <Link
                  href="/manager/orders"
                  className="btn btn--primary btn--sm"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  View Orders ({b.ordersCount})
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. REAL-TIME ACTIVITY STREAM & AUDIT TRAIL                                */}
      {/* ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        {/* Left: Recent Customer Orders Table */}
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: 2, boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#0F172A',
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                margin: 0,
              }}
            >
              Recent Platform Orders
            </h2>
            <Link href="/manager/orders" style={{ fontSize: 12, color: '#0E7490', fontWeight: 600, textDecoration: 'none' }}>
              View All Orders ({s?.totalOrders || 0}) &rarr;
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
            </div>
          ) : (data?.recentOrders || []).length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p className="empty-state__title">No orders placed yet</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentOrders || []).map((o) => {
                    const statusColor = getOrderStatusColor(o.status as OrderStatus);
                    return (
                      <tr key={o.id}>
                        <td>
                          <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: '#0E7490' }}>
                            {o.orderNumber}
                          </div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>
                            {new Date(o.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{o.customerName}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>{o.customerEmail}</div>
                        </td>
                        <td style={{ fontSize: 12, color: '#475569' }}>{o.branchName}</td>
                        <td>
                          <span className={`status-badge status-badge--${statusColor}`}>
                            {formatOrderStatus(o.status as OrderStatus)}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>
                          {formatPeso(o.totalCentavos)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Live Platform Status Event Audit Trail */}
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: 2, boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#0F172A',
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              margin: '0 0 14px',
            }}
          >
            Live Operational Audit Stream
          </h2>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 40 }} />)}
            </div>
          ) : (data?.recentEvents || []).length === 0 ? (
            <p style={{ fontSize: 13, color: '#94A3B8' }}>No status events logged yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(data?.recentEvents || []).map((ev) => {
                const statusColor = getOrderStatusColor(ev.status as OrderStatus);
                return (
                  <div
                    key={ev.id}
                    style={{
                      borderLeft: '3px solid #0E7490',
                      paddingLeft: 12,
                      paddingTop: 2,
                      paddingBottom: 2,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#164E63', fontFamily: 'var(--font-mono, monospace)' }}>
                        {ev.orderNumber}
                      </span>
                      <span className={`status-badge status-badge--${statusColor}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                        {formatOrderStatus(ev.status as OrderStatus)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#475569' }}>
                      {ev.note || `Transitioned by ${ev.changedByName}`}
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                      {new Date(ev.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · {ev.changedByName}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

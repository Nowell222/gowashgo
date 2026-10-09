'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { BasketIcon, ScaleIcon, ScooterCourierIcon, CareTagIcon } from '@/components/icons';
import type { Branch } from '@/lib/types';

interface BranchWithStats extends Branch {
  ordersCount?: number;
  activeOrdersCount?: number;
  staffCount?: number;
  revenueCentavos?: number;
}

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<BranchWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadBranches() {
    try {
      const res = await fetch('/api/admin/overview');
      const json = await res.json();
      if (res.ok && json.data?.branches) {
        setBranches(json.data.branches);
      } else {
        const fallbackRes = await fetch('/api/branches');
        const fallbackJson = await fallbackRes.json();
        if (fallbackJson.data) setBranches(fallbackJson.data);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBranches();
  }, []);

  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.is_active).length;

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
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Branch Facilities &amp; Hubs</h1>
          <p className="page-heading__subtitle">
            All registered GoWashGo washing hubs, operational facilities, and local service zones.
          </p>
        </div>
        <Link href="/admin/branches/new" className="btn btn--primary">
          <BasketIcon size={16} /> + Register New Branch
        </Link>
      </div>

      {/* Summary Row */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card__label">Total Hub Locations</div>
          <div className="stat-card__value">{totalBranches}</div>
          <div className="stat-card__hint">{activeBranches} currently accepting customer orders</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Active Fleet &amp; Staff</div>
          <div className="stat-card__value">
            {branches.reduce((sum, b) => sum + (b.staffCount || 0), 0)}
          </div>
          <div className="stat-card__hint">Facility operators &amp; doorstep delivery couriers</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Total Facility Revenue</div>
          <div className="stat-card__value" style={{ color: '#059669' }}>
            {formatPeso(branches.reduce((sum, b) => sum + (b.revenueCentavos || 0), 0))}
          </div>
          <div className="stat-card__hint">Lifetime realized revenue across all locations</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
          {[1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 220, borderRadius: 2 }} />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div style={{ background: '#FFFFFF', padding: '40px 24px', textAlign: 'center', borderRadius: 2 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏪</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>No branch facilities registered</h2>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
            Set up your first laundry facility to start accepting pickups.
          </p>
          <Link href="/admin/branches/new" className="btn btn--primary">
            + Register First Branch
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
          {branches.map((branch) => (
            <div
              key={branch.id}
              style={{
                background: '#FFFFFF',
                padding: '24px 26px',
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h2
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#0F172A',
                        margin: '0 0 6px',
                        fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {branch.name}
                    </h2>
                    <div style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>📍</span> {branch.address}
                    </div>
                  </div>
                  <span className={`status-badge status-badge--${branch.is_active ? 'success' : 'error'}`}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Contact info bar */}
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {branch.phone && <div>📞 {branch.phone}</div>}
                  {branch.email && <div>✉️ {branch.email}</div>}
                </div>

                {/* Metrics 4-cell block */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    background: '#FAF8F5',
                    padding: '16px 18px',
                    borderRadius: 2,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                      Lifetime Orders
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#164E63', fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}>
                      {branch.ordersCount || 0}
                    </div>
                    <div style={{ fontSize: 11, color: '#0E7490' }}>
                      {branch.activeOrdersCount || 0} currently in pipeline
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                      Gross Realized Revenue
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#059669', fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}>
                      {formatPeso(branch.revenueCentavos || 0)}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Settled orders</div>
                  </div>

                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 10 }}>
                    <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                      Assigned Team
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      {branch.staffCount || 0} operators &amp; riders
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 10 }}>
                    <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                      Rate &amp; Turnaround
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      ₱{((branch.price_per_kg || 3500) / 100).toFixed(0)}/kg · {branch.base_processing_minutes || 120}m
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', gap: 10 }}>
                <Link
                  href={`/admin/branches/${branch.id}`}
                  className="btn btn--secondary btn--sm"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  Facility Details &amp; Team &rarr;
                </Link>
                <Link
                  href="/manager/orders"
                  className="btn btn--primary btn--sm"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  View Orders ({branch.ordersCount || 0})
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

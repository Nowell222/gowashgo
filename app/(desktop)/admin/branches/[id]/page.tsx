'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatPeso } from '@/lib/utils/currency';
import { ROLE_LABELS } from '@/lib/auth/roles';
import { BasketIcon, ScaleIcon, ScooterCourierIcon, CareTagIcon } from '@/components/icons';
import type { Branch, User, Order, UserRole } from '@/lib/types';

export default function AdminBranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [staff, setStaff] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const [branchRes, staffRes, ordersRes] = await Promise.all([
        supabase.from('branches').select('*').eq('id', id).single(),
        supabase.from('users').select('*').eq('branch_id', id),
        supabase.from('orders').select('*').eq('branch_id', id).order('created_at', { ascending: false }).limit(50),
      ]);

      if (branchRes.data) setBranch(branchRes.data as Branch);
      if (staffRes.data) setStaff(staffRes.data as User[]);
      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 32, width: '40%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 180, borderRadius: 2 }} />
      </div>
    );
  }

  if (!branch) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>Branch Hub Not Found</h2>
        <Link href="/admin/branches" className="btn btn--secondary">
          ← Back to Branches
        </Link>
      </div>
    );
  }

  const completedOrders = orders.filter((o) => ['delivered', 'completed'].includes(o.status));
  const activeOrders = orders.filter((o) => !['delivered', 'completed', 'cancelled'].includes(o.status));
  const branchRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

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
          <Link
            href="/admin/branches"
            style={{ fontSize: 13, color: '#0E7490', marginBottom: 4, display: 'inline-block', fontWeight: 600, textDecoration: 'none' }}
          >
            ← Back to Branches
          </Link>
          <h1 className="page-heading__title">{branch.name}</h1>
          <p className="page-heading__subtitle">📍 {branch.address}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className={`status-badge status-badge--${branch.is_active ? 'success' : 'error'}`}>
            {branch.is_active ? 'Active Hub' : 'Inactive'}
          </span>
          <Link href="/manager/orders" className="btn btn--primary btn--sm">
            View Hub Orders ({orders.length})
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Assigned Operators &amp; Couriers</div>
          <div className="stat-card__value">{staff.length}</div>
          <div className="stat-card__hint">
            {staff.filter((u) => u.role === 'rider').length} riders · {staff.filter((u) => u.role === 'staff').length} staff
          </div>
        </div>

        <div className="stat-card stat-card--teal">
          <div className="stat-card__label">Active Queue</div>
          <div className="stat-card__value" style={{ color: '#0E7490' }}>
            {activeOrders.length}
          </div>
          <div className="stat-card__hint">In washing facility or out for delivery</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Realized Revenue</div>
          <div className="stat-card__value" style={{ color: '#059669' }}>
            {formatPeso(branchRevenue)}
          </div>
          <div className="stat-card__hint">From {completedOrders.length} completed orders</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Base Rate &amp; Turnaround</div>
          <div className="stat-card__value">
            ₱{((branch.price_per_kg || 3500) / 100).toFixed(0)}/kg
          </div>
          <div className="stat-card__hint">{branch.base_processing_minutes} minutes avg wash cycle</div>
        </div>
      </div>

      {/* Staff & Couriers Table */}
      <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: 2, boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}>
            Branch Staff &amp; Courier Fleet ({staff.length})
          </h2>
          <Link href="/manager/invites" style={{ fontSize: 12, color: '#0E7490', fontWeight: 600, textDecoration: 'none' }}>
            + Invite Team Member &rarr;
          </Link>
        </div>

        {staff.length === 0 ? (
          <p style={{ color: '#94A3B8', fontSize: 13, padding: '16px 0' }}>
            No staff or couriers assigned to this facility yet.
          </p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Team Member</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                    <td>
                      <span className="status-badge status-badge--info">
                        {ROLE_LABELS[u.role as UserRole] || u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748B' }}>{u.email}</td>
                    <td style={{ fontSize: 12 }}>{u.phone || '—'}</td>
                    <td>
                      <span className={`status-badge status-badge--${u.is_active ? 'success' : 'error'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

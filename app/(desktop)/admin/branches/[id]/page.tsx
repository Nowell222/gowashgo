'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Branch, User, Order } from '@/lib/types';

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
      const { data: b } = await supabase.from('branches').select('*').eq('id', id).single();
      if (b) setBranch(b as Branch);

      const { data: u } = await supabase.from('users').select('*').eq('branch_id', id);
      if (u) setStaff(u as User[]);

      const { data: ord } = await supabase.from('orders').select('*').eq('branch_id', id).limit(20);
      if (ord) setOrders(ord as Order[]);

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="desktop-content fade-in">
        <div className="skeleton" style={{ height: 32, width: '40%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="desktop-content fade-in empty-state">
        <p className="empty-state__title">Branch Not Found</p>
        <Link href="/admin/branches" className="btn btn--secondary" style={{ marginTop: 'var(--space-4)' }}>
          ← Back to Branches
        </Link>
      </div>
    );
  }

  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <Link href="/admin/branches" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-light)', marginBottom: 4, display: 'inline-block' }}>
            ← Back to Branches
          </Link>
          <h1 className="page-heading__title">{branch.name}</h1>
          <p className="page-heading__subtitle">{branch.address}</p>
        </div>
        <span className={`status-badge status-badge--${branch.is_active ? 'success' : 'error'}`}>
          {branch.is_active ? 'Active Branch' : 'Inactive'}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Branch Staff / Riders</div>
          <div className="stat-card__value">{staff.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Orders</div>
          <div className="stat-card__value">{orders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Avg Processing Time</div>
          <div className="stat-card__value">{branch.base_processing_minutes}m</div>
        </div>
      </div>

      {/* Staff & Riders List */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card__header">
          <h2 className="card__title">Branch Team Members</h2>
        </div>
        {staff.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            No staff or riders assigned yet.
          </p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
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
                    <td><span className="status-badge status-badge--info">{u.role}</span></td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td><span className="status-badge status-badge--success">Active</span></td>
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Branch } from '@/lib/types';

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from('branches').select('*').order('created_at', { ascending: false });
      if (data) setBranches(data as Branch[]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Branches</h1>
          <p className="page-heading__subtitle">All WashGo laundry shop locations.</p>
        </div>
        <Link href="/admin/branches/new" className="btn btn--primary">
          + New Branch
        </Link>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : branches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__icon">🏪</div>
            <p className="empty-state__title">No branches</p>
            <p className="empty-state__description">Create your first branch to get started.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {branches.map((branch) => (
            <Link
              key={branch.id}
              href={`/admin/branches/${branch.id}`}
              className="card card--interactive"
              style={{ textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-md)' }}>{branch.name}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>{branch.address}</div>
                </div>
                <span className={`status-badge status-badge--${branch.is_active ? 'success' : 'error'}`}>
                  {branch.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

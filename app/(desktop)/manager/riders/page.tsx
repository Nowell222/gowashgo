'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/lib/types';

export default function ManagerRidersPage() {
  const [riders, setRiders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRiders() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'rider')
        .order('full_name');

      if (data) setRiders(data as User[]);
    } catch (err) {
      console.error('Error loading riders:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRiders();
  }, []);

  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Branch Delivery Riders</h1>
          <p className="page-heading__subtitle">
            Manage your branch&apos;s active courier roster and invite new riders.
          </p>
        </div>
        <Link href="/manager/invites" className="btn btn--primary">
          + Invite New Rider
        </Link>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--space-4)' }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 48 }} />)}
          </div>
        ) : riders.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-10) 0' }}>
            <div className="empty-state__icon">🏍️</div>
            <p className="empty-state__title">No riders in this branch</p>
            <p className="empty-state__description">
              Generate an invite code from the Invites tab to onboard your delivery riders.
            </p>
            <Link href="/manager/invites" className="btn btn--primary" style={{ marginTop: 'var(--space-4)' }}>
              Generate Rider Invite
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Rider Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {riders.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar--sm">
                          {r.full_name?.charAt(0) || 'R'}
                        </div>
                        <span style={{ fontWeight: 600 }}>{r.full_name}</span>
                      </div>
                    </td>
                    <td>{r.email}</td>
                    <td>{r.phone || '—'}</td>
                    <td>
                      <span className={`status-badge status-badge--${r.is_active ? 'success' : 'error'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/lib/types';

export default function ManagerStaffPage() {
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadStaff() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'staff')
        .order('full_name');

      if (data) setStaff(data as User[]);
    } catch (err) {
      console.error('Error loading staff:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff();
  }, []);

  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Branch Facility Staff</h1>
          <p className="page-heading__subtitle">
            Manage your branch laundry washing, drying, and packing operators.
          </p>
        </div>
        <Link href="/manager/invites" className="btn btn--primary">
          + Invite New Staff
        </Link>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--space-4)' }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 48 }} />)}
          </div>
        ) : staff.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-10) 0' }}>
            <div className="empty-state__icon">👥</div>
            <p className="empty-state__title">No facility staff registered</p>
            <p className="empty-state__description">
              Generate an invite code from the Invites tab to onboard your branch staff.
            </p>
            <Link href="/manager/invites" className="btn btn--primary" style={{ marginTop: 'var(--space-4)' }}>
              Generate Staff Invite
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar--sm">
                          {s.full_name?.charAt(0) || 'S'}
                        </div>
                        <span style={{ fontWeight: 600 }}>{s.full_name}</span>
                      </div>
                    </td>
                    <td>{s.email}</td>
                    <td>{s.phone || '—'}</td>
                    <td>
                      <span className={`status-badge status-badge--${s.is_active ? 'success' : 'error'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {new Date(s.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
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

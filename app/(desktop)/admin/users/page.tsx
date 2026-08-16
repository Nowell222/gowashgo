'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/auth/roles';
import type { User, UserRole } from '@/lib/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (data) setUsers(data as User[]);
      setLoading(false);
    }
    load();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (roleFilter === 'all') return true;
    return u.role === roleFilter;
  });

  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Platform User Directory</h1>
          <p className="page-heading__subtitle">
            All registered platform users across customers, staff, riders, managers, and admins.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Total Users</div>
          <div className="stat-card__value">{users.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Customers</div>
          <div className="stat-card__value">{users.filter((u) => u.role === 'customer').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Staff &amp; Riders</div>
          <div className="stat-card__value">{users.filter((u) => u.role === 'staff' || u.role === 'rider').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Managers &amp; Admins</div>
          <div className="stat-card__value">{users.filter((u) => u.role === 'branch_manager' || u.role === 'platform_admin').length}</div>
        </div>
      </div>

      {/* Role filter buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        {[
          { key: 'all', label: 'All Users' },
          { key: 'customer', label: 'Customers' },
          { key: 'rider', label: 'Riders' },
          { key: 'staff', label: 'Staff' },
          { key: 'branch_manager', label: 'Branch Managers' },
          { key: 'platform_admin', label: 'Platform Admins' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`btn btn--sm ${roleFilter === tab.key ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setRoleFilter(tab.key)}
          >
            {tab.label} ({users.filter((u) => tab.key === 'all' || u.role === tab.key).length})
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--space-4)' }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 48 }} />)}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
            <p className="empty-state__description">No users in this role category.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar--sm">
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="status-badge status-badge--info">
                        {ROLE_LABELS[u.role as UserRole] || u.role}
                      </span>
                    </td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span className={`status-badge status-badge--${u.is_active ? 'success' : 'error'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
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

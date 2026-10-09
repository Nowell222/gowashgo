'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/auth/roles';
import { CareTagIcon, WaterDropIcon } from '@/components/icons';
import type { User, UserRole, Branch } from '@/lib/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const [usersRes, branchesRes] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('branches').select('*'),
      ]);

      if (usersRes.data) setUsers(usersRes.data as User[]);
      if (branchesRes.data) setBranches(branchesRes.data as Branch[]);
      setLoading(false);
    }
    load();
  }, []);

  const branchMap = new Map(branches.map((b) => [b.id, b.name]));

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const customerCount = users.filter((u) => u.role === 'customer').length;
  const staffAndRidersCount = users.filter((u) => u.role === 'staff' || u.role === 'rider').length;
  const leadershipCount = users.filter((u) => u.role === 'branch_manager' || u.role === 'platform_admin').length;

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
          <h1 className="page-heading__title">Platform User Directory</h1>
          <p className="page-heading__subtitle">
            All registered platform users across customers, facility staff, couriers, branch managers, and admins.
          </p>
        </div>
        <Link href="/manager/invites" className="btn btn--primary btn--sm">
          <WaterDropIcon size={14} /> + Invite Team Member
        </Link>
      </div>

      {/* Styled Metric Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Total Registered Users</div>
          <div className="stat-card__value">{users.length}</div>
          <div className="stat-card__hint">Across all platform roles</div>
        </div>

        <div className="stat-card stat-card--teal">
          <div className="stat-card__label">Customers</div>
          <div className="stat-card__value" style={{ color: '#0E7490' }}>
            {customerCount}
          </div>
          <div className="stat-card__hint">Book laundry pickups online</div>
        </div>

        <div className="stat-card stat-card--amber">
          <div className="stat-card__label">Facility Staff &amp; Couriers</div>
          <div className="stat-card__value" style={{ color: '#B45309' }}>
            {staffAndRidersCount}
          </div>
          <div className="stat-card__hint">Operate washers &amp; delivery fleet</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Managers &amp; Admins</div>
          <div className="stat-card__value">{leadershipCount}</div>
          <div className="stat-card__hint">Branch leaders &amp; system admins</div>
        </div>
      </div>

      {/* Controls Bar: Search & Role Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        {/* Role filter buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All Users', count: users.length },
            { key: 'customer', label: 'Customers', count: customerCount },
            { key: 'rider', label: 'Riders', count: users.filter((u) => u.role === 'rider').length },
            { key: 'staff', label: 'Staff', count: users.filter((u) => u.role === 'staff').length },
            { key: 'branch_manager', label: 'Branch Managers', count: users.filter((u) => u.role === 'branch_manager').length },
            { key: 'platform_admin', label: 'Admins', count: users.filter((u) => u.role === 'platform_admin').length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`btn btn--sm ${roleFilter === tab.key ? 'btn--primary' : 'btn--secondary'}`}
              style={{ fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}
              onClick={() => setRoleFilter(tab.key)}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ minWidth: 260 }}>
          <input
            className="input"
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', fontSize: 13 }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: 2, boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: 48 }} />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <p className="empty-state__title">No users found</p>
            <p className="empty-state__description">
              {searchQuery ? `No users matching "${searchQuery}"` : 'No users in this role category.'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>System Role</th>
                  <th>Branch Hub</th>
                  <th>Contact Phone</th>
                  <th>Account Status</th>
                  <th>Member Since</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const branchName = u.branch_id ? branchMap.get(u.branch_id) || 'Assigned Branch' : '—';
                  const initials = u.full_name
                    ? u.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'U';

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              background: '#ECFEFF',
                              color: '#0E7490',
                              fontWeight: 700,
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 2,
                              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{u.full_name || 'Unnamed User'}</div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            background:
                              u.role === 'customer'
                                ? '#EFF6FF'
                                : u.role === 'rider'
                                ? '#FEF3C7'
                                : u.role === 'staff'
                                ? '#F0FDF4'
                                : u.role === 'branch_manager'
                                ? '#ECFEFF'
                                : '#F1F5F9',
                            color:
                              u.role === 'customer'
                                ? '#1D4ED8'
                                : u.role === 'rider'
                                ? '#B45309'
                                : u.role === 'staff'
                                ? '#15803D'
                                : u.role === 'branch_manager'
                                ? '#0E7490'
                                : '#334155',
                          }}
                        >
                          {ROLE_LABELS[u.role as UserRole] || u.role}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#334155' }}>
                        {branchName !== '—' ? <span>🏪 {branchName}</span> : <span style={{ color: '#94A3B8' }}>None</span>}
                      </td>
                      <td style={{ fontSize: 12, color: '#334155' }}>{u.phone || '—'}</td>
                      <td>
                        <span className={`status-badge status-badge--${u.is_active ? 'success' : 'error'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#64748B' }}>
                        {new Date(u.created_at).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/auth/roles';
import type { Invite, UserRole } from '@/lib/types';

export default function ManagerInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [branchId, setBranchId] = useState('');

  useEffect(() => {
    loadInvites();
  }, []);

  async function loadInvites() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users').select('branch_id').eq('id', user.id).single();
      if (profile?.branch_id) setBranchId(profile.branch_id);
    }

    const res = await fetch('/api/invites');
    const json = await res.json();
    if (json.data) setInvites(json.data);
    setLoading(false);
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: newRole,
        branch_id: branchId,
        email: newEmail || undefined,
      }),
    });

    const json = await res.json();
    setCreating(false);

    if (!res.ok) {
      setError(json.error?.message || 'Failed to create invite');
      return;
    }

    const inviteUrl = `${window.location.origin}/invite/${json.data.code}`;
    setSuccess(`Invite created! Share this link: ${inviteUrl}`);
    setNewEmail('');
    loadInvites();
  }

  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Invites</h1>
          <p className="page-heading__subtitle">Invite staff and riders to join your branch.</p>
        </div>
      </div>

      {/* Create Invite Form */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card__header">
          <h2 className="card__title">Create New Invite</h2>
        </div>

        {error && (
          <div className="toast toast--error" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="toast__message">{error}</div>
          </div>
        )}

        {success && (
          <div className="toast toast--success" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="toast__message" style={{ wordBreak: 'break-all' }}>{success}</div>
          </div>
        )}

        <form onSubmit={handleCreateInvite} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: '0 0 160px' }}>
            <label className="input-group__label" htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              className="input"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
            >
              <option value="staff">Staff</option>
              <option value="rider">Rider</option>
            </select>
          </div>

          <div className="input-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="input-group__label" htmlFor="invite-email">
              Email <span className="input-group__hint">(optional — restricts who can redeem)</span>
            </label>
            <input
              id="invite-email"
              className="input"
              type="email"
              placeholder="user@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn--primary" disabled={creating}>
            {creating ? <span className="btn__spinner" /> : 'Generate Invite'}
          </button>
        </form>
      </div>

      {/* Invites List */}
      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Invite History</h2>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 48 }} />
            ))}
          </div>
        ) : invites.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
            <p className="empty-state__description">No invites generated yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{inv.code}</td>
                    <td>{ROLE_LABELS[inv.role]}</td>
                    <td>{inv.email || '—'}</td>
                    <td>
                      <span className={`status-badge status-badge--${
                        inv.status === 'used' ? 'success' : inv.status === 'expired' ? 'error' : 'info'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {new Date(inv.expires_at).toLocaleDateString('en-PH', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
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

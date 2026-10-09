'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/auth/roles';
import { CareTagIcon, ScooterCourierIcon, WaterDropIcon } from '@/components/icons';
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
  const [branchName, setBranchName] = useState('San Juan Hub');

  useEffect(() => {
    loadInvites();
  }, []);

  async function loadInvites() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users').select('branch_id').eq('id', user.id).single();
      if (profile?.branch_id) {
        setBranchId(profile.branch_id);
        const { data: bData } = await supabase.from('branches').select('name').eq('id', profile.branch_id).single();
        if (bData?.name) setBranchName(bData.name);
      }
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

    if (!newEmail || !newEmail.trim()) {
      setError('Please provide an email address to send the invitation to.');
      return;
    }

    setCreating(true);

    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: newRole,
          branch_id: branchId,
          email: newEmail.trim(),
        }),
      });

      const json = await res.json();
      setCreating(false);

      if (!res.ok) {
        setError(json.error?.message || 'Failed to create invite');
        return;
      }

      const inviteUrl = `${window.location.origin}/invite/${json.data.code}`;
      if (json.data?.email_sent) {
        setSuccess(`✓ Invitation email sent to ${newEmail}! Recipient can activate their account via email.`);
      } else {
        setSuccess(`Invite generated for ${newEmail}. Share link: ${inviteUrl}`);
      }
      setNewEmail('');
      loadInvites();
    } catch {
      setError('Network error creating invite');
      setCreating(false);
    }
  }

  const pendingInvites = invites.filter((i) => i.status === 'pending');

  return (
    <div
      style={{
        padding: '16px 20px 40px',
        maxWidth: 1200,
        margin: '0 auto',
        fontFamily: 'var(--font-karla, "Karla", sans-serif)',
        color: '#0F172A',
      }}
    >
      {/* Top Highlight in Flat Amber Block */}
      <div
        style={{
          background: '#FEF3C7',
          padding: '20px 24px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#92400E',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              marginBottom: 4,
            }}
          >
            OPERATIONS TEAM RECRUITMENT · {branchName.toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 'clamp(24px, 3vw, 32px)',
              fontWeight: 700,
              color: '#78350F',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
            }}
          >
            {pendingInvites.length} Pending Email Invitations
          </div>
          <div style={{ fontSize: 13, color: '#92400E', marginTop: 4 }}>
            Invitations are delivered automatically to candidate inboxes via Brevo / SMTP with a secure 7-day activation link.
          </div>
        </div>
      </div>

      {/* Send Invite Form Card (Flat, No Borders) */}
      <div style={{ background: '#FFFFFF', padding: '20px 24px', marginBottom: 16 }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            margin: '0 0 4px',
            fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
            color: '#0F172A',
          }}
        >
          Send Official Team Email Invitation
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
          Enter the applicant’s email address. An official onboarding invitation email will be delivered to their inbox immediately.
        </p>

        {error && (
          <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: '#ECFDF5', color: '#065F46', padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleCreateInvite} style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
              Team Role
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                fontWeight: 600,
                background: '#F8FAFC',
                border: 'none',
                color: '#0F172A',
                outline: 'none',
                height: 40,
              }}
            >
              <option value="staff">Facility Laundry Staff</option>
              <option value="rider">Delivery Courier Rider</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
              Recipient Email Address <span style={{ color: '#0E7490' }}>(Delivers to Inbox)</span>
            </label>
            <input
              type="email"
              placeholder="candidate@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                background: '#F8FAFC',
                border: 'none',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
                height: 40,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            style={{
              background: '#0E7490',
              color: '#FFFFFF',
              padding: '0 20px',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              cursor: creating ? 'not-allowed' : 'pointer',
              height: 40,
              whiteSpace: 'nowrap',
            }}
          >
            {creating ? 'Sending Email...' : 'Send Email Invite →'}
          </button>
        </form>
      </div>

      {/* Invite History Ledger (Flat Table, No Borders) */}
      <div style={{ background: '#FFFFFF', padding: '20px 24px' }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            margin: '0 0 4px',
            fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
            color: '#0F172A',
          }}
        >
          Invitation History &amp; Status
        </h2>
        <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 14px' }}>
          Real-time tracking of sent recruitment email invites and activation dates.
        </p>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 48, background: '#F8FAFC' }} />
            ))}
          </div>
        ) : invites.length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
            No invitations sent yet. Enter a candidate email above to recruit staff or riders.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Code</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Assigned Role</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Candidate Email</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Invite Status</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Expires On</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                      {inv.code}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                        {inv.role === 'rider' ? <ScooterCourierIcon size={14} color="#0E7490" /> : <CareTagIcon size={14} color="#0E7490" />}
                        {ROLE_LABELS[inv.role]}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#0F172A', fontWeight: 600 }}>
                      {inv.email || <span style={{ color: '#94A3B8' }}>Link only</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          background:
                            inv.status === 'used'
                              ? '#ECFDF5'
                              : inv.status === 'expired'
                              ? '#FEF2F2'
                              : '#FEF3C7',
                          color:
                            inv.status === 'used'
                              ? '#065F46'
                              : inv.status === 'expired'
                              ? '#991B1B'
                              : '#92400E',
                          fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                        }}
                      >
                        {inv.status === 'used' ? '✓ Activated' : inv.status === 'expired' ? 'Expired' : 'Pending Activation'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: '#64748B' }}>
                      {new Date(inv.expires_at).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
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

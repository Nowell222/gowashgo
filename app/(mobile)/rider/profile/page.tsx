'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatPeso } from '@/lib/utils/currency';
import type { User, Branch } from '@/lib/types';

export default function RiderProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Tier B1: Cash Reconciliation state
  const [todayCash, setTodayCash] = useState<number>(0);
  const [todayDeliveries, setTodayDeliveries] = useState<number>(0);
  const [isSettled, setIsSettled] = useState<boolean>(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
        if (profile) {
          setUser(profile as User);
          setFullName(profile.full_name || '');
          setPhone(profile.phone || '');

          if (profile.branch_id) {
            const { data: bData } = await supabase.from('branches').select('*').eq('id', profile.branch_id).single();
            if (bData) setBranch(bData as Branch);
          }

          // Fetch rider cash earnings
          fetch('/api/riders/earnings')
            .then((r) => r.json())
            .then((json) => {
              if (json.data) {
                setTodayCash(json.data.total_cash || 0);
                setTodayDeliveries(json.data.completed_deliveries_count || 0);
                setIsSettled(Boolean(json.data.is_settled));
              }
            })
            .catch(() => {});
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      setSuccessMessage('Rider profile updated!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (loading) {
    return (
      <div className="fade-in">
        <div className="skeleton" style={{ height: 32, width: '50%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-10)' }}>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
          Rider Profile
        </h1>
        <p style={{ color: '#64748B', fontSize: 'var(--text-xs)' }}>
          Courier credentials, assigned branch &amp; cash reconciliation
        </p>
      </div>

      {successMessage && (
        <div className="toast toast--success" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className="toast toast--error" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">{errorMessage}</div>
        </div>
      )}

      {/* ================= TIER B1: Shift Cash Reconciliation Card ================= */}
      <div className="card" style={{
        marginBottom: 'var(--space-4)',
        background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
        border: '1.5px solid #86EFAC',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              💵 Today&apos;s Cash Handover Summary
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#15803D', marginTop: 4 }}>
              {formatPeso(todayCash)}
            </div>
            <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
              Collected across <strong>{todayDeliveries} completed deliveries</strong> today.
            </div>
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
            background: isSettled ? '#15803D' : '#FEF3C7',
            color: isSettled ? '#FFFFFF' : '#92400E',
            border: isSettled ? 'none' : '1px solid #FDE68A',
          }}>
            {isSettled ? '✓ Handed Over' : '⏳ Pending Handover'}
          </span>
        </div>

        <div style={{ borderTop: '1px solid #BBF7D0', marginTop: 10, paddingTop: 8, fontSize: 11, color: '#166534' }}>
          💡 Please hand over all collected cash to your Branch Manager at the end of your shift.
        </div>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div className="avatar avatar--lg">
            {fullName?.charAt(0) || 'R'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-md)', color: '#0F172A' }}>{fullName || 'Rider'}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: '#64748B' }}>{user?.email}</div>
            <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
              <span className="status-badge status-badge--warning">Authorized Courier</span>
              <span className="status-badge status-badge--success">Online</span>
            </div>
          </div>
        </div>

        {branch && (
          <div style={{
            background: '#F0F9FF',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #BAE6FD',
            padding: '10px 14px',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--text-xs)',
          }}>
            <span style={{ color: '#0369A1', fontWeight: 700 }}>Assigned Hub: </span>
            <strong style={{ color: '#0F172A' }}>{branch.name}</strong> ({branch.address})
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="input-group">
            <label className="input-group__label">Courier Name</label>
            <input
              className="input"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-group__label">Contact Number (Customer Dispatch)</label>
            <input
              className="input"
              type="tel"
              placeholder="+63 917 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn--primary btn--full" disabled={saving}>
            {saving ? <span className="btn__spinner" /> : 'Save Information'}
          </button>
        </form>
      </div>

      {/* Account Security */}
      <div className="card">
        <button
          type="button"
          className="btn btn--danger btn--full"
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>
          Rider Profile
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
          Driver identification &amp; branch affiliation
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

      {/* Profile Card */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div className="avatar avatar--lg">
            {fullName?.charAt(0) || 'R'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-md)' }}>{fullName || 'Rider'}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{user?.email}</div>
            <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
              <span className="status-badge status-badge--warning">Authorized Courier</span>
              <span className="status-badge status-badge--success">Online</span>
            </div>
          </div>
        </div>

        {branch && (
          <div style={{
            background: 'var(--color-bg-elevated)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--text-xs)',
          }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Assigned Branch: </span>
            <strong>{branch.name}</strong> ({branch.address})
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

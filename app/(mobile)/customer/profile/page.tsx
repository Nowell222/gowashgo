'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/lib/types';

export default function CustomerProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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
      setSuccessMessage('Profile updated successfully!');
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
          My Account
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
          Manage your customer profile and preferences
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
            {fullName?.charAt(0) || 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-md)' }}>{fullName || 'Customer'}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{user?.email}</div>
            <span className="status-badge status-badge--info" style={{ marginTop: 4 }}>
              Customer Account
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="input-group">
            <label className="input-group__label">Full Name</label>
            <input
              className="input"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-group__label">Mobile Phone</label>
            <input
              className="input"
              type="tel"
              placeholder="+63 917 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn--primary btn--full" disabled={saving}>
            {saving ? <span className="btn__spinner" /> : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* App Preferences & Sign Out */}
      <div className="card">
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
          Preferences &amp; Security
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
            <span>Theme Mode</span>
            <span className="status-badge status-badge--neutral">Dark Mode (Default)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
            <span>Push Notifications</span>
            <span className="status-badge status-badge--success">Enabled</span>
          </div>
          <div className="divider" style={{ margin: '8px 0' }} />
          <button
            type="button"
            className="btn btn--danger btn--full"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

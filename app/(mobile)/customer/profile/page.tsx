'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LaundryIcons from '@/components/common/LaundryIcons';
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
      setSuccessMessage('Profile details updated successfully');
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
      <div className="fade-in" style={{ padding: '16px 0' }}>
        <div style={{ height: 28, width: 140, background: '#F3EFE6', borderRadius: 8, marginBottom: 12 }} />
        <div style={{ height: 180, background: '#F3EFE6', borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <LaundryIcons.User size={16} color="var(--color-primary)" />
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            Customer Profile
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--color-text-dark)', letterSpacing: '-0.02em' }}>
          Account Settings
        </h1>
      </div>

      {successMessage && (
        <div className="flat-block" style={{ marginBottom: 16, background: '#ECFDF5', padding: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>✓ {successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flat-block" style={{ marginBottom: 16, background: '#FFE4E6', padding: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#BE123C' }}>{errorMessage}</span>
        </div>
      )}

      {/* Profile Form Block */}
      <div className="flat-block" style={{ background: '#F3EFE6', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'var(--color-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            {fullName?.charAt(0) || 'C'}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text-dark)' }}>{fullName || 'Customer'}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{user?.email}</div>
            <span
              style={{
                display: 'inline-block',
                marginTop: 4,
                fontSize: 10,
                fontWeight: 800,
                background: '#ECFEFF',
                color: '#0E7490',
                padding: '2px 8px',
                borderRadius: 4,
                textTransform: 'uppercase',
              }}
            >
              Verified Customer
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{
                width: '100%',
                background: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
              Mobile Phone
            </label>
            <input
              type="tel"
              placeholder="+63 917 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                width: '100%',
                background: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              background: 'var(--color-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              padding: '12px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>

      {/* Laundry Preferences & Sign Out */}
      <div className="flat-block" style={{ background: '#F3EFE6' }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          Service & Account
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
            <span>Default Service</span>
            <span style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>Wash, Dry & Fold</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
            <span>Weighing Method</span>
            <span style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>Doorstep Rider Scale</span>
          </div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: '#BE123C',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              padding: '8px 0',
              textAlign: 'center',
            }}
          >
            Sign Out of Account
          </button>
        </div>
      </div>
    </div>
  );
}

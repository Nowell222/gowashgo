'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatPeso } from '@/lib/utils/currency';
import LaundryIcons from '@/components/common/LaundryIcons';
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

  // Cash Reconciliation state
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
      setSuccessMessage('Courier profile updated successfully');
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
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <LaundryIcons.DeliveryScooter size={16} color="var(--color-primary)" />
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            Courier Hub
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--color-text-dark)', letterSpacing: '-0.02em' }}>
          Rider Account
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12, margin: '4px 0 0' }}>
          Courier credentials, scale assignment & cash reconciliation
        </p>
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

      {/* Cash Reconciliation Block */}
      <div className="flat-block" style={{ background: '#ECFDF5', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <LaundryIcons.ReceiptTicket size={14} color="#059669" />
              <span>Today&apos;s COD Cash Handover</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#065F46', marginTop: 4 }}>
              {formatPeso(todayCash)}
            </div>
            <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
              Collected from {todayDeliveries} completed deliveries
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 6,
              background: isSettled ? '#059669' : '#FEF3C7',
              color: isSettled ? '#FFFFFF' : '#92400E',
              textTransform: 'uppercase',
            }}
          >
            {isSettled ? 'Handed Over' : 'Pending Handover'}
          </span>
        </div>
      </div>

      {/* Profile Details Block */}
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
            {fullName?.charAt(0) || 'R'}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text-dark)' }}>{fullName || 'Rider'}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{user?.email}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  background: '#FEF3C7',
                  color: '#92400E',
                  padding: '2px 8px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                }}
              >
                Portable Scale Equipped
              </span>
            </div>
          </div>
        </div>

        {branch && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 14,
              fontSize: 12,
            }}
          >
            <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>Assigned Hub: </span>
            <strong style={{ color: 'var(--color-text-dark)' }}>{branch.name}</strong> ({branch.address})
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
              Courier Name
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
              Contact Number
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

      {/* Sign Out */}
      <div className="flat-block" style={{ background: '#F3EFE6' }}>
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
  );
}

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Branch } from '@/lib/types';

export default function ManagerSettingsPage() {
  const [branch, setBranch] = useState<Branch | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [baseProcessing, setBaseProcessing] = useState(120);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('users').select('branch_id').eq('id', user.id).single();
        if (profile?.branch_id) {
          const { data: b } = await supabase.from('branches').select('*').eq('id', profile.branch_id).single();
          if (b) {
            setBranch(b as Branch);
            setPhone(b.phone || '');
            setEmail(b.email || '');
            setBaseProcessing(b.base_processing_minutes || 120);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!branch) return;
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('branches')
        .update({
          phone: phone || null,
          email: email || null,
          base_processing_minutes: baseProcessing,
          updated_at: new Date().toISOString(),
        })
        .eq('id', branch.id);

      if (updateError) throw updateError;
      setSuccess('Branch preferences updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update branch settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="desktop-content fade-in">
        <div className="skeleton" style={{ height: 32, width: '40%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Branch Settings</h1>
          <p className="page-heading__subtitle">
            Configure contact information and operational turnaround targets for {branch?.name || 'your branch'}.
          </p>
        </div>
      </div>

      {success && (
        <div className="toast toast--success" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">{success}</div>
        </div>
      )}

      {error && (
        <div className="toast toast--error" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">{error}</div>
        </div>
      )}

      <div className="card" style={{ maxWidth: 600 }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="input-group">
            <label className="input-group__label">Branch Location Name</label>
            <input className="input" type="text" value={branch?.name || ''} disabled style={{ opacity: 0.7 }} />
          </div>

          <div className="input-group">
            <label className="input-group__label">Physical Address</label>
            <input className="input" type="text" value={branch?.address || ''} disabled style={{ opacity: 0.7 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="input-group">
              <label className="input-group__label">Branch Hotline</label>
              <input
                className="input"
                type="tel"
                placeholder="+63 917 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-group__label">Branch Email</label>
              <input
                className="input"
                type="email"
                placeholder="branch@washgo.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-group__label">
              Standard Processing Target (Minutes)
            </label>
            <input
              className="input"
              type="number"
              min="30"
              max="1440"
              value={baseProcessing}
              onChange={(e) => setBaseProcessing(parseInt(e.target.value, 10) || 120)}
            />
            <span className="input-group__hint">
              Used to calculate dynamic delivery estimates for customer pickups
            </span>
          </div>

          <button type="submit" className="btn btn--primary" style={{ marginTop: 8 }} disabled={saving}>
            {saving ? <span className="btn__spinner" /> : 'Save Branch Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}

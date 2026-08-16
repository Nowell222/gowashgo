'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { inviteRegisterSchema, type InviteRegisterInput } from '@/lib/validators/auth';
import { ROLE_LABELS, ROLE_HOME_ROUTES } from '@/lib/auth/roles';
import type { UserRole, Invite, Branch } from '@/lib/types';

interface InviteInfo {
  invite: Invite;
  branch: Branch;
}

export default function InviteRedeemPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');

  const [formData, setFormData] = useState<InviteRegisterInput>({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    invite_code: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // Load invite info
  useEffect(() => {
    async function loadInvite() {
      const { code: inviteCode } = await params;
      setCode(inviteCode);
      setFormData((prev) => ({ ...prev, invite_code: inviteCode }));

      try {
        const res = await fetch(`/api/invites/${inviteCode}`);
        const json = await res.json();

        if (!res.ok || !json.data) {
          setInviteError(json.error?.message || 'This invite link is invalid or has expired.');
          setLoadingInvite(false);
          return;
        }

        const data = json.data;
        setInviteInfo({ invite: data, branch: data.branch });
        if (data.email) {
          setFormData((prev) => ({ ...prev, email: data.email }));
        }
      } catch {
        setInviteError('Failed to load invite information.');
      } finally {
        setLoadingInvite(false);
      }
    }

    loadInvite();
  }, [params]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (globalError) setGlobalError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGlobalError('');

    const result = inviteRegisterSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    if (!inviteInfo) return;
    setLoading(true);

    try {
      // Call the invite redemption API
      const response = await fetch(`/api/invites/${code}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          password: formData.password,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        setGlobalError(responseData.error?.message || 'Registration failed.');
        setLoading(false);
        return;
      }

      // Sign in after successful registration
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      const role = inviteInfo.invite.role as UserRole;
      router.push(ROLE_HOME_ROUTES[role]);
      router.refresh();
    } catch {
      setGlobalError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  if (loadingInvite) {
    return (
      <div className="auth-card">
        <div className="auth-card__logo">
          <div className="auth-card__logo-icon">W</div>
          <h1 className="auth-card__logo-title"><span className="gradient-text">WashGo</span></h1>
        </div>
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <div className="btn__spinner" style={{ margin: '0 auto', borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
          <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
            Verifying invite...
          </p>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="auth-card">
        <div className="auth-card__logo">
          <div className="auth-card__logo-icon">W</div>
          <h1 className="auth-card__logo-title"><span className="gradient-text">WashGo</span></h1>
        </div>
        <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-full)',
            background: 'var(--color-error-bg)', color: 'var(--color-error)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'var(--text-2xl)', margin: '0 auto var(--space-4)'
          }}>✕</div>
          <p style={{ color: 'var(--color-text)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)' }}>
            Invalid Invite
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            {inviteError}
          </p>
        </div>
      </div>
    );
  }

  if (!inviteInfo) return null;

  return (
    <div className="auth-card">
      <div className="auth-card__logo">
        <div className="auth-card__logo-icon">W</div>
        <h1 className="auth-card__logo-title"><span className="gradient-text">WashGo</span></h1>
        <p className="auth-card__logo-subtitle">Join the team</p>
      </div>

      <div className="invite-info">
        <div className="invite-info__label">You&apos;re invited</div>
        <div className="invite-info__detail">
          <span>Role:</span> <strong>{ROLE_LABELS[inviteInfo.invite.role]}</strong>
        </div>
        <div className="invite-info__detail">
          <span>Branch:</span> <strong>{inviteInfo.branch.name}</strong>
        </div>
      </div>

      {globalError && (
        <div className="toast toast--error" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">{globalError}</div>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="input-group">
          <label className="input-group__label" htmlFor="invite-name">
            Full name <span className="input-group__required">*</span>
          </label>
          <input
            id="invite-name"
            className={`input ${errors.full_name ? 'input--error' : ''}`}
            type="text"
            name="full_name"
            placeholder="Your full name"
            value={formData.full_name}
            onChange={handleChange}
            autoComplete="name"
            autoFocus
          />
          {errors.full_name && <span className="input-group__error">{errors.full_name}</span>}
        </div>

        <div className="input-group">
          <label className="input-group__label" htmlFor="invite-email">
            Email address <span className="input-group__required">*</span>
          </label>
          <input
            id="invite-email"
            className={`input ${errors.email ? 'input--error' : ''}`}
            type="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            readOnly={!!inviteInfo.invite.email}
          />
          {errors.email && <span className="input-group__error">{errors.email}</span>}
        </div>

        <div className="input-group">
          <label className="input-group__label" htmlFor="invite-phone">
            Phone number <span className="input-group__hint">(optional)</span>
          </label>
          <input
            id="invite-phone"
            className={`input ${errors.phone ? 'input--error' : ''}`}
            type="tel"
            name="phone"
            placeholder="+639171234567"
            value={formData.phone}
            onChange={handleChange}
            autoComplete="tel"
          />
          {errors.phone && <span className="input-group__error">{errors.phone}</span>}
        </div>

        <div className="input-group">
          <label className="input-group__label" htmlFor="invite-password">
            Create password <span className="input-group__required">*</span>
          </label>
          <input
            id="invite-password"
            className={`input ${errors.password ? 'input--error' : ''}`}
            type="password"
            name="password"
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
          />
          {errors.password && <span className="input-group__error">{errors.password}</span>}
        </div>

        <div className="input-group">
          <label className="input-group__label" htmlFor="invite-confirm">
            Confirm password <span className="input-group__required">*</span>
          </label>
          <input
            id="invite-confirm"
            className={`input ${errors.confirm_password ? 'input--error' : ''}`}
            type="password"
            name="confirm_password"
            placeholder="Re-enter your password"
            value={formData.confirm_password}
            onChange={handleChange}
            autoComplete="new-password"
          />
          {errors.confirm_password && (
            <span className="input-group__error">{errors.confirm_password}</span>
          )}
        </div>

        <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading}>
          {loading ? <span className="btn__spinner" /> : 'Complete Registration'}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { loginSchema, type LoginInput } from '@/lib/validators/auth';
import { ROLE_HOME_ROUTES } from '@/lib/auth/roles';
import type { UserRole } from '@/lib/types';

interface LoginFormProps {
  embedded?: boolean;
  onSuccess?: () => void;
}

export function LoginForm({ embedded = false, onSuccess }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

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

    const result = loginSchema.safeParse(formData);
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

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setGlobalError(
          error.message === 'Invalid login credentials'
            ? 'Invalid email or password. Please try again.'
            : error.message
        );
        setLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess();
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const role = profile?.role as UserRole | undefined;
      const destination = redirectTo || (role ? ROLE_HOME_ROUTES[role] : '/customer');
      router.push(destination);
      router.refresh();
    } catch {
      setGlobalError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{ width: '100%' }}>
      {!embedded && (
        <>
          <h2 className="auth-card__heading">Welcome back</h2>
          <p className="auth-card__subheading">Sign in to your account to continue</p>
        </>
      )}

      {globalError && (
        <div className="toast toast--error" style={{ marginBottom: '16px' }}>
          <div className="toast__message">{globalError}</div>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="input-group">
          <label className="input-group__label" htmlFor="login-email" style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
            Email address
          </label>
          <input
            id="login-email"
            className={`input ${errors.email ? 'input--error' : ''}`}
            type="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            style={{ fontSize: 14 }}
          />
          {errors.email && <span className="input-group__error">{errors.email}</span>}
        </div>

        <div className="input-group">
          <label className="input-group__label" htmlFor="login-password" style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
            Password
          </label>
          <input
            id="login-password"
            className={`input ${errors.password ? 'input--error' : ''}`}
            type="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            style={{ fontSize: 14 }}
          />
          {errors.password && <span className="input-group__error">{errors.password}</span>}
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--full btn--lg"
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
            fontWeight: 700,
            fontSize: 15,
            padding: '12px 16px',
            marginTop: 6,
          }}
        >
          {loading ? <span className="btn__spinner" /> : 'Sign In'}
        </button>
      </form>

      {/* Quick Demo Access Bar */}
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #E2E8F0' }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#64748B',
          marginBottom: '10px',
          textAlign: 'center',
        }}>
          1-Tap Quick Demo Logins (Password: Password123!)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {[
            { label: 'Customer', email: 'customer@washgo.ph', badge: 'Book & Track' },
            { label: 'Rider', email: 'rider@washgo.ph', badge: 'Scale & Pick' },
            { label: 'Staff', email: 'staff@washgo.ph', badge: 'Wash & Fold' },
            { label: 'Manager', email: 'manager@washgo.ph', badge: 'Pricing & Team' },
            { label: 'Admin', email: 'admin@washgo.ph', badge: 'System' },
          ].map((acc) => {
            const isSelected = formData.email === acc.email;
            return (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setFormData({ email: acc.email, password: 'Password123!' });
                  setErrors({});
                  setGlobalError('');
                }}
                style={{
                  padding: '7px 6px',
                  borderRadius: '8px',
                  border: isSelected ? '1.5px solid #0284C7' : '1px solid #E2E8F0',
                  background: isSelected ? '#F0F9FF' : '#F8FAFC',
                  color: isSelected ? '#0369A1' : '#334155',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700 }}>{acc.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

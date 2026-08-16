'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { loginSchema, type LoginInput } from '@/lib/validators/auth';
import { ROLE_HOME_ROUTES } from '@/lib/auth/roles';
import type { UserRole } from '@/lib/types';

function LoginForm() {
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
    // Clear field error on change
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

    // Validate
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
        setGlobalError(error.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please try again.'
          : error.message
        );
        setLoading(false);
        return;
      }

      // Get user role to determine redirect
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const role = profile?.role as UserRole | undefined;
      const destination = redirectTo || (role ? ROLE_HOME_ROUTES[role] : '/');
      router.push(destination);
      router.refresh();
    } catch {
      setGlobalError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="auth-card__heading">Welcome back</h2>
      <p className="auth-card__subheading">Sign in to your account to continue</p>

      {globalError && (
        <div className="toast toast--error" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">{globalError}</div>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="input-group">
          <label className="input-group__label" htmlFor="login-email">
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
            autoFocus
          />
          {errors.email && <span className="input-group__error">{errors.email}</span>}
        </div>

        <div className="input-group">
          <label className="input-group__label" htmlFor="login-password">
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
          />
          {errors.password && <span className="input-group__error">{errors.password}</span>}
        </div>

        <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading}>
          {loading ? <span className="btn__spinner" /> : 'Sign In'}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-card">
      <div className="auth-card__logo">
        <div className="auth-card__logo-icon">W</div>
        <h1 className="auth-card__logo-title">
          <span className="gradient-text">WashGo</span>
        </h1>
        <p className="auth-card__logo-subtitle">Smart Laundry, Delivered</p>
      </div>

      <Suspense fallback={
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <div className="btn__spinner" style={{ margin: '0 auto', borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
        </div>
      }>
        <LoginForm />
      </Suspense>

      <p className="auth-form__footer">
        Don&apos;t have an account?{' '}
        <Link href="/register">Create one</Link>
      </p>
    </div>
  );
}

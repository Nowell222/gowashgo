'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { registerSchema, type RegisterInput } from '@/lib/validators/auth';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<RegisterInput>({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
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

    // Validate
    const result = registerSchema.safeParse(formData);
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

      // 1. Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: formData.phone || null,
            role: 'customer',
          },
        },
      });

      if (error) {
        setGlobalError(error.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setGlobalError('Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      // 2. Create user profile in the users table
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email: formData.email,
        phone: formData.phone || null,
        full_name: formData.full_name,
        role: 'customer',
        branch_id: null,
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // User was created in auth but profile failed — they can still log in
        // and we can handle profile creation on next login
      }

      // 3. Redirect to customer home
      router.push('/customer');
      router.refresh();
    } catch {
      setGlobalError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card__logo">
        <div className="auth-card__logo-icon">W</div>
        <h1 className="auth-card__logo-title">
          <span className="gradient-text">WashGo</span>
        </h1>
        <p className="auth-card__logo-subtitle">Create your account</p>
      </div>

      <h2 className="auth-card__heading">Get started</h2>
      <p className="auth-card__subheading">
        Schedule laundry pickup in minutes
      </p>

      {globalError && (
        <div className="toast toast--error" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">{globalError}</div>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="input-group">
          <label className="input-group__label" htmlFor="register-name">
            Full name <span className="input-group__required">*</span>
          </label>
          <input
            id="register-name"
            className={`input ${errors.full_name ? 'input--error' : ''}`}
            type="text"
            name="full_name"
            placeholder="Juan dela Cruz"
            value={formData.full_name}
            onChange={handleChange}
            autoComplete="name"
            autoFocus
          />
          {errors.full_name && <span className="input-group__error">{errors.full_name}</span>}
        </div>

        <div className="input-group">
          <label className="input-group__label" htmlFor="register-email">
            Email address <span className="input-group__required">*</span>
          </label>
          <input
            id="register-email"
            className={`input ${errors.email ? 'input--error' : ''}`}
            type="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
          />
          {errors.email && <span className="input-group__error">{errors.email}</span>}
        </div>

        <div className="input-group">
          <label className="input-group__label" htmlFor="register-phone">
            Phone number <span className="input-group__hint">(optional)</span>
          </label>
          <input
            id="register-phone"
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
          <label className="input-group__label" htmlFor="register-password">
            Password <span className="input-group__required">*</span>
          </label>
          <input
            id="register-password"
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
          <label className="input-group__label" htmlFor="register-confirm">
            Confirm password <span className="input-group__required">*</span>
          </label>
          <input
            id="register-confirm"
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
          {loading ? <span className="btn__spinner" /> : 'Create Account'}
        </button>
      </form>

      <p className="auth-form__footer">
        Already have an account?{' '}
        <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}

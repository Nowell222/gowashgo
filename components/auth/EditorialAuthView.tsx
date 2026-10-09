'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@/lib/validators/auth';
import { ROLE_HOME_ROUTES } from '@/lib/auth/roles';
import type { UserRole } from '@/lib/types';

interface EditorialAuthViewProps {
  initialTab?: 'signin' | 'register';
}

export default function EditorialAuthView({ initialTab = 'signin' }: EditorialAuthViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  const [activeTab, setActiveTab] = useState<'signin' | 'register'>(initialTab);

  // Login form state
  const [loginData, setLoginData] = useState<LoginInput>({
    email: '',
    password: '',
  });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginGlobalError, setLoginGlobalError] = useState('');

  // Register form state
  const [registerData, setRegisterData] = useState<RegisterInput>({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerGlobalError, setRegisterGlobalError] = useState('');

  // Handlers for Login
  function handleLoginChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    if (loginErrors[name]) {
      setLoginErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (loginGlobalError) setLoginGlobalError('');
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginErrors({});
    setLoginGlobalError('');

    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setLoginErrors(fieldErrors);
      return;
    }

    setLoginLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        setLoginGlobalError(
          error.message === 'Invalid login credentials'
            ? 'Invalid email or password. Please try again.'
            : error.message
        );
        setLoginLoading(false);
        return;
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
      setLoginGlobalError('An unexpected error occurred. Please try again.');
      setLoginLoading(false);
    }
  }

  // Handlers for Register
  function handleRegisterChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setRegisterData((prev) => ({ ...prev, [name]: value }));
    if (registerErrors[name]) {
      setRegisterErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (registerGlobalError) setRegisterGlobalError('');
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRegisterErrors({});
    setRegisterGlobalError('');

    const result = registerSchema.safeParse(registerData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setRegisterErrors(fieldErrors);
      return;
    }

    setRegisterLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            full_name: registerData.full_name,
            phone: registerData.phone || null,
            role: 'customer',
          },
        },
      });

      if (error) {
        setRegisterGlobalError(error.message);
        setRegisterLoading(false);
        return;
      }

      if (!data.user) {
        setRegisterGlobalError('Registration failed. Please try again.');
        setRegisterLoading(false);
        return;
      }

      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email: registerData.email,
        phone: registerData.phone || null,
        full_name: registerData.full_name,
        role: 'customer',
        branch_id: null,
      });

      if (profileError) {
        console.warn('Client profile creation failed, syncing via server API:', profileError);
        await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.user.id,
            email: registerData.email,
            phone: registerData.phone || null,
            full_name: registerData.full_name,
            role: 'customer',
          }),
        }).catch(() => {});
      }

      router.push('/customer');
      router.refresh();
    } catch {
      setRegisterGlobalError('An unexpected error occurred. Please try again.');
      setRegisterLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#FAF8F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1040,
          background: '#FFFFFF',
          border: '1px solid #CFFAFE',
          borderRadius: 4,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          boxShadow: '0 8px 30px rgba(14, 116, 144, 0.08)',
        }}
      >
        {/* ================= LEFT PANEL: FORM (LOGIN / REGISTER) ================= */}
        <div
          style={{
            padding: '36px 36px 40px',
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Top row: Back to Home & Logo */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 28,
              }}
            >
              <Link
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0E7490',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  borderRadius: 2,
                  background: '#ECFEFF',
                  border: '1px solid #CFFAFE',
                  transition: 'all 0.15s ease',
                }}
              >
                ← Back to Home
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src="/icons/gowashgo-icon.png"
                  alt="GoWashGo"
                  width={24}
                  height={24}
                  style={{ borderRadius: 6, objectFit: 'contain' }}
                />
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: '#164E63',
                  }}
                >
                  gowashgo
                </span>
              </div>
            </div>

            {/* Tab Switcher: Sign In | Create Account */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 4,
                background: '#ECFEFF',
                padding: 4,
                borderRadius: 2,
                marginBottom: 28,
                border: '1px solid #CFFAFE',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setLoginGlobalError('');
                  setRegisterGlobalError('');
                }}
                style={{
                  padding: '9px 12px',
                  fontSize: 13,
                  fontWeight: activeTab === 'signin' ? 700 : 500,
                  color: activeTab === 'signin' ? '#0E7490' : '#64748B',
                  background: activeTab === 'signin' ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  borderRadius: 2,
                  boxShadow: activeTab === 'signin' ? '0 1px 4px rgba(14, 116, 144, 0.12)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setLoginGlobalError('');
                  setRegisterGlobalError('');
                }}
                style={{
                  padding: '9px 12px',
                  fontSize: 13,
                  fontWeight: activeTab === 'register' ? 700 : 500,
                  color: activeTab === 'register' ? '#0E7490' : '#64748B',
                  background: activeTab === 'register' ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  borderRadius: 2,
                  boxShadow: activeTab === 'register' ? '0 1px 4px rgba(14, 116, 144, 0.12)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Create Account
              </button>
            </div>

            {/* ================= TAB 1: SIGN IN ================= */}
            {activeTab === 'signin' && (
              <div>
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: '#164E63',
                    margin: '0 0 6px 0',
                  }}
                >
                  Welcome back.
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: '#475569',
                    margin: '0 0 24px 0',
                    lineHeight: 1.5,
                  }}
                >
                  Sign in with your email and password to track your laundry orders.
                </p>

                {loginGlobalError && (
                  <div
                    style={{
                      background: '#FEF2F2',
                      border: '1px solid #F87171',
                      color: '#991B1B',
                      fontSize: 13,
                      padding: '10px 14px',
                      borderRadius: 2,
                      marginBottom: 18,
                    }}
                  >
                    {loginGlobalError}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} noValidate>
                  {/* Email */}
                  <div style={{ marginBottom: 16 }}>
                    <label
                      htmlFor="auth-login-email"
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#164E63',
                        marginBottom: 6,
                        letterSpacing: '0.01em',
                      }}
                    >
                      Email address
                    </label>
                    <input
                      id="auth-login-email"
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={loginData.email}
                      onChange={handleLoginChange}
                      autoComplete="email"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        fontSize: 14,
                        border: loginErrors.email ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        borderRadius: 2,
                        background: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {loginErrors.email && (
                      <span style={{ fontSize: 11, color: '#DC2626', marginTop: 4, display: 'block' }}>
                        {loginErrors.email}
                      </span>
                    )}
                  </div>

                  {/* Password */}
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <label
                        htmlFor="auth-login-password"
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#164E63',
                          letterSpacing: '0.01em',
                        }}
                      >
                        Password
                      </label>
                    </div>
                    <input
                      id="auth-login-password"
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      autoComplete="current-password"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        fontSize: 14,
                        border: loginErrors.password ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        borderRadius: 2,
                        background: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {loginErrors.password && (
                      <span style={{ fontSize: 11, color: '#DC2626', marginTop: 4, display: 'block' }}>
                        {loginErrors.password}
                      </span>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loginLoading}
                    style={{
                      width: '100%',
                      padding: '13px 20px',
                      background: '#0E7490',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 2,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: loginLoading ? 'not-allowed' : 'pointer',
                      letterSpacing: '0.01em',
                      transition: 'background 0.15s ease',
                      opacity: loginLoading ? 0.7 : 1,
                    }}
                  >
                    {loginLoading ? 'Signing in...' : 'Sign In ↗'}
                  </button>
                </form>

                <p
                  style={{
                    fontSize: 13,
                    color: '#64748B',
                    textAlign: 'center',
                    marginTop: 22,
                    marginBottom: 0,
                  }}
                >
                  Don’t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0E7490',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: 13,
                    }}
                  >
                    Create one
                  </button>
                </p>
              </div>
            )}

            {/* ================= TAB 2: CREATE ACCOUNT ================= */}
            {activeTab === 'register' && (
              <div>
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: '#164E63',
                    margin: '0 0 6px 0',
                  }}
                >
                  Create an account.
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: '#475569',
                    margin: '0 0 20px 0',
                    lineHeight: 1.5,
                  }}
                >
                  Book doorstep pickups with calibrated scale weighing in San Juan.
                </p>

                {registerGlobalError && (
                  <div
                    style={{
                      background: '#FEF2F2',
                      border: '1px solid #F87171',
                      color: '#991B1B',
                      fontSize: 13,
                      padding: '10px 14px',
                      borderRadius: 2,
                      marginBottom: 16,
                    }}
                  >
                    {registerGlobalError}
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} noValidate>
                  {/* Full Name */}
                  <div style={{ marginBottom: 14 }}>
                    <label
                      htmlFor="auth-reg-name"
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#164E63',
                        marginBottom: 5,
                      }}
                    >
                      Full name
                    </label>
                    <input
                      id="auth-reg-name"
                      type="text"
                      name="full_name"
                      placeholder="e.g. Maria Santos"
                      value={registerData.full_name}
                      onChange={handleRegisterChange}
                      autoComplete="name"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: 14,
                        border: registerErrors.full_name ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        borderRadius: 2,
                        background: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {registerErrors.full_name && (
                      <span style={{ fontSize: 11, color: '#DC2626', marginTop: 4, display: 'block' }}>
                        {registerErrors.full_name}
                      </span>
                    )}
                  </div>

                  {/* Email */}
                  <div style={{ marginBottom: 14 }}>
                    <label
                      htmlFor="auth-reg-email"
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#164E63',
                        marginBottom: 5,
                      }}
                    >
                      Email address
                    </label>
                    <input
                      id="auth-reg-email"
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={registerData.email}
                      onChange={handleRegisterChange}
                      autoComplete="email"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: 14,
                        border: registerErrors.email ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        borderRadius: 2,
                        background: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {registerErrors.email && (
                      <span style={{ fontSize: 11, color: '#DC2626', marginTop: 4, display: 'block' }}>
                        {registerErrors.email}
                      </span>
                    )}
                  </div>

                  {/* Phone */}
                  <div style={{ marginBottom: 14 }}>
                    <label
                      htmlFor="auth-reg-phone"
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#164E63',
                        marginBottom: 5,
                      }}
                    >
                      Mobile phone (optional)
                    </label>
                    <input
                      id="auth-reg-phone"
                      type="tel"
                      name="phone"
                      placeholder="09171234567"
                      value={registerData.phone}
                      onChange={handleRegisterChange}
                      autoComplete="tel"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: 14,
                        border: registerErrors.phone ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        borderRadius: 2,
                        background: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {registerErrors.phone && (
                      <span style={{ fontSize: 11, color: '#DC2626', marginTop: 4, display: 'block' }}>
                        {registerErrors.phone}
                      </span>
                    )}
                  </div>

                  {/* Password */}
                  <div style={{ marginBottom: 14 }}>
                    <label
                      htmlFor="auth-reg-password"
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#164E63',
                        marginBottom: 5,
                      }}
                    >
                      Password (min 8 characters)
                    </label>
                    <input
                      id="auth-reg-password"
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      value={registerData.password}
                      onChange={handleRegisterChange}
                      autoComplete="new-password"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: 14,
                        border: registerErrors.password ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        borderRadius: 2,
                        background: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {registerErrors.password && (
                      <span style={{ fontSize: 11, color: '#DC2626', marginTop: 4, display: 'block' }}>
                        {registerErrors.password}
                      </span>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div style={{ marginBottom: 20 }}>
                    <label
                      htmlFor="auth-reg-confirm"
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#164E63',
                        marginBottom: 5,
                      }}
                    >
                      Confirm password
                    </label>
                    <input
                      id="auth-reg-confirm"
                      type="password"
                      name="confirm_password"
                      placeholder="••••••••"
                      value={registerData.confirm_password}
                      onChange={handleRegisterChange}
                      autoComplete="new-password"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: 14,
                        border: registerErrors.confirm_password ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        borderRadius: 2,
                        background: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {registerErrors.confirm_password && (
                      <span style={{ fontSize: 11, color: '#DC2626', marginTop: 4, display: 'block' }}>
                        {registerErrors.confirm_password}
                      </span>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={registerLoading}
                    style={{
                      width: '100%',
                      padding: '13px 20px',
                      background: '#0E7490',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 2,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: registerLoading ? 'not-allowed' : 'pointer',
                      letterSpacing: '0.01em',
                      transition: 'background 0.15s ease',
                      opacity: registerLoading ? 0.7 : 1,
                    }}
                  >
                    {registerLoading ? 'Creating account...' : 'Create Account ↗'}
                  </button>
                </form>

                <p
                  style={{
                    fontSize: 13,
                    color: '#64748B',
                    textAlign: 'center',
                    marginTop: 20,
                    marginBottom: 0,
                  }}
                >
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('signin')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0E7490',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: 13,
                    }}
                  >
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div
            style={{
              borderTop: '1px solid #E2E8F0',
              paddingTop: 16,
              marginTop: 24,
              fontSize: 11,
              color: '#64748B',
              fontFamily: '"JetBrains Mono", monospace',
              textAlign: 'center',
              letterSpacing: '0.04em',
            }}
          >
            SAN JUAN, BATANGAS HUB · SECURE LAUNDRY ACCESS
          </div>
        </div>

        {/* ================= RIGHT PANEL: SYSTEM DETAILS ================= */}
        <div
          style={{
            background: '#164E63',
            color: '#FFFFFF',
            padding: '44px 38px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#67E8F9',
                textTransform: 'uppercase',
                marginBottom: 16,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              SAN JUAN, BATANGAS HUB · DOORSTEP SERVICE
            </p>

            <h2
              style={{
                fontSize: 'clamp(28px, 3.2vw, 38px)',
                lineHeight: 1.12,
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.03em',
                margin: '0 0 16px 0',
              }}
            >
              Doorstep pickup.
              <br />
              Honest weighing.
              <br />
              Zero Sunday chores.
            </h2>

            <p
              style={{
                fontFamily: '"Newsreader", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 18,
                color: '#CFFAFE',
                margin: '0 0 32px 0',
                lineHeight: 1.35,
              }}
            >
              “Useful work, done properly. That’s the whole idea.”
            </p>

            {/* Feature 1 */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', padding: '16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#67E8F9' }}>01</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                  Calibrated Hanging Scales at Your Door
                </h3>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: '#E0F2FE', margin: 0, paddingLeft: 24 }}>
                Our riders bring certified portable scales right to your gate. You verify and agree on the exact weight before we start washing.
              </p>
            </div>

            {/* Feature 2 */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', padding: '16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#67E8F9' }}>02</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                  ₱35 / kg Transparent Rate
                </h3>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: '#E0F2FE', margin: 0, paddingLeft: 24 }}>
                Everyday clothes washed, dried, and folded. No complicated packages, with flat ₱50 doorstep pickup and return across San Juan.
              </p>
            </div>

            {/* Feature 3 */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', padding: '16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#67E8F9' }}>03</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                  Live Order Status Tracking
                </h3>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: '#E0F2FE', margin: 0, paddingLeft: 24 }}>
                Track your laundry in real time: Received → Weighed → Washing → Drying → Folded → Out for Delivery.
              </p>
            </div>

            {/* Feature 4 */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)', padding: '16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#67E8F9' }}>04</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                  GCash, Maya & Cash on Delivery
                </h3>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: '#E0F2FE', margin: 0, paddingLeft: 24 }}>
                Pay conveniently upon delivery when your laundry arrives clean, fresh, and neatly folded ready for your cabinet.
              </p>
            </div>
          </div>

          {/* Bottom Card Summary */}
          <div
            style={{
              marginTop: 28,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 2,
              padding: '16px 20px',
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: '0.08em',
                color: '#A5F3FC',
                textTransform: 'uppercase',
                margin: '0 0 6px 0',
              }}
            >
              SERVICING POBLACION · LAIYA · CALUBCUB & BARANGAYS
            </p>
            <p style={{ fontSize: 12, color: '#FFFFFF', margin: 0, lineHeight: 1.4 }}>
              Hub: General Luna St., Poblacion, San Juan, Batangas
              <br />
              <span style={{ color: '#CFFAFE' }}>Open Mon–Fri 7am–7pm · Sat 8am–6pm · Sun 8am–4pm</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

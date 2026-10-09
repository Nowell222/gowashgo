'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { inviteRegisterSchema, type InviteRegisterInput } from '@/lib/validators/auth';
import { ROLE_LABELS, ROLE_HOME_ROUTES } from '@/lib/auth/roles';
import { CareTagIcon, ScooterCourierIcon, WaterDropIcon, CheckmarkBadgeIcon } from '@/components/icons';
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
  const [showPassword, setShowPassword] = useState(false);

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
        setInviteError('Failed to load invite information. Please check your network connection.');
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

  // Loading State
  if (loadingInvite) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          background: '#FAF8F5',
          fontFamily: 'var(--font-karla, "Karla", sans-serif)',
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: '100%',
            background: '#FFFFFF',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
          }}
        >
          <img
            src="/icons/gowashgo-icon.png"
            alt="GoWashGo"
            width={48}
            height={48}
            style={{ borderRadius: 10, margin: '0 auto 16px', display: 'block' }}
          />
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              color: '#0F172A',
              marginBottom: 6,
            }}
          >
            Verifying Invitation Token...
          </div>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
            Checking your activation code against the GoWashGo operations registry.
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (inviteError) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          background: '#FAF8F5',
          fontFamily: 'var(--font-karla, "Karla", sans-serif)',
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            background: '#FFFFFF',
            padding: '36px 32px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
          }}
        >
          <img
            src="/icons/gowashgo-icon.png"
            alt="GoWashGo"
            width={48}
            height={48}
            style={{ borderRadius: 10, margin: '0 auto 16px', display: 'block' }}
          />

          <div
            style={{
              background: '#FEF2F2',
              color: '#991B1B',
              padding: '16px 20px',
              marginBottom: 20,
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                marginBottom: 4,
              }}
            >
              Invalid or Expired Invitation
            </div>
            <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.5 }}>
              {inviteError}
            </div>
          </div>

          <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>
            Invitation links expire after 7 days or after being redeemed. Please contact your Branch Manager to request a new recruitment link.
          </p>

          <Link
            href="/"
            style={{
              display: 'inline-block',
              background: '#0E7490',
              color: '#FFFFFF',
              padding: '12px 24px',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              textDecoration: 'none',
            }}
          >
            ← Return to GoWashGo Home
          </Link>
        </div>
      </div>
    );
  }

  if (!inviteInfo) return null;

  const roleTitle =
    inviteInfo.invite.role === 'rider'
      ? 'Delivery Courier Rider'
      : inviteInfo.invite.role === 'staff'
      ? 'Facility Laundry Staff'
      : 'Branch Manager';

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#FAF8F5',
        padding: '32px 16px 64px',
        fontFamily: 'var(--font-karla, "Karla", sans-serif)',
        color: '#0F172A',
      }}
    >
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        {/* Brand Header Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#0E7490',
              textDecoration: 'none',
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            ← Back to Home
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src="/icons/gowashgo-icon.png"
              alt="GoWashGo"
              width={26}
              height={26}
              style={{ borderRadius: 6, objectFit: 'contain' }}
            />
            <span
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#164E63',
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                letterSpacing: '-0.02em',
              }}
            >
              gowashgo
            </span>
          </div>
        </div>

        {/* Top Highlight in Flat Amber Block */}
        <div
          style={{
            background: '#FEF3C7',
            padding: '20px 24px',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#92400E',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              marginBottom: 4,
            }}
          >
            OFFICIAL OPERATIONS INVITATION · {inviteInfo.branch.name.toUpperCase()}
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#78350F',
              letterSpacing: '-0.02em',
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              margin: '0 0 10px 0',
              lineHeight: 1.2,
            }}
          >
            Join as {roleTitle}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: '#92400E',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#FFFFFF',
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 700,
                color: '#0E7490',
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              }}
            >
              {inviteInfo.invite.role === 'rider' ? (
                <ScooterCourierIcon size={14} color="#0E7490" />
              ) : (
                <CareTagIcon size={14} color="#0E7490" />
              )}
              {ROLE_LABELS[inviteInfo.invite.role]}
            </span>

            <span>•</span>
            <span>Hub: <strong>{inviteInfo.branch.name}</strong></span>
            <span>•</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>Code: {code}</span>
          </div>
        </div>

        {/* Main Registration Form Card (Flat, Clean) */}
        <div
          style={{
            background: '#FFFFFF',
            padding: '28px 28px 32px',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                margin: '0 0 4px',
                color: '#0F172A',
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              }}
            >
              Activate Your Team Account
            </h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Set your name and password to complete onboarding and access your shift terminal.
            </p>
          </div>

          {globalError && (
            <div
              style={{
                background: '#FEF2F2',
                color: '#991B1B',
                padding: '10px 14px',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="invite-name"
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 6,
                }}
              >
                Full Name <span style={{ color: '#0E7490' }}>*</span>
              </label>
              <input
                id="invite-name"
                type="text"
                name="full_name"
                placeholder="e.g. Juan dela Cruz"
                value={formData.full_name}
                onChange={handleChange}
                autoComplete="name"
                autoFocus
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  fontSize: 14,
                  background: '#F8FAFC',
                  border: errors.full_name ? '1px solid #EF4444' : '1px solid #E2E8F0',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.full_name && (
                <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>
                  {errors.full_name}
                </div>
              )}
            </div>

            {/* Email Address */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <label
                  htmlFor="invite-email"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Email Address <span style={{ color: '#0E7490' }}>*</span>
                </label>
                {inviteInfo.invite.email && (
                  <span style={{ fontSize: 11, color: '#0E7490', fontWeight: 600 }}>
                    🔒 Locked to invitation
                  </span>
                )}
              </div>
              <input
                id="invite-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                readOnly={!!inviteInfo.invite.email}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  fontSize: 14,
                  background: inviteInfo.invite.email ? '#F1F5F9' : '#F8FAFC',
                  border: errors.email ? '1px solid #EF4444' : '1px solid #E2E8F0',
                  color: inviteInfo.invite.email ? '#475569' : '#0F172A',
                  cursor: inviteInfo.invite.email ? 'not-allowed' : 'text',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.email && (
                <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>
                  {errors.email}
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="invite-phone"
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 6,
                }}
              >
                Mobile Phone <span style={{ color: '#94A3B8', fontWeight: 500 }}>(Optional)</span>
              </label>
              <input
                id="invite-phone"
                type="tel"
                name="phone"
                placeholder="+63 917 123 4567"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  fontSize: 14,
                  background: '#F8FAFC',
                  border: errors.phone ? '1px solid #EF4444' : '1px solid #E2E8F0',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.phone && (
                <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>
                  {errors.phone}
                </div>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <label
                  htmlFor="invite-password"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Create Password <span style={{ color: '#0E7490' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 11,
                    color: '#0E7490',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="invite-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  fontSize: 14,
                  background: '#F8FAFC',
                  border: errors.password ? '1px solid #EF4444' : '1px solid #E2E8F0',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.password && (
                <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>
                  {errors.password}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="invite-confirm"
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 6,
                }}
              >
                Confirm Password <span style={{ color: '#0E7490' }}>*</span>
              </label>
              <input
                id="invite-confirm"
                type={showPassword ? 'text' : 'password'}
                name="confirm_password"
                placeholder="Re-enter your password"
                value={formData.confirm_password}
                onChange={handleChange}
                autoComplete="new-password"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  fontSize: 14,
                  background: '#F8FAFC',
                  border: errors.confirm_password ? '1px solid #EF4444' : '1px solid #E2E8F0',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.confirm_password && (
                <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>
                  {errors.confirm_password}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: '#0E7490',
                color: '#FFFFFF',
                border: 'none',
                height: 46,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em',
                transition: 'background 0.15s ease',
              }}
            >
              {loading ? 'Activating Account & Logging In...' : 'Complete Registration & Enter Hub →'}
            </button>
          </form>

          {/* Bottom Onboarding Trust Strip */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              fontSize: 11,
              color: '#64748B',
              flexWrap: 'wrap',
            }}
          >
            <span>🧺 Fabric-safe training on shift</span>
            <span>•</span>
            <span>⚖️ Calibrated scale weighing</span>
            <span>•</span>
            <span>⚡ Real-time terminal access</span>
          </div>
        </div>
      </div>
    </div>
  );
}

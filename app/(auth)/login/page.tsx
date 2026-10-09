'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';


export default function LoginPage() {
  return (
    <div className="auth-card">
      <div className="auth-card__logo">
        <img
          src="/icons/gowashgo-icon.png"
          alt="GoWashGo"
          width={56}
          height={56}
          style={{ borderRadius: 14, objectFit: 'contain', margin: '0 auto 10px', display: 'block' }}
        />
        <h1 className="auth-card__logo-title">
          <span className="gradient-text">GoWashGo</span>
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

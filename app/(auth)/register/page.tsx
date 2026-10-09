'use client';

import { Suspense } from 'react';
import EditorialAuthView from '@/components/auth/EditorialAuthView';

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100dvh', background: '#F7F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#1C323D', fontSize: 14, fontFamily: 'monospace' }}>Loading GoWashGo...</div>
        </div>
      }
    >
      <EditorialAuthView initialTab="register" />
    </Suspense>
  );
}

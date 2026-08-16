'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Branch } from '@/lib/types';

export default function ManagerDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
        if (profile) {
          setUser(profile as User);
          if (profile.branch_id) {
            const { data: branchData } = await supabase.from('branches').select('*').eq('id', profile.branch_id).single();
            if (branchData) setBranch(branchData as Branch);
          }
        }
      }
    }
    load();
  }, []);

  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">
            {branch ? branch.name : 'Branch Dashboard'}
          </h1>
          <p className="page-heading__subtitle">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Manager'}. Here&apos;s your branch overview.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Orders Today</div>
          <div className="stat-card__value">0</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Revenue Today</div>
          <div className="stat-card__value">₱0</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Active Staff</div>
          <div className="stat-card__value">0</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Active Riders</div>
          <div className="stat-card__value">0</div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Recent Activity</h2>
        </div>
        <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
          <div className="empty-state__icon">📊</div>
          <p className="empty-state__title">No activity yet</p>
          <p className="empty-state__description">Branch activity will appear here as orders come in.</p>
        </div>
      </div>
    </div>
  );
}

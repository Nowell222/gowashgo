'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatPeso } from '@/lib/utils/currency';
import type { User, Branch, OrderWithDetails } from '@/lib/types';

interface DailyReportRow {
  date: string;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalWeightKg: number;
  cashRevenue: number;
  onlineRevenue: number;
}

interface RiderSettlementRow {
  riderId: string;
  riderName: string;
  phone: string;
  cashCollected: number;
  completedCount: number;
  isSettled: boolean;
}

export default function ManagerDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalRatingsCount, setTotalRatingsCount] = useState<number>(0);
  const [riderSettlements, setRiderSettlements] = useState<RiderSettlementRow[]>([]);
  const [settlingRiderId, setSettlingRiderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
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

      // Load orders
      const ordersRes = await fetch('/api/orders?limit=200');
      const ordersJson = await ordersRes.json();
      const allOrders: OrderWithDetails[] = ordersJson.data || [];
      setOrders(allOrders);

      // Load average branch rating
      const { data: ratings } = await supabase
        .from('order_ratings')
        .select('stars');
      if (ratings && ratings.length > 0) {
        const avg = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
        setAverageRating(avg);
        setTotalRatingsCount(ratings.length);
      }

      // Load rider cash settlements for today
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: riders } = await supabase.from('users').select('id, full_name, phone').eq('role', 'rider');
      const { data: settlements } = await supabase.from('rider_cash_settlements').select('*').eq('shift_date', todayStr);

      if (riders) {
        const rows: RiderSettlementRow[] = riders.map((r) => {
          const riderTodayOrders = allOrders.filter(
            (o) => o.rider_id === r.id && ['delivered', 'completed'].includes(o.status)
          );
          const riderCash = riderTodayOrders
            .filter((o) => o.payment_method === 'cash' && o.cash_collected)
            .reduce((sum, o) => sum + (o.total || 0), 0);

          const settlement = (settlements || []).find((s) => s.rider_id === r.id);

          return {
            riderId: r.id,
            riderName: r.full_name,
            phone: r.phone || '',
            cashCollected: riderCash,
            completedCount: riderTodayOrders.length,
            isSettled: Boolean(settlement?.is_settled),
          };
        });
        setRiderSettlements(rows);
      }
    } catch (err) {
      console.error('Error loading manager dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  async function handleSettleCash(riderId: string, amount: number, count: number) {
    setSettlingRiderId(riderId);
    try {
      const res = await fetch('/api/riders/earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rider_id: riderId,
          amount,
          orders_count: count,
          shift_date: new Date().toISOString().split('T')[0],
        }),
      });
      if (res.ok) {
        loadData();
      } else {
        alert('Failed to reconcile cash');
      }
    } catch {
      alert('Network error reconciling cash');
    } finally {
      setSettlingRiderId(null);
    }
  }

  // Tier B5: Daily aggregation for revenue report
  const dailyReportMap = new Map<string, DailyReportRow>();
  for (const o of orders) {
    const d = new Date(o.created_at).toISOString().split('T')[0];
    if (!dailyReportMap.has(d)) {
      dailyReportMap.set(d, {
        date: d,
        totalOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        totalWeightKg: 0,
        cashRevenue: 0,
        onlineRevenue: 0,
      });
    }
    const row = dailyReportMap.get(d)!;
    row.totalOrders += 1;
    if (['delivered', 'completed'].includes(o.status)) {
      row.completedOrders += 1;
      row.totalRevenue += o.total || 0;
      row.totalWeightKg += o.weight_kg || 0;
      if (o.payment_method === 'cash') {
        row.cashRevenue += o.total || 0;
      } else {
        row.onlineRevenue += o.total || 0;
      }
    }
  }

  const dailyReportRows = Array.from(dailyReportMap.values()).sort((a, b) => b.date.localeCompare(a.date));

  // Client-Side CSV Export (Tier B5)
  function handleExportCsv() {
    if (dailyReportRows.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Date', 'Total Orders', 'Completed Orders', 'Total Weight (kg)', 'Cash Revenue (PHP)', 'Online Revenue (PHP)', 'Total Revenue (PHP)'];
    const rows = dailyReportRows.map((r) => [
      r.date,
      r.totalOrders,
      r.completedOrders,
      r.totalWeightKg.toFixed(1),
      (r.cashRevenue / 100).toFixed(2),
      (r.onlineRevenue / 100).toFixed(2),
      (r.totalRevenue / 100).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `washgo-revenue-report-${branch?.name.replace(/\s+/g, '_') || 'branch'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const completedOrders = orders.filter((o) => ['delivered', 'completed'].includes(o.status));
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const activeOrders = orders.filter((o) => !['delivered', 'completed', 'cancelled'].includes(o.status));

  return (
    <div className="desktop-content fade-in">
      {/* Heading */}
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">
            {branch ? branch.name : 'Branch Hub'}
          </h1>
          <p className="page-heading__subtitle">
            Welcome back, {user?.full_name || 'Manager'}. Supervise live orders, cash reconciliation, and volume reports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleExportCsv}
          >
            📥 Export CSV Report
          </button>
          <Link href="/manager/orders" className="btn btn--primary">
            Manage Orders →
          </Link>
        </div>
      </div>

      {/* Stats Grid with Tier B2 Rating Card */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-card__label">Total Orders Processed</div>
          <div className="stat-card__value">{orders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Realized Revenue</div>
          <div className="stat-card__value" style={{ color: '#059669' }}>
            {formatPeso(totalRevenue)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Active In-Pipeline</div>
          <div className="stat-card__value" style={{ color: '#0284C7' }}>
            {activeOrders.length}
          </div>
        </div>
        {/* Tier B2: Branch Customer Rating */}
        <div className="stat-card" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="stat-card__label" style={{ color: '#92400E' }}>⭐ Branch Customer Rating</div>
          <div className="stat-card__value" style={{ color: '#B45309' }}>
            {averageRating ? `${averageRating.toFixed(1)} / 5.0` : '5.0 ★'}
          </div>
          <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
            {totalRatingsCount > 0 ? `${totalRatingsCount} customer reviews` : 'Awaiting first customer review'}
          </div>
        </div>
      </div>

      {/* ================= TIER B1: Rider Shift Cash Reconciliation Checklist ================= */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card__title" style={{ fontSize: 16 }}>💵 Rider Cash Reconciliation (Today)</h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
              Verify and reconcile collected Cash on Delivery (COD) handovers from active couriers.
            </p>
          </div>
        </div>

        {riderSettlements.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
            <p className="empty-state__description">No active delivery couriers found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Rider Name</th>
                  <th>Contact</th>
                  <th>Completed Deliveries</th>
                  <th>Cash Collected</th>
                  <th>Handover Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {riderSettlements.map((r) => (
                  <tr key={r.riderId}>
                    <td>
                      <strong style={{ color: '#0F172A' }}>{r.riderName}</strong>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748B' }}>{r.phone || '—'}</td>
                    <td>{r.completedCount} orders</td>
                    <td style={{ fontWeight: 700, color: '#15803D', fontSize: 14 }}>
                      {formatPeso(r.cashCollected)}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: r.isSettled ? '#ECFDF5' : r.cashCollected > 0 ? '#FEF3C7' : '#F1F5F9',
                        color: r.isSettled ? '#065F46' : r.cashCollected > 0 ? '#92400E' : '#64748B',
                      }}>
                        {r.isSettled ? '✓ Handed Over' : r.cashCollected > 0 ? '⏳ Pending Handover' : 'No Cash'}
                      </span>
                    </td>
                    <td>
                      {!r.isSettled && r.cashCollected > 0 ? (
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          disabled={settlingRiderId === r.riderId}
                          onClick={() => handleSettleCash(r.riderId, r.cashCollected, r.completedCount)}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                        >
                          {settlingRiderId === r.riderId ? 'Saving...' : '✓ Confirm Handover'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94A3B8' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= TIER B5: Daily Volume & Revenue Report Table ================= */}
      <div className="card">
        <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card__title" style={{ fontSize: 16 }}>📊 Daily Revenue &amp; Volume Report</h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
              Track day-over-day financial throughput, digital scale weights, and payment breakdown.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={handleExportCsv}
          >
            📥 Download CSV
          </button>
        </div>

        {dailyReportRows.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
            <p className="empty-state__description">No financial records yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Orders</th>
                  <th>Completed</th>
                  <th>Verified Weight</th>
                  <th>Cash Received</th>
                  <th>Online Received</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {dailyReportRows.map((row) => (
                  <tr key={row.date}>
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {new Date(row.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>{row.totalOrders}</td>
                    <td>
                      <span className="status-badge status-badge--success">{row.completedOrders} completed</span>
                    </td>
                    <td>{row.totalWeightKg > 0 ? `${row.totalWeightKg.toFixed(1)} kg` : '—'}</td>
                    <td>{formatPeso(row.cashRevenue)}</td>
                    <td>{formatPeso(row.onlineRevenue)}</td>
                    <td style={{ fontWeight: 800, color: '#0284C7', fontSize: 14 }}>
                      {formatPeso(row.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatPeso } from '@/lib/utils/currency';
import {
  MachineDrumIcon,
  BasketIcon,
  ScaleIcon,
  ScooterCourierIcon,
  ReceiptTicketIcon,
  CheckmarkBadgeIcon,
  CareTagIcon,
  AlertFlagIcon,
} from '@/components/icons';
import { downloadManagerShiftReport } from '@/lib/reports/pdf-reports';
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

  // Daily aggregation for revenue report
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

  // Client-Side CSV Export
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

  // Key operations calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter((o) => o.created_at.startsWith(todayStr));
  const completedOrders = orders.filter((o) => ['delivered', 'completed'].includes(o.status));
  const activeFacilityOrders = orders.filter((o) => ['at_facility', 'washing', 'drying', 'folding'].includes(o.status));

  const totalRealizedRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalWeightKgDelivered = completedOrders.reduce((sum, o) => sum + (o.weight_kg || 0), 0);

  // Unreconciled courier cash calculations (The Top Highlight metric!)
  const unremittedSettlements = riderSettlements.filter((r) => !r.isSettled && r.cashCollected > 0);
  const totalUnremittedCash = unremittedSettlements.reduce((sum, r) => sum + r.cashCollected, 0);

  return (
    <div
      style={{
        padding: '16px 20px 40px',
        maxWidth: 1400,
        margin: '0 auto',
        fontFamily: 'var(--font-karla, "Karla", sans-serif)',
        color: '#0F172A',
      }}
    >
      {/* ========================================================================= */}
      {/* TOP HIGHLIGHT: SINGLE MOST IMPORTANT NUMBER IN FLAT AMBER BLOCK           */}
      {/* (UNREMITTED COURIER CASH HANDOVER FOR SHIFT CLOSEOUT)                    */}
      {/* ========================================================================= */}
      <div
        style={{
          background: '#FEF3C7',
          padding: '20px 24px',
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
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
              COURIER CASH RECONCILIATION · SHIFT HANDOVER
            </div>
            <div
              style={{
                fontSize: 'clamp(28px, 3.5vw, 38px)',
                fontWeight: 700,
                color: '#78350F',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              }}
            >
              {formatPeso(totalUnremittedCash)} Unremitted Courier Cash
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#92400E',
                marginTop: 4,
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              }}
            >
              {unremittedSettlements.length} active couriers pending COD drawer handover today
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                downloadManagerShiftReport({
                  branchName: branch?.name || 'San Juan Batangas Hub',
                  branchAddress: branch?.address || 'General Luna St., Poblacion, San Juan, Batangas',
                  managerName: user?.full_name || 'Branch Manager',
                  orders,
                  riderSettlements,
                });
              }}
              style={{
                background: '#78350F',
                color: '#FFFFFF',
                padding: '10px 18px',
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ReceiptTicketIcon size={14} /> Download Shift PDF Report
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              style={{
                background: '#FFFFFF',
                color: '#78350F',
                padding: '10px 16px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              }}
            >
              Export CSV Ledger
            </button>
            <Link
              href="/manager/orders"
              style={{
                background: '#FFFFFF',
                color: '#78350F',
                padding: '10px 18px',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              }}
            >
              Manage Orders →
            </Link>
          </div>
        </div>

        {/* Operating subtitle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: '#92400E',
            fontWeight: 600,
            paddingTop: 8,
          }}
        >
          <ScaleIcon size={14} color="#92400E" />
          <span>Hub: {branch ? branch.name : 'San Juan Batangas Hub'}. Doorstep weights pre-weighed on rider calibrated scale. Reconcile cash handover with courier trip records below.</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 COMPACT FLAT STAT BLOCKS (ZERO BORDERS, NO GLASS, NO ICONS IN CIRCLES)  */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 8,
          marginBottom: 16,
        }}
      >
        {/* Block 1 */}
        <div style={{ background: '#FFFFFF', padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Amount Processed
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#0F172A',
              margin: '4px 0 2px',
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
            }}
          >
            {formatPeso(totalRealizedRevenue)}
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            {completedOrders.length} orders completed
          </div>
        </div>

        {/* Block 2 */}
        <div style={{ background: '#ECFEFF', padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0E7490', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Weight Washed
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#164E63',
              margin: '4px 0 2px',
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
            }}
          >
            {totalWeightKgDelivered.toFixed(1)} kg
          </div>
          <div style={{ fontSize: 12, color: '#0E7490' }}>
            Across all verified batches
          </div>
        </div>

        {/* Block 3 */}
        <div style={{ background: '#FFFFFF', padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active In-Facility Queue
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#0F172A',
              margin: '4px 0 2px',
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
            }}
          >
            {activeFacilityOrders.length} Bags
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            In wash, dry or fold stage
          </div>
        </div>

        {/* Block 4 */}
        <div style={{ background: '#FFFFFF', padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Branch Service Rating
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#B45309',
              margin: '4px 0 2px',
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
            }}
          >
            {averageRating ? `${averageRating.toFixed(1)} / 5.0` : '5.0 / 5.0'}
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            {totalRatingsCount > 0 ? `${totalRatingsCount} verified customer ratings` : 'Awaiting new ratings'}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COURIER CASH HANDOVER TABLE (FLAT BLOCKS, COMPACT, REAL OPERATION)        */}
      {/* ========================================================================= */}
      <div style={{ background: '#FFFFFF', padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
                color: '#0F172A',
              }}
            >
              Courier Shift Cash Reconciliation
            </h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
              Confirm Cash on Delivery (COD) envelope handovers from field couriers before shift closeout.
            </p>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: 'var(--font-mono, monospace)' }}>
            DATE: {todayStr}
          </div>
        </div>

        {riderSettlements.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
            No couriers assigned to this facility today.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Courier Name</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Mobile Contact</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Delivered Drops</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Cash Collected</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Handover Status</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Shift Action</th>
                </tr>
              </thead>
              <tbody>
                {riderSettlements.map((r) => (
                  <tr key={r.riderId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F172A' }}>
                      {r.riderName}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748B', fontSize: 12 }}>
                      {r.phone || '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <strong>{r.completedCount}</strong> drops
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontWeight: 700,
                        fontSize: 14,
                        color: r.cashCollected > 0 ? '#15803D' : '#64748B',
                        fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                      }}
                    >
                      {formatPeso(r.cashCollected)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          background: r.isSettled ? '#ECFDF5' : r.cashCollected > 0 ? '#FEF3C7' : '#F1F5F9',
                          color: r.isSettled ? '#065F46' : r.cashCollected > 0 ? '#92400E' : '#64748B',
                          fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                        }}
                      >
                        {r.isSettled ? '✓ Handed Over' : r.cashCollected > 0 ? 'Pending Handover' : 'No Cash'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      {!r.isSettled && r.cashCollected > 0 ? (
                        <button
                          type="button"
                          disabled={settlingRiderId === r.riderId}
                          onClick={() => handleSettleCash(r.riderId, r.cashCollected, r.completedCount)}
                          style={{
                            background: '#0E7490',
                            color: '#FFFFFF',
                            padding: '6px 14px',
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                            cursor: settlingRiderId === r.riderId ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {settlingRiderId === r.riderId ? 'Recording...' : '✓ Confirm Handover'}
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

      {/* ========================================================================= */}
      {/* DAILY VOLUME & REVENUE REPORT TABLE (FLAT, NO BORDERS)                     */}
      {/* ========================================================================= */}
      <div style={{ background: '#FFFFFF', padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
                color: '#0F172A',
              }}
            >
              Day-over-Day Volume &amp; Revenue Ledger
            </h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
              Historical throughput tracking verified scale weights, COD payments, and online earnings.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              background: '#ECFEFF',
              color: '#0E7490',
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              cursor: 'pointer',
            }}
          >
            Download CSV
          </button>
        </div>

        {dailyReportRows.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
            No financial history recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Date</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Total Bags</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Completed</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Verified Weight</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Cash Received</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Online Received</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {dailyReportRows.map((row) => (
                  <tr key={row.date} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>
                      {new Date(row.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{row.totalOrders}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 6px',
                          background: '#ECFDF5',
                          color: '#065F46',
                          fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                        }}
                      >
                        {row.completedOrders} completed
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      {row.totalWeightKg > 0 ? `${row.totalWeightKg.toFixed(1)} kg` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748B' }}>{formatPeso(row.cashRevenue)}</td>
                    <td style={{ padding: '10px 12px', color: '#64748B' }}>{formatPeso(row.onlineRevenue)}</td>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontWeight: 700,
                        fontSize: 14,
                        color: '#0E7490',
                        textAlign: 'right',
                        fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                      }}
                    >
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

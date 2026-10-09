'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getNextStatuses } from '@/lib/orders/status-machine';
import {
  BasketIcon,
  MachineDrumIcon,
  DryerHeatIcon,
  FoldedClothesIcon,
  ScaleIcon,
  AlertFlagIcon,
  ReceiptTicketIcon,
  ScooterCourierIcon,
  CheckmarkBadgeIcon,
} from '@/components/icons';
import type { OrderWithDetails, OrderStatus } from '@/lib/types';

export default function StaffDashboardPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'at_facility' | 'washing' | 'drying' | 'folding' | 'ready_for_delivery'>('all');

  // Discrepancy modal state
  const [flaggingOrder, setFlaggingOrder] = useState<OrderWithDetails | null>(null);
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [discrepancyCategory, setDiscrepancyCategory] = useState('Torn / Damaged Seam');
  const [savingDiscrepancy, setSavingDiscrepancy] = useState(false);

  async function loadData() {
    try {
      const res = await fetch('/api/orders?limit=100');
      const json = await res.json();
      if (json.data) {
        setOrders(json.data);
      }
    } catch (err) {
      console.error('Error loading staff orders:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Quick progression from stage to stage (staff do NOT weigh - rider already weighed at pickup)
  async function handleAdvanceStatus(orderId: string, nextStatus: OrderStatus) {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          note: `Advanced in facility workflow to ${nextStatus}`,
        }),
      });
      if (res.ok) {
        loadData();
      } else {
        const json = await res.json();
        alert(json.error?.message || 'Failed to update status');
      }
    } catch {
      alert('Network error updating status');
    } finally {
      setUpdatingId(null);
    }
  }

  // Save intake discrepancy flag
  async function handleSaveDiscrepancy() {
    if (!flaggingOrder) return;
    setSavingDiscrepancy(true);
    const fullNote = discrepancyNote.trim()
      ? `[${discrepancyCategory}] ${discrepancyNote.trim()}`
      : `[${discrepancyCategory}] Noted during facility intake inspection`;

    try {
      const res = await fetch(`/api/orders/${flaggingOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_discrepancy_note: fullNote,
        }),
      });
      if (res.ok) {
        loadData();
        setFlaggingOrder(null);
        setDiscrepancyNote('');
      } else {
        const json = await res.json();
        alert(json.error?.message || 'Failed to save discrepancy flag');
      }
    } catch {
      alert('Network error saving discrepancy note');
    } finally {
      setSavingDiscrepancy(false);
    }
  }

  // Active facility queue calculations (bags physically at the facility)
  const facilityOrders = orders.filter((o) =>
    ['at_facility', 'washing', 'drying', 'folding'].includes(o.status)
  );

  const atFacilityBags = orders.filter((o) => o.status === 'at_facility');
  const washingBags = orders.filter((o) => o.status === 'washing');
  const dryingBags = orders.filter((o) => o.status === 'drying');
  const foldingBags = orders.filter((o) => o.status === 'folding');
  const readyBags = orders.filter((o) => o.status === 'ready_for_delivery');

  const totalQueueBags = facilityOrders.length;
  const totalQueueKg = facilityOrders.reduce((sum, o) => sum + (o.weight_kg || 0), 0);

  // Filtered orders list
  const displayOrders = orders.filter((o) => {
    if (selectedFilter === 'all') {
      return ['at_facility', 'washing', 'drying', 'folding', 'ready_for_delivery'].includes(o.status);
    }
    return o.status === selectedFilter;
  });

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
      {/* TOP HIGHLIGHT: THE SINGLE MOST IMPORTANT NUMBER IN FLAT AMBER BLOCK       */}
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
              FACILITY QUEUE · ACTIVE WORKLOAD
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
              {totalQueueBags} Bags Waiting at Facility
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#92400E',
                marginTop: 4,
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              }}
            >
              {totalQueueKg.toFixed(1)} kg Total Laundry in Queue
            </div>
          </div>

          {/* Breakdown pills in flat amber tones */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ background: '#FFFFFF', padding: '8px 14px', minWidth: 100 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Intake Queue</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#78350F', fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}>
                {atFacilityBags.length}
              </div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '8px 14px', minWidth: 100 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#0E7490', textTransform: 'uppercase' }}>In Washers</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0E7490', fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}>
                {washingBags.length}
              </div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '8px 14px', minWidth: 100 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#B45309', textTransform: 'uppercase' }}>In Dryers</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#B45309', fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}>
                {dryingBags.length}
              </div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '8px 14px', minWidth: 100 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>Folding / Table</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#047857', fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)' }}>
                {foldingBags.length}
              </div>
            </div>
          </div>
        </div>

        {/* Operating note footer */}
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
          <span>Weights verified at customer doorstep via rider calibrated scale. Staff do not re-weigh — inspect and flag discrepancies only.</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-HEADER & FILTER TABS (FLAT COLOR BLOCKS, ZERO BORDERS)                */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            style={{
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              background: selectedFilter === 'all' ? '#0E7490' : '#FFFFFF',
              color: selectedFilter === 'all' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
            }}
          >
            All Facility Bags ({totalQueueBags + readyBags.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('at_facility')}
            style={{
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              background: selectedFilter === 'at_facility' ? '#0E7490' : '#FFFFFF',
              color: selectedFilter === 'at_facility' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
            }}
          >
            Arrived / Intake ({atFacilityBags.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('washing')}
            style={{
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              background: selectedFilter === 'washing' ? '#0E7490' : '#FFFFFF',
              color: selectedFilter === 'washing' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
            }}
          >
            Washing ({washingBags.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('drying')}
            style={{
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              background: selectedFilter === 'drying' ? '#0E7490' : '#FFFFFF',
              color: selectedFilter === 'drying' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
            }}
          >
            Drying ({dryingBags.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('folding')}
            style={{
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              background: selectedFilter === 'folding' ? '#0E7490' : '#FFFFFF',
              color: selectedFilter === 'folding' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
            }}
          >
            Folding ({foldingBags.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('ready_for_delivery')}
            style={{
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              background: selectedFilter === 'ready_for_delivery' ? '#0E7490' : '#FFFFFF',
              color: selectedFilter === 'ready_for_delivery' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
            }}
          >
            Ready Dispatch ({readyBags.length})
          </button>
        </div>

        <Link
          href="/staff/orders"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#0E7490',
            background: '#ECFEFF',
            padding: '7px 14px',
            textDecoration: 'none',
            fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
          }}
        >
          View Order Archive →
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* INCOMING QUEUE & ACTIVE ORDERS LIST (FLAT BLOCKS, HIGH DENSITY, NO BORDERS) */}
      {/* ========================================================================= */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 72, background: '#FFFFFF' }} />
          ))}
        </div>
      ) : displayOrders.length === 0 ? (
        <div style={{ background: '#FFFFFF', padding: '36px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <BasketIcon size={28} color="#94A3B8" />
          </div>
          <div style={{ fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)', fontWeight: 700, fontSize: 16 }}>
            No bags in this queue stage
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            New laundry arrivals delivered by riders will appear here immediately.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {displayOrders.map((order) => {
            const nextOptions = getNextStatuses(order.status as OrderStatus, 'staff');
            const primaryNext = nextOptions.find((s) => s !== 'cancelled');

            // Time arrived calculation
            const arrivedTime = new Date(order.created_at).toLocaleTimeString('en-PH', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order.id}
                style={{
                  background: '#FFFFFF',
                  padding: '14px 18px',
                  display: 'grid',
                  gridTemplateColumns: '170px 1.2fr 160px 140px 1fr 180px',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                {/* 1. Order Number & Arrived Time */}
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 700,
                      fontSize: 14,
                      color: '#0F172A',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {order.order_number}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    Arrived: <strong style={{ color: '#334155' }}>{arrivedTime}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>
                    Courier: {order.rider?.full_name || 'Assigned'}
                  </div>
                </div>

                {/* 2. Customer & Special Instructions */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                    {order.customer?.full_name || 'Customer'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    {order.customer?.phone || 'No phone'}
                  </div>
                  {order.special_instructions ? (
                    <div
                      style={{
                        fontSize: 11,
                        background: '#F1F5F9',
                        color: '#334155',
                        padding: '2px 6px',
                        marginTop: 4,
                        display: 'inline-block',
                      }}
                    >
                      Note: {order.special_instructions}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      Standard wash & fold
                    </div>
                  )}
                </div>

                {/* 3. Verified Doorstep Weight & Price */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                        fontWeight: 700,
                        fontSize: 17,
                        color: '#0E7490',
                      }}
                    >
                      {order.weight_kg ? `${order.weight_kg} kg` : 'Standard'}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#0E7490', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <ScaleIcon size={11} color="#0E7490" />
                    <span>Rider verified scale</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                    {formatPeso(order.total)}
                  </div>
                </div>

                {/* 4. Current Stage */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background:
                        order.status === 'at_facility'
                          ? '#FEF3C7'
                          : order.status === 'washing'
                          ? '#ECFEFF'
                          : order.status === 'drying'
                          ? '#FFFBEB'
                          : order.status === 'folding'
                          ? '#F0FDF4'
                          : '#F1F5F9',
                      color:
                        order.status === 'at_facility'
                          ? '#92400E'
                          : order.status === 'washing'
                          ? '#0E7490'
                          : order.status === 'drying'
                          ? '#B45309'
                          : order.status === 'folding'
                          ? '#047857'
                          : '#475569',
                      fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                    }}
                  >
                    {order.status === 'at_facility' && <BasketIcon size={12} />}
                    {order.status === 'washing' && <MachineDrumIcon size={12} />}
                    {order.status === 'drying' && <DryerHeatIcon size={12} />}
                    {order.status === 'folding' && <FoldedClothesIcon size={12} />}
                    {order.status === 'ready_for_delivery' && <CheckmarkBadgeIcon size={12} />}
                    <span>{formatOrderStatus(order.status as OrderStatus)}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748B', marginTop: 3 }}>
                    {order.payment_method === 'online' ? 'Paid via GCash/Card' : 'Cash on Delivery (COD)'}
                  </div>
                </div>

                {/* 5. Intake Discrepancy Flag */}
                <div>
                  {order.intake_discrepancy_note ? (
                    <div
                      style={{
                        background: '#FEF3C7',
                        padding: '6px 8px',
                        fontSize: 11,
                        color: '#92400E',
                        fontWeight: 600,
                        lineHeight: 1.35,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <AlertFlagIcon size={12} color="#D97706" />
                        <strong style={{ textTransform: 'uppercase', fontSize: 10 }}>Discrepancy Flagged</strong>
                      </div>
                      <div>{order.intake_discrepancy_note}</div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setFlaggingOrder(order);
                        setDiscrepancyNote('');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#B45309',
                        background: '#FFFBEB',
                        padding: '4px 8px',
                        cursor: 'pointer',
                      }}
                    >
                      <AlertFlagIcon size={12} color="#B45309" />
                      <span>+ Flag Discrepancy</span>
                    </button>
                  )}
                </div>

                {/* 6. Quick Action to Advance Stage */}
                <div style={{ textAlign: 'right' }}>
                  {order.status === 'at_facility' ? (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleAdvanceStatus(order.id, 'washing')}
                      style={{
                        background: '#0E7490',
                        color: '#FFFFFF',
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                        cursor: updatingId === order.id ? 'not-allowed' : 'pointer',
                        width: '100%',
                      }}
                    >
                      {updatingId === order.id ? 'Starting...' : 'Start Wash →'}
                    </button>
                  ) : order.status === 'washing' ? (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleAdvanceStatus(order.id, 'drying')}
                      style={{
                        background: '#0891B2',
                        color: '#FFFFFF',
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                        cursor: updatingId === order.id ? 'not-allowed' : 'pointer',
                        width: '100%',
                      }}
                    >
                      {updatingId === order.id ? 'Moving...' : 'Move to Dryer →'}
                    </button>
                  ) : order.status === 'drying' ? (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleAdvanceStatus(order.id, 'folding')}
                      style={{
                        background: '#164E63',
                        color: '#FFFFFF',
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                        cursor: updatingId === order.id ? 'not-allowed' : 'pointer',
                        width: '100%',
                      }}
                    >
                      {updatingId === order.id ? 'Moving...' : 'Start Folding →'}
                    </button>
                  ) : order.status === 'folding' ? (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleAdvanceStatus(order.id, 'ready_for_delivery')}
                      style={{
                        background: '#047857',
                        color: '#FFFFFF',
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                        cursor: updatingId === order.id ? 'not-allowed' : 'pointer',
                        width: '100%',
                      }}
                    >
                      {updatingId === order.id ? 'Dispatching...' : 'Ready Dispatch →'}
                    </button>
                  ) : primaryNext ? (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleAdvanceStatus(order.id, primaryNext)}
                      style={{
                        background: '#0E7490',
                        color: '#FFFFFF',
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                        cursor: updatingId === order.id ? 'not-allowed' : 'pointer',
                        width: '100%',
                      }}
                    >
                      {updatingId === order.id ? 'Updating...' : `Mark ${formatOrderStatus(primaryNext)} →`}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>
                      Ready for Delivery
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* INTAKE DISCREPANCY MODAL (FLAT DESIGN, NO GLASS, NO BORDERS)              */}
      {/* ========================================================================= */}
      {flaggingOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              width: '100%',
              maxWidth: 480,
              padding: '24px 28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertFlagIcon size={18} color="#D97706" />
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    margin: 0,
                    fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                  }}
                >
                  Flag Intake Discrepancy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFlaggingOrder(null)}
                style={{ fontSize: 18, color: '#64748B', cursor: 'pointer', padding: 4 }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
              Order <strong style={{ color: '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>{flaggingOrder.order_number}</strong> ({flaggingOrder.customer?.full_name || 'Customer'}). Log fabric damage, pre-existing stains, or missing items before washing.
            </div>

            {/* Category selection */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6, textTransform: 'uppercase' }}>
                Discrepancy Category
              </label>
              <select
                value={discrepancyCategory}
                onChange={(e) => setDiscrepancyCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: 13,
                  background: '#F8FAFC',
                  border: 'none',
                  color: '#0F172A',
                  outline: 'none',
                }}
              >
                <option value="Torn / Damaged Seam">Torn Seam / Damaged Fabric</option>
                <option value="Pre-existing Permanent Stain">Pre-existing Stubborn Stain</option>
                <option value="Missing Item Claim">Missing Item / Unmatched Care Tag</option>
                <option value="Color Bleeding Risk">Color Bleeding Risk (needs solo wash)</option>
                <option value="Broken Zipper / Missing Button">Broken Zipper / Missing Button</option>
                <option value="Special Fabric Warning">Special Fabric / Care Label Warning</option>
              </select>
            </div>

            {/* Note field */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6, textTransform: 'uppercase' }}>
                Inspection Details &amp; Location on Garment
              </label>
              <textarea
                rows={3}
                value={discrepancyNote}
                onChange={(e) => setDiscrepancyNote(e.target.value)}
                placeholder="e.g. Front left collar torn, bleach discoloration on navy shorts..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 13,
                  background: '#F8FAFC',
                  border: 'none',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setFlaggingOrder(null)}
                style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingDiscrepancy}
                onClick={handleSaveDiscrepancy}
                style={{
                  background: '#D97706',
                  color: '#FFFFFF',
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
                  cursor: savingDiscrepancy ? 'not-allowed' : 'pointer',
                }}
              >
                {savingDiscrepancy ? 'Saving...' : 'Save Flag Note →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

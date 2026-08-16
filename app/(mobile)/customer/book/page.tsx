'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getDeliveryEstimate } from '@/lib/ai/delivery-estimate';
import { formatPeso, centavosToDecimal } from '@/lib/utils/currency';
import LocationPickerMap from '@/components/maps/LocationPickerMap';
import type { Branch, PaymentMethod } from '@/lib/types';

export default function CustomerBookPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('00000000-0000-0000-0000-000000000001');

  // Step 1: Addresses & Schedule
  const [pickupAddress, setPickupAddress] = useState('Katipunan Ave, Quezon City, Metro Manila');
  const [pickupLat, setPickupLat] = useState(14.6537);
  const [pickupLng, setPickupLng] = useState(121.0685);
  const [deliveryAddress, setDeliveryAddress] = useState('Katipunan Ave, Quezon City, Metro Manila');
  const [deliveryLat, setDeliveryLat] = useState(14.6537);
  const [deliveryLng, setDeliveryLng] = useState(121.0685);
  const [sameAsPickup, setSameAsPickup] = useState(true);
  const [pickupScheduledAt, setPickupScheduledAt] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Step 2: Payment & Price Estimate
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load active branches on mount
  useEffect(() => {
    async function loadBranches() {
      setLoading(true);
      try {
        const res = await fetch('/api/branches');
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setBranches(json.data);
          setSelectedBranchId((prev) => prev || json.data[0].id);
        } else {
          const supabase = createClient();
          const { data } = await supabase.from('branches').select('*').eq('is_active', true);
          if (data && data.length > 0) {
            setBranches(data as Branch[]);
            setSelectedBranchId((prev) => prev || data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBranches();
  }, []);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const pricePerKgCentavos = selectedBranch?.price_per_kg || 3500; // ₱35.00/kg
  const deliveryFeeCentavos = 5000; // ₱50.00 flat pilot fee

  // Typical load range estimates (5kg to 8kg)
  const minEstimatedKg = 5;
  const maxEstimatedKg = 8;
  const minEstimatedSubtotal = minEstimatedKg * pricePerKgCentavos;
  const maxEstimatedSubtotal = maxEstimatedKg * pricePerKgCentavos;
  const minEstimatedTotal = minEstimatedSubtotal + deliveryFeeCentavos;
  const maxEstimatedTotal = maxEstimatedSubtotal + deliveryFeeCentavos;

  // Delivery turnaround estimate
  const deliveryEstimate = selectedBranch
    ? getDeliveryEstimate({
        branch_latitude: selectedBranch.latitude,
        branch_longitude: selectedBranch.longitude,
        delivery_latitude: sameAsPickup ? pickupLat : deliveryLat,
        delivery_longitude: sameAsPickup ? pickupLng : deliveryLng,
        base_processing_minutes: selectedBranch.base_processing_minutes || 120,
        current_order_load: 2,
        time_of_day: new Date(),
      })
    : null;

  async function handleSubmitOrder() {
    if (!selectedBranchId && branches.length === 0) {
      setError('Please select a branch');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: selectedBranchId || branches[0]?.id || '00000000-0000-0000-0000-000000000001',
          pickup_address: pickupAddress,
          pickup_latitude: pickupLat,
          pickup_longitude: pickupLng,
          delivery_address: sameAsPickup ? pickupAddress : deliveryAddress,
          delivery_latitude: sameAsPickup ? pickupLat : deliveryLat,
          delivery_longitude: sameAsPickup ? pickupLng : deliveryLng,
          pickup_scheduled_at: pickupScheduledAt ? new Date(pickupScheduledAt).toISOString() : null,
          special_instructions: specialInstructions || null,
          payment_method: paymentMethod,
          items: [],
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        let errMsg = json.error?.message || 'Failed to submit order';
        if (json.error?.details) {
          const detailStrings = Object.entries(json.error.details).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`);
          errMsg = `${errMsg} (${detailStrings.join('; ')})`;
        }
        setError(errMsg);
        setSubmitting(false);
      } else {
        router.push(`/customer/orders/${json.data.id}`);
      }
    } catch {
      setError('An unexpected network error occurred');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="fade-in">
        <div className="skeleton" style={{ height: 28, width: '60%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* Header & Step Progress */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
          Schedule Pickup
        </h1>
        <p style={{ color: '#64748B', fontSize: 'var(--text-xs)', marginTop: 2, fontWeight: 500 }}>
          Step {step} of 2 — {step === 1 ? 'Location & Schedule' : 'Payment & Estimate'}
        </p>

        {/* 2-Step Progress Bar */}
        <div style={{
          display: 'flex', gap: 6, marginTop: 12, height: 4, borderRadius: 2, overflow: 'hidden', background: '#E2E8F0'
        }}>
          <div style={{ flex: 1, background: '#0284C7', transition: 'background 0.3s' }} />
          <div style={{ flex: 1, background: step >= 2 ? '#0284C7' : '#E2E8F0', transition: 'background 0.3s' }} />
        </div>
      </div>

      {error && (
        <div className="toast toast--error" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">{error}</div>
        </div>
      )}

      {/* ================= STEP 1: Branch & Location ================= */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Branch selector */}
          <div className="card">
            <label className="input-group__label" style={{ marginBottom: 'var(--space-2)', display: 'block', fontWeight: 700, color: '#0F172A' }}>
              Serving Branch
            </label>
            <select
              className="input"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {formatPeso(b.price_per_kg || 3500)}/kg
                </option>
              ))}
            </select>
          </div>

          {/* Pickup Address & Interactive Map Pin */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: '#0F172A', marginBottom: 'var(--space-3)' }}>
              📍 Pickup Location &amp; Map Pin
            </h3>
            <div className="input-group" style={{ marginBottom: 'var(--space-2)' }}>
              <input
                className="input"
                type="text"
                placeholder="Enter street, unit #, barangay, city"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
              />
            </div>

            {/* Interactive Location Pin-Picker Map */}
            <LocationPickerMap
              latitude={pickupLat}
              longitude={pickupLng}
              address={pickupAddress}
              label="Pickup Pin"
              onLocationSelect={(loc) => {
                setPickupLat(loc.lat);
                setPickupLng(loc.lng);
                setPickupAddress(loc.address);

                // Auto-select nearest branch if available
                if (branches.length > 0) {
                  let closestBranch = branches[0];
                  let minDistance = Infinity;
                  for (const b of branches) {
                    const d = Math.hypot(b.latitude - loc.lat, b.longitude - loc.lng);
                    if (d < minDistance) {
                      minDistance = d;
                      closestBranch = b;
                    }
                  }
                  if (closestBranch) {
                    setSelectedBranchId(closestBranch.id);
                  }
                }
              }}
            />

            <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: '11px', color: '#64748B' }}>
              <span>Lat: {pickupLat.toFixed(5)}</span>
              <span>Lng: {pickupLng.toFixed(5)}</span>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: '#0F172A' }}>
                🏠 Delivery Address
              </h3>
              <label style={{ fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#475569', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={sameAsPickup}
                  onChange={(e) => setSameAsPickup(e.target.checked)}
                />
                Same as pickup
              </label>
            </div>

            {!sameAsPickup && (
              <div>
                <div className="input-group" style={{ marginBottom: 'var(--space-2)' }}>
                  <input
                    className="input"
                    type="text"
                    placeholder="Enter delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                </div>

                <LocationPickerMap
                  latitude={deliveryLat}
                  longitude={deliveryLng}
                  address={deliveryAddress}
                  label="Delivery Pin"
                  onLocationSelect={(loc) => {
                    setDeliveryLat(loc.lat);
                    setDeliveryLng(loc.lng);
                    setDeliveryAddress(loc.address);
                  }}
                />
              </div>
            )}
          </div>

          {/* Preferred Pickup Schedule */}
          <div className="card">
            <label className="input-group__label" style={{ marginBottom: 'var(--space-2)', display: 'block', fontWeight: 700, color: '#0F172A' }}>
              Preferred Pickup Window <span style={{ fontWeight: 400, color: '#64748B' }}>(optional)</span>
            </label>
            <input
              className="input"
              type="datetime-local"
              value={pickupScheduledAt}
              onChange={(e) => setPickupScheduledAt(e.target.value)}
            />
          </div>

          {/* Special Instructions */}
          <div className="card">
            <label className="input-group__label" style={{ marginBottom: 'var(--space-2)', display: 'block', fontWeight: 700, color: '#0F172A' }}>
              Notes for Rider / Staff <span style={{ fontWeight: 400, color: '#64748B' }}>(optional)</span>
            </label>
            <textarea
              className="input"
              rows={2}
              placeholder="e.g., Gate code #402, please separate delicates"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn--primary btn--full btn--lg"
            onClick={() => {
              if (!pickupAddress.trim()) {
                setError('Please provide a valid pickup address');
                return;
              }
              setError('');
              setStep(2);
            }}
          >
            Continue to Payment &amp; Estimate →
          </button>
        </div>
      )}

      {/* ================= STEP 2: Payment Method & Transparent Estimate ================= */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Transparent Price-Per-Kg Estimate Card */}
          <div className="card" style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>⚖️</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Weigh-After-Pickup Pricing
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                  {formatPeso(pricePerKgCentavos)} <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>per kilogram</span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginBottom: 12 }}>
              No need to count individual garments! Your rider will pick up your laundry bag, and staff will weigh it on a digital scale at the counter.
            </p>

            {/* Estimated Load Breakdown */}
            <div style={{ background: '#FFFFFF', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#64748B' }}>Typical Load Range:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{minEstimatedKg}–{maxEstimatedKg} kg</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#64748B' }}>Estimated Wash-Dry-Fold:</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{formatPeso(minEstimatedSubtotal)} – {formatPeso(maxEstimatedSubtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: '#64748B' }}>Flat Delivery Fee:</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{formatPeso(deliveryFeeCentavos)}</span>
              </div>

              <div className="divider" style={{ margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Estimated Total Range
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0284C7' }}>
                    {formatPeso(minEstimatedTotal)} – {formatPeso(maxEstimatedTotal)}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: '#0369A1', background: '#E0F2FE', padding: '4px 8px', borderRadius: 4, fontWeight: 700 }}>
                  Confirmed after weighing
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: '#0F172A', marginBottom: 'var(--space-3)' }}>
              💳 Payment Method
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Online Payment Option */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: paymentMethod === 'online' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                  background: paymentMethod === 'online' ? '#F0F9FF' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  style={{ accentColor: '#0284C7' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>
                    Online Payment (GCash / Maya / Card)
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    Pay seamlessly once your laundry weight is confirmed.
                  </div>
                </div>
                <span style={{ fontSize: 20 }}>📱</span>
              </label>

              {/* Cash Option */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: paymentMethod === 'cash' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                  background: paymentMethod === 'cash' ? '#F0F9FF' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                  style={{ accentColor: '#0284C7' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>
                    Cash on Delivery (COD)
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    Pay exact cash to the rider upon receiving your fresh laundry.
                  </div>
                </div>
                <span style={{ fontSize: 20 }}>💵</span>
              </label>
            </div>
          </div>

          {/* Delivery Turnaround Estimate */}
          {deliveryEstimate && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24 }}>⚡</div>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Estimated Ready by
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                  {new Date(deliveryEstimate.estimated_delivery_at).toLocaleString('en-PH', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ flex: '0 0 100px' }}
              onClick={() => setStep(1)}
              disabled={submitting}
            >
              ← Back
            </button>

            <button
              type="button"
              className="btn btn--primary btn--full btn--lg"
              onClick={handleSubmitOrder}
              disabled={submitting}
            >
              {submitting ? <span className="btn__spinner" /> : 'Confirm & Schedule Pickup 🧺'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

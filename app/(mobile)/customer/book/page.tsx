'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getDeliveryEstimate } from '@/lib/ai/delivery-estimate';
import { formatPeso } from '@/lib/utils/currency';
import LocationPickerMap from '@/components/maps/LocationPickerMap';
import type { Branch, PaymentMethod, CustomerAddress } from '@/lib/types';

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reorderId = searchParams.get('reorder_id');

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

  // Tier B4: Saved Addresses state
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState('Home');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Step 2: Payment & Price Estimate
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  // Load active branches & saved addresses on mount
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const [branchRes, addrRes] = await Promise.all([
          fetch('/api/branches'),
          fetch('/api/customer/addresses'),
        ]);

        const branchJson = await branchRes.json();
        if (branchJson.data && branchJson.data.length > 0) {
          setBranches(branchJson.data);
          setSelectedBranchId((prev) => prev || branchJson.data[0].id);
        }

        const addrJson = await addrRes.json();
        if (addrJson.data && Array.isArray(addrJson.data) && addrJson.data.length > 0) {
          setSavedAddresses(addrJson.data);
          const defaultAddr = addrJson.data.find((a: CustomerAddress) => a.is_default) || addrJson.data[0];
          if (defaultAddr && !reorderId) {
            setSelectedAddressId(defaultAddr.id);
            setPickupAddress(defaultAddr.address);
            setPickupLat(defaultAddr.latitude);
            setPickupLng(defaultAddr.longitude);
            setDeliveryAddress(defaultAddr.address);
            setDeliveryLat(defaultAddr.latitude);
            setDeliveryLng(defaultAddr.longitude);
          }
        }

        // Tier B3: Reorder pre-fill
        if (reorderId) {
          try {
            const orderRes = await fetch(`/api/orders/${reorderId}`);
            const orderJson = await orderRes.json();
            if (orderJson.data) {
              const o = orderJson.data;
              setPickupAddress(o.pickup_address);
              setPickupLat(o.pickup_latitude);
              setPickupLng(o.pickup_longitude);
              setDeliveryAddress(o.delivery_address);
              setDeliveryLat(o.delivery_latitude);
              setDeliveryLng(o.delivery_longitude);
              setSameAsPickup(o.pickup_address === o.delivery_address);
              if (o.branch_id) setSelectedBranchId(o.branch_id);
              if (o.payment_method) setPaymentMethod(o.payment_method);
              if (o.special_instructions) setSpecialInstructions(o.special_instructions);
              setReorderNotice(`Pre-filled details from previous order ${o.order_number}`);
            }
          } catch (e) {
            console.error('Failed to prefill reorder:', e);
          }
        }
      } catch (err) {
        console.error('Failed to load initial booking data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [reorderId]);

  function handleSelectSavedAddress(addr: CustomerAddress) {
    setSelectedAddressId(addr.id);
    setPickupAddress(addr.address);
    setPickupLat(addr.latitude);
    setPickupLng(addr.longitude);
    if (sameAsPickup) {
      setDeliveryAddress(addr.address);
      setDeliveryLat(addr.latitude);
      setDeliveryLng(addr.longitude);
    }
  }

  async function handleSaveCurrentAddress() {
    setIsSavingAddress(true);
    try {
      const res = await fetch('/api/customer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabelInput,
          address: pickupAddress,
          latitude: pickupLat,
          longitude: pickupLng,
          is_default: savedAddresses.length === 0,
        }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setSavedAddresses((prev) => [json.data, ...prev]);
        setSelectedAddressId(json.data.id);
        setShowSaveModal(false);
      } else {
        alert(json.error?.message || 'Failed to save address');
      }
    } catch {
      alert('Error saving address');
    } finally {
      setIsSavingAddress(false);
    }
  }

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

      {reorderNotice && (
        <div className="toast toast--success" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">🔄 {reorderNotice}</div>
        </div>
      )}

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

          {/* ================= TIER B4: Saved Addresses Selector ================= */}
          {savedAddresses.length > 0 && (
            <div className="card" style={{ background: '#F8FAFC', border: '1px solid #BAE6FD' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ⭐ Saved Addresses
                </span>
                <span style={{ fontSize: 11, color: '#64748B' }}>Tap to select</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectSavedAddress(addr)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-full)',
                      border: selectedAddressId === addr.id ? '2px solid #0284C7' : '1px solid #CBD5E1',
                      background: selectedAddressId === addr.id ? '#E0F2FE' : '#FFFFFF',
                      color: selectedAddressId === addr.id ? '#0369A1' : '#334155',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>📍</span>
                    <span>{addr.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pickup Address & Interactive Map Pin */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: '#0F172A' }}>
                📍 Pickup Location &amp; Map Pin
              </h3>
              <button
                type="button"
                onClick={() => setShowSaveModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284C7',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + Save as Favorite
              </button>
            </div>

            <div className="input-group" style={{ marginBottom: 'var(--space-2)' }}>
              <input
                className="input"
                type="text"
                placeholder="Enter street, unit #, barangay, city"
                value={pickupAddress}
                onChange={(e) => {
                  setPickupAddress(e.target.value);
                  setSelectedAddressId(null);
                }}
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
                setSelectedAddressId(null);

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
                  onChange={(e) => {
                    setSameAsPickup(e.target.checked);
                    if (e.target.checked) {
                      setDeliveryAddress(pickupAddress);
                      setDeliveryLat(pickupLat);
                      setDeliveryLng(pickupLng);
                    }
                  }}
                  style={{ accentColor: '#0284C7' }}
                />
                Same as Pickup
              </label>
            </div>

            {!sameAsPickup && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="input-group">
                  <input
                    className="input"
                    type="text"
                    placeholder="Enter return delivery address"
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

          {/* Schedule & Notes */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: '#0F172A', marginBottom: 'var(--space-3)' }}>
              🗓️ Preferred Pickup Time &amp; Notes
            </h3>
            <div className="input-group" style={{ marginBottom: 'var(--space-3)' }}>
              <label className="input-group__label">Schedule Pickup Time (optional)</label>
              <input
                className="input"
                type="datetime-local"
                value={pickupScheduledAt}
                onChange={(e) => setPickupScheduledAt(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-group__label">Special Laundry Notes / Instructions</label>
              <textarea
                className="input"
                rows={2}
                placeholder="e.g. Leave bags with condo concierge, buzzer #302"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn btn--primary btn--full btn--lg"
            onClick={() => {
              if (!pickupAddress) {
                setError('Please provide a pickup address');
                return;
              }
              setError('');
              setStep(2);
            }}
          >
            Continue to Payment &amp; Review →
          </button>
        </div>
      )}

      {/* ================= STEP 2: Review & Payment ================= */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Transparent Weigh-After-Pickup Notice */}
          <div style={{
            background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
            border: '1.5px solid #BAE6FD',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '1.4rem' }}>⚖️</span>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0369A1', margin: 0 }}>
                Weigh-After-Pickup Pricing
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#334155', lineHeight: 1.4, margin: '0 0 10px' }}>
              No need to count individual shirts! Our rider will pick up your bags and staff will weigh them on our digital scale at the facility.
            </p>
            <div style={{
              background: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid #BAE6FD',
            }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Rate at {selectedBranch?.name || 'San Juan Hub'}:</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0284C7' }}>
                {formatPeso(pricePerKgCentavos)} / kg
              </span>
            </div>
          </div>

          {/* Upfront Estimated Cost Range */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: '#0F172A', marginBottom: 'var(--space-3)' }}>
              Estimated Price Range
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--text-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                <span>Typical Laundry Load ({minEstimatedKg}kg – {maxEstimatedKg}kg)</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {formatPeso(minEstimatedSubtotal)} – {formatPeso(maxEstimatedSubtotal)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                <span>Delivery &amp; Pickup Fee</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {formatPeso(deliveryFeeCentavos)}
                </span>
              </div>
              <div className="divider" style={{ margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-md)', fontWeight: 800 }}>
                <span style={{ color: '#0F172A' }}>Estimated Total</span>
                <span style={{ color: '#0284C7', fontSize: '18px' }}>
                  {formatPeso(minEstimatedTotal)} – {formatPeso(maxEstimatedTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Turnaround Time Estimate */}
          {deliveryEstimate && (
            <div className="card" style={{ background: '#F8FCFF', border: '1px solid #BAE6FD' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.4rem' }}>⏱️</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>
                    Estimated Ready Time
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                    {new Date(deliveryEstimate.estimated_delivery_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                    {' '}(~{Math.round(deliveryEstimate.breakdown.total_min / 60)} hrs turnaround)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: '#0F172A', marginBottom: 'var(--space-3)' }}>
              Choose Payment Method
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: paymentMethod === 'online' ? '2px solid #0284C7' : '1px solid #CBD5E1',
                background: paymentMethod === 'online' ? '#F0F9FF' : '#FFFFFF',
                cursor: 'pointer',
              }}>
                <input
                  type="radio"
                  name="payment"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  style={{ accentColor: '#0284C7' }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                    💳 Online Payment (GCash / Maya / Card)
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Pay securely after scale weighing or upon completion
                  </div>
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: paymentMethod === 'cash' ? '2px solid #0284C7' : '1px solid #CBD5E1',
                background: paymentMethod === 'cash' ? '#F0F9FF' : '#FFFFFF',
                cursor: 'pointer',
              }}>
                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                  style={{ accentColor: '#0284C7' }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                    💵 Cash on Delivery (COD)
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Pay the rider when your clean clothes arrive
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ flex: 1 }}
              onClick={() => setStep(1)}
              disabled={submitting}
            >
              ← Back to Details
            </button>
            <button
              type="button"
              className="btn btn--primary"
              style={{ flex: 2 }}
              disabled={submitting}
              onClick={handleSubmitOrder}
            >
              {submitting ? <span className="btn__spinner" /> : 'Confirm & Request Pickup 🚀'}
            </button>
          </div>
        </div>
      )}

      {/* Save Address Modal */}
      {showSaveModal && (
        <div className="modal-backdrop" onClick={() => setShowSaveModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Save Favorite Address</h2>
              <button className="modal__close" onClick={() => setShowSaveModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Address Label
                </label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {['Home', 'Work', 'Dorm', 'Apartment'].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setNewLabelInput(lbl)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: newLabelInput === lbl ? '2px solid #0284C7' : '1px solid #CBD5E1',
                        background: newLabelInput === lbl ? '#E0F2FE' : '#FFF',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="input"
                  value={newLabelInput}
                  onChange={(e) => setNewLabelInput(e.target.value)}
                  placeholder="Custom label (e.g. Grandma's House)"
                />
              </div>

              <div style={{ fontSize: 12, color: '#64748B', background: '#F8FAFC', padding: 8, borderRadius: 4 }}>
                <strong>Location:</strong> {pickupAddress}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowSaveModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ flex: 2 }}
                  disabled={isSavingAddress || !newLabelInput.trim()}
                  onClick={handleSaveCurrentAddress}
                >
                  {isSavingAddress ? 'Saving...' : 'Save Address ⭐'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerBookPage() {
  return (
    <Suspense fallback={
      <div className="fade-in">
        <div className="skeleton" style={{ height: 28, width: '60%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-lg)' }} />
      </div>
    }>
      <BookingForm />
    </Suspense>
  );
}

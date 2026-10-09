'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDeliveryEstimate } from '@/lib/ai/delivery-estimate';
import { formatPeso } from '@/lib/utils/currency';
import LocationPickerMap from '@/components/maps/LocationPickerMap';
import LaundryIcons from '@/components/common/LaundryIcons';
import type { Branch, PaymentMethod, CustomerAddress } from '@/lib/types';

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reorderId = searchParams.get('reorder_id');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('00000000-0000-0000-0000-000000000001');

  // Addresses & Schedule
  const [pickupAddress, setPickupAddress] = useState('Katipunan Ave, Quezon City, Metro Manila');
  const [pickupLat, setPickupLat] = useState(14.6537);
  const [pickupLng, setPickupLng] = useState(121.0685);
  const [deliveryAddress, setDeliveryAddress] = useState('Katipunan Ave, Quezon City, Metro Manila');
  const [deliveryLat, setDeliveryLat] = useState(14.6537);
  const [deliveryLng, setDeliveryLng] = useState(121.0685);
  const [sameAsPickup, setSameAsPickup] = useState(true);
  const [pickupScheduledAt, setPickupScheduledAt] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Saved Addresses
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState('Home');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  // Load branches & saved addresses
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

        // Reorder prefill
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
              if (o.special_instructions) setSpecialInstructions(o.special_instructions);
              setReorderNotice(`Pre-filled details from order ${o.order_number}`);
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
  const pricePerKgCentavos = selectedBranch?.price_per_kg || 3500;
  const deliveryFeeCentavos = 5000;

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
          payment_method: 'online',
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
      <div className="fade-in" style={{ padding: '16px 0' }}>
        <div style={{ height: 28, width: 180, background: '#F3EFE6', borderRadius: 8, marginBottom: 12 }} />
        <div style={{ height: 160, background: '#F3EFE6', borderRadius: 14 }} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      {/* Header & Step Progress */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <LaundryIcons.Basket size={16} color="var(--color-primary)" />
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            Doorstep Laundry Pickup
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--color-text-dark)', letterSpacing: '-0.02em' }}>
          Schedule Pickup
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12, margin: '4px 0 0' }}>
          Doorstep Weighing & Live Pricing • No Upfront Payment Required
        </p>
      </div>

      {reorderNotice && (
        <div className="flat-block" style={{ marginBottom: 16, background: '#ECFEFF', padding: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)' }}>{reorderNotice}</span>
        </div>
      )}

      {error && (
        <div className="flat-block" style={{ marginBottom: 16, background: '#FFE4E6', padding: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#BE123C' }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Branch selector */}
          <div className="flat-block" style={{ background: '#F3EFE6' }}>
            <label style={{ marginBottom: 8, display: 'block', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Serving Laundry Branch
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              style={{
                width: '100%',
                background: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-text-dark)',
              }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {formatPeso(b.price_per_kg || 3500)}/kg
                </option>
              ))}
            </select>
          </div>

          {/* Saved Addresses */}
          {savedAddresses.length > 0 && (
            <div className="flat-block" style={{ background: '#F3EFE6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Saved Addresses
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Tap to select</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectSavedAddress(addr)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      background: selectedAddressId === addr.id ? 'var(--color-primary)' : '#FFFFFF',
                      color: selectedAddressId === addr.id ? '#FFFFFF' : 'var(--color-text-dark)',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <LaundryIcons.Pin size={12} color={selectedAddressId === addr.id ? '#FFFFFF' : 'var(--color-primary)'} />
                    <span>{addr.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pickup Address & Map Pin */}
          <div className="flat-block" style={{ background: '#F3EFE6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LaundryIcons.Pin size={16} color="var(--color-primary)" />
                <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Pickup Location & Map Pin
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                + Save as Favorite
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Enter street, unit #, barangay, city"
                value={pickupAddress}
                onChange={(e) => {
                  setPickupAddress(e.target.value);
                  setSelectedAddressId(null);
                }}
                style={{
                  width: '100%',
                  background: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* LocationPicker Map */}
            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
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
            </div>

            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--color-text-muted)' }}>
              <span>Lat: {pickupLat.toFixed(5)}</span>
              <span>Lng: {pickupLng.toFixed(5)}</span>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="flat-block" style={{ background: '#F3EFE6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LaundryIcons.Home size={16} color="var(--color-primary)" />
                <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Delivery Address
                </h3>
              </div>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700 }}>
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
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Same as Pickup
              </label>
            </div>

            {!sameAsPickup && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Enter return delivery address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ borderRadius: 12, overflow: 'hidden' }}>
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
              </div>
            )}
          </div>

          {/* Schedule & Notes */}
          <div className="flat-block" style={{ background: '#F3EFE6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <LaundryIcons.Clock size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Schedule & Laundry Notes
              </h3>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Preferred Pickup Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={pickupScheduledAt}
                onChange={(e) => setPickupScheduledAt(e.target.value)}
                style={{
                  width: '100%',
                  background: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Special Garment Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Leave with security guard, fragile whites, buzzer #4B"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                style={{
                  width: '100%',
                  background: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Doorstep Weighing Feature Banner */}
          <div className="flat-block" style={{ background: '#ECFEFF', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <LaundryIcons.Scale size={20} color="var(--color-primary)" />
              <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Doorstep Weighing &amp; Live Pricing
              </h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-dark)', lineHeight: 1.5, margin: '0 0 12px' }}>
              No upfront payment or guessing weights now. Your rider brings a portable digital scale directly to your door at pickup. Your exact price will lock in instantly on your screen, and you can choose to pay via GCash, Maya, Card, or Cash on Delivery right after weighing!
            </p>
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                Rate at {selectedBranch?.name || 'San Juan Hub'}:
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                {formatPeso(pricePerKgCentavos)} / kg
              </span>
            </div>
          </div>

          {/* Turnaround Time Estimate */}
          {deliveryEstimate && (
            <div className="flat-block" style={{ background: '#FAF8F5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <LaundryIcons.Clock size={20} color="var(--color-primary)" />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                    Estimated Turnaround Time
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-dark)', marginTop: 2 }}>
                    {new Date(deliveryEstimate.estimated_delivery_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                    {' '}(~{Math.round(deliveryEstimate.breakdown.total_min / 60)} hrs standard cycle)
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmitOrder}
            disabled={submitting}
            style={{
              width: '100%',
              background: 'var(--color-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              padding: '16px',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(14, 116, 144, 0.3)',
            }}
          >
            <LaundryIcons.Basket size={18} color="#FFFFFF" />
            <span>{submitting ? 'Placing Order...' : 'Confirm & Request Pickup'}</span>
          </button>
        </div>

      {/* Save Address Modal */}
      {showSaveModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div className="flat-block" style={{ background: '#FAF8F5', width: '100%', maxWidth: 360, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 12px' }}>Save as Favorite Address</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Label Name
              </label>
              <input
                type="text"
                value={newLabelInput}
                onChange={(e) => setNewLabelInput(e.target.value)}
                placeholder="e.g. Home, Condo, Office"
                style={{
                  width: '100%',
                  background: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                style={{ flex: 1, background: '#F3EFE6', border: 'none', borderRadius: 8, padding: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentAddress}
                disabled={isSavingAddress}
                style={{ flex: 1, background: 'var(--color-primary)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: 10, fontWeight: 800, cursor: 'pointer' }}
              >
                {isSavingAddress ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerBookPage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 200, borderRadius: 16 }} />}>
      <BookingForm />
    </Suspense>
  );
}

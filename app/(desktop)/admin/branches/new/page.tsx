'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LocationPickerMap from '@/components/maps/LocationPickerMap';

// Focused center for San Juan, Batangas
const SAN_JUAN_BATANGAS_CENTER = {
  lat: 13.8267,
  lng: 121.3969,
  address: 'General Luna Street Poblacion, San Juan, Batangas, Philippines',
};

export default function AdminNewBranchPage() {
  const router = useRouter();

  // Branch Details
  const [formData, setFormData] = useState({
    name: 'WashGo - San Juan Batangas Hub',
    address: SAN_JUAN_BATANGAS_CENTER.address,
    latitude: SAN_JUAN_BATANGAS_CENTER.lat,
    longitude: SAN_JUAN_BATANGAS_CENTER.lng,
    phone: '+63 917 123 4567',
    email: 'sanjuan@washgo.ph',
    price_per_kg: 3500, // ₱35.00/kg
    base_processing_minutes: 120,
  });

  // Initial Branch Manager Account
  const [createManager, setCreateManager] = useState(true);
  const [managerData, setManagerData] = useState({
    full_name: 'San Juan Branch Manager',
    email: 'manager.sanjuan@washgo.ph',
    password: 'password123',
    phone: '+63 917 123 4567',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  }

  function handleManagerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setManagerData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      setError('Branch name and physical address are required');
      return;
    }

    if (createManager && (!managerData.email || !managerData.password || !managerData.full_name)) {
      setError('Manager name, email, and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: any = {
        ...formData,
      };

      if (createManager) {
        payload.manager = managerData;
      }

      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || 'Failed to create branch');
        setLoading(false);
        return;
      }

      setSuccessData(json.data);
      setLoading(false);
    } catch {
      setError('Network error creating branch');
      setLoading(false);
    }
  }

  return (
    <div className="desktop-content fade-in" style={{ maxWidth: '100%', paddingRight: 'var(--space-6)' }}>
      {/* Page Heading */}
      <div className="page-heading" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="page-heading__text">
          <Link href="/admin/branches" style={{ fontSize: 'var(--text-sm)', color: '#0284C7', marginBottom: 4, display: 'inline-block', fontWeight: 600 }}>
            ← Back to Branches
          </Link>
          <h1 className="page-heading__title">Register New Branch &amp; Manager</h1>
          <p className="page-heading__subtitle">
            Pin the facility location in San Juan, Batangas on the left, and configure the local Branch Manager on the right.
          </p>
        </div>
      </div>

      {/* Success Confirmation Modal */}
      {successData && (
        <div className="card" style={{ maxWidth: 800, background: '#F0FDF4', border: '2px solid #86EFAC', marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>
                Branch &amp; Manager Successfully Created!
              </h3>
              <p style={{ fontSize: 13, color: '#15803D' }}>
                The branch is active and the manager account is ready for immediate login.
              </p>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: 'var(--radius-md)', border: '1px solid #BBF7D0', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
              🏪 Branch: {successData.name} ({successData.address})
            </div>
            {successData.manager ? (
              <div style={{ fontSize: 13, color: '#334155', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <div><strong>Manager Login:</strong> <code>{successData.manager.email}</code></div>
                <div><strong>Password:</strong> <code>{managerData.password}</code></div>
                <div><strong>Role:</strong> <span className="status-badge status-badge--info">Branch Manager</span></div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#64748B' }}>Manager account skipped. You can invite a manager later from Invites.</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/admin/branches" className="btn btn--primary" style={{ flex: 1, textAlign: 'center' }}>
              View All Branches →
            </Link>
            <Link href="/login" className="btn btn--secondary" style={{ flex: 1, textAlign: 'center' }}>
              Go to Login Page →
            </Link>
          </div>
        </div>
      )}

      {!successData && (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="toast toast--error" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="toast__message">{error}</div>
            </div>
          )}

          {/* 2-Column Responsive Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
            gap: 20,
            alignItems: 'start',
          }}>
            {/* ================= LEFT COLUMN: BRANCH LOCATION & OPERATIONS ================= */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                <span style={{ fontSize: 18 }}>🏪</span>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    1. Branch Location &amp; Operations
                  </h3>
                  <p style={{ fontSize: 11, color: '#64748B' }}>San Juan, Batangas Facility Setup</p>
                </div>
              </div>

              {/* Branch Name */}
              <div className="input-group">
                <label className="input-group__label">Branch Name *</label>
                <input
                  className="input"
                  type="text"
                  name="name"
                  placeholder="e.g. WashGo - San Juan Batangas Hub"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Physical Address */}
              <div className="input-group">
                <label className="input-group__label">Physical Address (Auto-updated from Map Pin) *</label>
                <input
                  className="input"
                  type="text"
                  name="address"
                  placeholder="e.g. General Luna St, Poblacion, San Juan, Batangas"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Interactive Mapbox Pin-Picker Focused on San Juan, Batangas */}
              <div>
                <label className="input-group__label" style={{ marginBottom: 4, display: 'block' }}>
                  📍 Pin Facility Location on Map (San Juan, Batangas)
                </label>
                <LocationPickerMap
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  address={formData.address}
                  label="Branch Facility Pin"
                  onLocationSelect={(loc) => {
                    setFormData((prev) => ({
                      ...prev,
                      latitude: loc.lat,
                      longitude: loc.lng,
                      address: loc.address,
                    }));
                  }}
                />
              </div>

              {/* Lat & Lng display */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="input-group">
                  <label className="input-group__label">Latitude *</label>
                  <input
                    className="input"
                    type="number"
                    step="0.000001"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-group__label">Longitude *</label>
                  <input
                    className="input"
                    type="number"
                    step="0.000001"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Pricing & Turnaround */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="input-group">
                  <label className="input-group__label">Wash-Dry-Fold Rate (₱ / kg)</label>
                  <input
                    className="input"
                    type="number"
                    step="1"
                    min="10"
                    value={formData.price_per_kg / 100}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 35;
                      setFormData((prev) => ({ ...prev, price_per_kg: Math.round(val * 100) }));
                    }}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-group__label">Base Turnaround (Minutes)</label>
                  <input
                    className="input"
                    type="number"
                    name="base_processing_minutes"
                    value={formData.base_processing_minutes}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Contact Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="input-group">
                  <label className="input-group__label">Contact Phone</label>
                  <input
                    className="input"
                    type="tel"
                    name="phone"
                    placeholder="+63 917 123 4567"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="input-group">
                  <label className="input-group__label">Contact Email</label>
                  <input
                    className="input"
                    type="email"
                    name="email"
                    placeholder="sanjuan@washgo.ph"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* ================= RIGHT COLUMN: INITIAL BRANCH MANAGER ACCOUNT ================= */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ background: '#F8FAFC', border: '1.5px solid #BAE6FD' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18 }}>👔</span>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        2. Branch Manager Account
                      </h3>
                      <p style={{ fontSize: 11, color: '#64748B' }}>Assigned Leader for this Hub</p>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0284C7', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={createManager}
                      onChange={(e) => setCreateManager(e.target.checked)}
                      style={{ accentColor: '#0284C7' }}
                    />
                    Provision Account
                  </label>
                </div>

                {createManager ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                      This manager will have full access to manage local staff, dispatch riders, and track laundry revenue for this San Juan branch.
                    </p>

                    <div className="input-group">
                      <label className="input-group__label">Manager Full Name *</label>
                      <input
                        className="input"
                        type="text"
                        name="full_name"
                        value={managerData.full_name}
                        onChange={handleManagerChange}
                        placeholder="e.g. Juan Dela Cruz"
                        required={createManager}
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-group__label">Manager Contact Phone</label>
                      <input
                        className="input"
                        type="tel"
                        name="phone"
                        value={managerData.phone}
                        onChange={handleManagerChange}
                        placeholder="+63 917 123 4567"
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-group__label">Login Email *</label>
                      <input
                        className="input"
                        type="email"
                        name="email"
                        value={managerData.email}
                        onChange={handleManagerChange}
                        placeholder="manager.sanjuan@washgo.ph"
                        required={createManager}
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-group__label">Initial Password *</label>
                      <input
                        className="input"
                        type="text"
                        name="password"
                        value={managerData.password}
                        onChange={handleManagerChange}
                        placeholder="password123"
                        required={createManager}
                      />
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: '#64748B' }}>
                    Manager account creation skipped. You can invite a manager later via the Invites system.
                  </p>
                )}
              </div>

              {/* Action Buttons Panel */}
              <div className="card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12, lineHeight: 1.4 }}>
                  Clicking below will establish the facility on Mapbox and immediately activate the manager account in Supabase.
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Link href="/admin/branches" className="btn btn--secondary" style={{ flex: 1, textAlign: 'center' }}>
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    style={{ flex: 2 }}
                    disabled={loading}
                  >
                    {loading ? <span className="btn__spinner" /> : 'Create Branch & Manager 🏪'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

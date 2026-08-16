'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPeso, toCentavos, centavosToDecimal } from '@/lib/utils/currency';
import type { ClothingType, PriceConfig } from '@/lib/types';

const CLOTHING_CATEGORIES: { type: ClothingType; label: string; defaultPrice: number; icon: string }[] = [
  { type: 'shirt', label: 'Shirt / T-Shirt / Top', defaultPrice: 3500, icon: '👕' },
  { type: 'pants', label: 'Pants / Jeans / Trousers', defaultPrice: 4500, icon: '👖' },
  { type: 'underwear', label: 'Underwear', defaultPrice: 2000, icon: '🩲' },
  { type: 'socks', label: 'Socks (Pair)', defaultPrice: 1500, icon: '🧦' },
  { type: 'bedsheet', label: 'Bedsheet / Linen / Blanket', defaultPrice: 12000, icon: '🛏️' },
  { type: 'towel', label: 'Towel (Bath / Hand)', defaultPrice: 5000, icon: '🧖' },
  { type: 'jacket', label: 'Jacket / Outerwear', defaultPrice: 9000, icon: '🧥' },
  { type: 'delicate', label: 'Delicates / Silk / Wool', defaultPrice: 7500, icon: '✨' },
  { type: 'other', label: 'Other Items', defaultPrice: 4000, icon: '🧺' },
];

export default function ManagerPricingPage() {
  const [branchId, setBranchId] = useState<string>('');
  const [prices, setPrices] = useState<Record<ClothingType, number>>({
    shirt: 3500,
    pants: 4500,
    underwear: 2000,
    socks: 1500,
    bedsheet: 12000,
    towel: 5000,
    jacket: 9000,
    delicate: 7500,
    other: 4000,
  });
  const [editingValues, setEditingValues] = useState<Record<ClothingType, string>>({
    shirt: '35.00',
    pants: '45.00',
    underwear: '20.00',
    socks: '15.00',
    bedsheet: '120.00',
    towel: '50.00',
    jacket: '90.00',
    delicate: '75.00',
    other: '40.00',
  });
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<ClothingType | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadPricing() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('branch_id')
        .eq('id', user.id)
        .single();

      if (profile?.branch_id) {
        setBranchId(profile.branch_id);

        const res = await fetch(`/api/pricing?branch_id=${profile.branch_id}`);
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const loadedPrices: Partial<Record<ClothingType, number>> = {};
          const loadedEdits: Partial<Record<ClothingType, string>> = {};

          json.data.forEach((p: PriceConfig) => {
            loadedPrices[p.clothing_type] = p.base_price;
            loadedEdits[p.clothing_type] = centavosToDecimal(p.base_price);
          });

          setPrices((prev) => ({ ...prev, ...loadedPrices }));
          setEditingValues((prev) => ({ ...prev, ...loadedEdits }));
        }
      }
    } catch (err) {
      console.error('Error loading branch pricing:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPricing();
  }, []);

  async function handleSavePrice(type: ClothingType) {
    const rawVal = parseFloat(editingValues[type]);
    if (isNaN(rawVal) || rawVal <= 0) {
      setErrorMessage('Please enter a valid price amount');
      return;
    }

    setSavingType(type);
    setErrorMessage('');
    setSuccessMessage('');

    const centavos = toCentavos(rawVal);

    try {
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: branchId,
          clothing_type: type,
          base_price: centavos,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message || 'Failed to save price');
      } else {
        setPrices((prev) => ({ ...prev, [type]: centavos }));
        setSuccessMessage(`Updated price for ${type.replace('_', ' ')} to ${formatPeso(centavos)}`);
      }
    } catch {
      setErrorMessage('Network error saving price');
    } finally {
      setSavingType(null);
    }
  }

  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Branch Pricing Configuration</h1>
          <p className="page-heading__subtitle">
            Configure custom washing rates per piece for your branch. Prices apply automatically to incoming orders.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="toast toast--success" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className="toast toast--error" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">{errorMessage}</div>
        </div>
      )}

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Laundry Rates Matrix</h2>
          <span className="status-badge status-badge--info">Philippine Peso (PHP)</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--space-4)' }}>
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 48 }} />)}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Clothing Category</th>
                  <th>Current Active Price</th>
                  <th>New Price (₱)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {CLOTHING_CATEGORIES.map((cat) => {
                  const currentCentavos = prices[cat.type] || cat.defaultPrice;
                  const isSaving = savingType === cat.type;

                  return (
                    <tr key={cat.type}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                          <span style={{ fontWeight: 600 }}>{cat.label}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-primary-light)' }}>
                          {formatPeso(currentCentavos)}
                        </span>
                      </td>
                      <td style={{ width: 160 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>₱</span>
                          <input
                            className="input input--sm"
                            type="number"
                            step="0.50"
                            min="1.00"
                            value={editingValues[cat.type] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingValues((prev) => ({ ...prev, [cat.type]: val }));
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          disabled={isSaving}
                          onClick={() => handleSavePrice(cat.type)}
                        >
                          {isSaving ? <span className="btn__spinner" /> : 'Save Price'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

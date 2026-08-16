'use client';

import React, { useState } from 'react';
import { formatPeso } from '@/lib/utils/currency';
import type { OrderWithDetails, ClothingType, FabricType, ColorCategory } from '@/lib/types';

interface WeighIntakeModalProps {
  order: OrderWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    weight_kg: number;
    clothing_types: ClothingType[];
    fabric_types: FabricType[];
    color_categories: ColorCategory[];
    has_stains: boolean;
    stain_description?: string;
    notes?: string;
  }) => Promise<void>;
}

export default function WeighIntakeModal({
  order,
  isOpen,
  onClose,
  onConfirm,
}: WeighIntakeModalProps) {
  const [weightKg, setWeightKg] = useState<string>(order.weight_kg ? String(order.weight_kg) : '6.5');
  const [clothingType, setClothingType] = useState<ClothingType>('shirt');
  const [fabricType, setFabricType] = useState<FabricType>('cotton');
  const [colorCategory, setColorCategory] = useState<ColorCategory>('mixed');
  const [hasStains, setHasStains] = useState(false);
  const [stainDescription, setStainDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const parsedWeight = parseFloat(weightKg) || 0;
  const pricePerKg = (order.branch as any)?.price_per_kg || 3500;
  const computedSubtotal = Math.round(parsedWeight * pricePerKg);
  const deliveryFee = order.delivery_fee || 5000;
  const computedTotal = computedSubtotal + deliveryFee;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedWeight <= 0) {
      alert('Please enter a valid scale weight greater than 0 kg.');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm({
        weight_kg: parsedWeight,
        clothing_types: [clothingType],
        fabric_types: [fabricType],
        color_categories: [colorCategory],
        has_stains: hasStains,
        stain_description: hasStains ? stainDescription : undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to record weighing intake');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16,
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        maxWidth: 520,
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        border: '1px solid #BAE6FD',
        overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          background: '#F0F9FF',
          borderBottom: '1px solid #BAE6FD',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Facility Counter Intake &amp; Weighing
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              Order {order.order_number}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#64748B',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleConfirm} style={{ padding: 20 }}>
          {/* Customer & Branch info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B', marginBottom: 16 }}>
            <span>Customer: <strong style={{ color: '#0F172A' }}>{order.customer?.full_name}</strong></span>
            <span>Payment: <strong style={{ color: '#0F172A', textTransform: 'uppercase' }}>{order.payment_method || 'Online'}</strong></span>
          </div>

          {/* Scale Weight Input */}
          <div style={{
            background: '#F8FAFC',
            border: '2px solid #0284C7',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            marginBottom: 16,
          }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', marginBottom: 6 }}>
              ⚖️ Verified Scale Weight (kg)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#0F172A',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #CBD5E1',
                  width: '100%',
                  background: '#FFFFFF',
                }}
                placeholder="e.g. 6.5"
              />
              <span style={{ fontSize: 16, fontWeight: 800, color: '#475569' }}>kg</span>
            </div>

            {/* Live Pricing Breakdown */}
            <div style={{ marginTop: 10, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
              <span style={{ color: '#64748B' }}>{parsedWeight} kg × {formatPeso(pricePerKg)}/kg + {formatPeso(deliveryFee)} delivery:</span>
              <strong style={{ fontSize: 15, color: '#0284C7' }}>{formatPeso(computedTotal)}</strong>
            </div>
          </div>

          {/* Garment & Fabric Quick Tags */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
              Fabric &amp; Color Composition
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <select
                  className="input"
                  value={fabricType}
                  onChange={(e) => setFabricType(e.target.value as FabricType)}
                >
                  <option value="cotton">Cotton / Everyday</option>
                  <option value="denim">Denim / Heavy</option>
                  <option value="synthetic_blend">Synthetic / Poly</option>
                  <option value="delicate">Delicates / Silk</option>
                  <option value="linen">Bedding &amp; Linen</option>
                </select>
              </div>
              <div>
                <select
                  className="input"
                  value={colorCategory}
                  onChange={(e) => setColorCategory(e.target.value as ColorCategory)}
                >
                  <option value="mixed">Mixed Colors</option>
                  <option value="white">Whites Only</option>
                  <option value="dark">Darks Only</option>
                  <option value="colored">Bright Colors</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stain Checkbox */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasStains}
                onChange={(e) => setHasStains(e.target.checked)}
                style={{ accentColor: '#0284C7', width: 16, height: 16 }}
              />
              Visible stains detected (Pre-treat required)
            </label>
            {hasStains && (
              <input
                type="text"
                className="input"
                placeholder="Describe stain (e.g. collar grease, wine, coffee)"
                value={stainDescription}
                onChange={(e) => setStainDescription(e.target.value)}
                style={{ marginTop: 6 }}
              />
            )}
          </div>

          {/* Counter Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
              Intake Notes <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional)</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Customer requested low heat drying"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
              style={{ flex: 1 }}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              style={{ flex: 2 }}
              disabled={submitting}
            >
              {submitting ? <span className="btn__spinner" /> : `Confirm ${parsedWeight}kg & Start Washing →`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

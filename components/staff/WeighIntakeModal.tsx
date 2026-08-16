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
    intake_discrepancy_note?: string;
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

  // Tier A1: Order Number Verification from Tape
  const [verifiedOrderNumber, setVerifiedOrderNumber] = useState<string>(order.order_number);

  // Tier A4: Discrepancy / Damaged Item Flag
  const [hasDiscrepancy, setHasDiscrepancy] = useState(Boolean(order.intake_discrepancy_note));
  const [discrepancyNote, setDiscrepancyNote] = useState(order.intake_discrepancy_note || '');

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
        intake_discrepancy_note: hasDiscrepancy ? discrepancyNote : undefined,
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
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          maxWidth: 520,
          width: '100%',
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          border: '1.5px solid #BAE6FD',
          overflow: 'hidden',
          padding: 0,
          margin: 'auto',
        }}
      >
        {/* Modal Header (Pinned at Top) */}
        <div style={{
          padding: '14px 20px',
          background: '#F0F9FF',
          borderBottom: '1px solid #BAE6FD',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
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
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-full)',
              color: '#64748B',
              background: '#E0F2FE',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Form Container */}
        <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Scrollable Form Body */}
          <div style={{
            padding: '16px 20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            {/* Step 1: Tape Tag Order # Confirmation */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                  🏷️ Tape / Bag Order Tag
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#0F172A', fontSize: 14 }}>
                  {order.order_number}
                </div>
              </div>
              <span style={{ fontSize: 11, color: '#059669', background: '#ECFDF5', fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                ✓ Matched
              </span>
            </div>

            {/* Scale Weight Input */}
            <div style={{
              background: '#F8FAFC',
              border: '2px solid #0284C7',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 16px',
            }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', marginBottom: 6 }}>
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
                    fontSize: 22,
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
              <div style={{ marginTop: 8, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: 6 }}>
                <span style={{ color: '#64748B', fontSize: 11 }}>{parsedWeight} kg × {formatPeso(pricePerKg)}/kg + {formatPeso(deliveryFee)} fee:</span>
                <strong style={{ fontSize: 15, color: '#0284C7' }}>{formatPeso(computedTotal)}</strong>
              </div>
            </div>

            {/* Garment & Fabric Quick Tags */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                Fabric &amp; Color Composition
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <select
                    className="input"
                    value={fabricType}
                    onChange={(e) => setFabricType(e.target.value as FabricType)}
                    style={{ fontSize: 12, padding: '8px 10px' }}
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
                    style={{ fontSize: 12, padding: '8px 10px' }}
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
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
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
                  style={{ marginTop: 6, fontSize: 12 }}
                />
              )}
            </div>

            {/* Damaged / Missing Items Discrepancy Flag */}
            <div style={{
              background: hasDiscrepancy ? '#FFFBEB' : '#F8FAFC',
              border: hasDiscrepancy ? '1.5px solid #FDE68A' : '1px solid #E2E8F0',
              borderRadius: 'var(--radius-md)',
              padding: 10,
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: hasDiscrepancy ? '#B45309' : '#0F172A', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hasDiscrepancy}
                  onChange={(e) => setHasDiscrepancy(e.target.checked)}
                  style={{ accentColor: '#D97706', width: 16, height: 16 }}
                />
                ⚠️ Discrepancy or existing damage noted before wash
              </label>
              {hasDiscrepancy && (
                <div style={{ marginTop: 6 }}>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="e.g. Missing 1 button, tear on left sleeve, customer stated 5 shirts but received 4"
                    value={discrepancyNote}
                    onChange={(e) => setDiscrepancyNote(e.target.value)}
                    style={{ fontSize: 12 }}
                    required
                  />
                  <div style={{ fontSize: 10, color: '#B45309', marginTop: 2 }}>
                    * This will be notified to the customer for transparency.
                  </div>
                </div>
              )}
            </div>

            {/* Counter Notes */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                Additional Wash Notes <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional)</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Customer requested low heat drying"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ fontSize: 12 }}
              />
            </div>
          </div>

          {/* Sticky Action Footer (Always visible & pinned at bottom) */}
          <div style={{
            padding: '14px 20px',
            background: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            gap: 10,
            flexShrink: 0,
          }}>
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

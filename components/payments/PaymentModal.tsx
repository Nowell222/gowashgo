'use client';

import { useState } from 'react';
import { formatPeso } from '@/lib/utils/currency';
import LaundryIcons from '@/components/common/LaundryIcons';

interface PaymentModalProps {
  orderId: string;
  orderNumber: string;
  amount: number;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (receipt: any) => void;
}

type PaymentMethodType = 'gcash' | 'paymaya' | 'card' | 'cod';

const PAYMENT_METHODS: { id: PaymentMethodType; name: string; desc: string; icon: keyof typeof LaundryIcons; badge?: string }[] = [
  { id: 'gcash', name: 'GCash', desc: 'Instant mobile e-wallet checkout', icon: 'Phone', badge: 'Fast' },
  { id: 'paymaya', name: 'Maya Wallet', desc: 'Pay via Maya app or QR Ph', icon: 'ReceiptTicket' },
  { id: 'card', name: 'Credit / Debit Card', desc: 'Visa, Mastercard, JCB (Encrypted SSL)', icon: 'CheckmarkBadge' },
];

export default function PaymentModal({
  orderId,
  orderNumber,
  amount,
  isOpen,
  onClose,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('gcash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<any | null>(null);

  if (!isOpen) return null;

  async function handlePay() {
    setLoading(true);
    setError('');

    try {
      // 1. Create Payment Intent
      const intentRes = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });

      const intentJson = await intentRes.json();
      if (!intentRes.ok) {
        throw new Error(intentJson.error?.message || 'Failed to initialize payment intent');
      }

      // 2. Confirm Payment / Record Choice
      const confirmRes = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          payment_method: selectedMethod,
          payment_intent_id: intentJson.data?.payment_intent_id,
        }),
      });

      const confirmJson = await confirmRes.json();
      if (!confirmRes.ok) {
        throw new Error(confirmJson.error?.message || 'Failed to confirm payment');
      }

      setReceipt(confirmJson.data.receipt);
      onPaymentSuccess(confirmJson.data.receipt);
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(28, 25, 23, 0.65)',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="flat-block"
        style={{
          background: '#FAF8F5',
          borderRadius: 20,
          width: '100%',
          maxWidth: 420,
          maxHeight: '90dvh',
          overflowY: 'auto',
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)', fontWeight: 800 }}>
              Electronic Checkout
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-dark)', margin: '2px 0 0' }}>
              {receipt ? 'Payment Confirmed' : 'Remote Payment'}
            </h2>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Order #{orderNumber}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: '#F3EFE6',
              color: 'var(--color-text-dark)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LaundryIcons.Close size={14} color="var(--color-text-dark)" />
          </button>
        </div>

        {error && (
          <div className="flat-block" style={{ marginBottom: 16, background: '#FFE4E6', padding: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#BE123C' }}>{error}</span>
          </div>
        )}

        {/* Receipt View (Success State) */}
        {receipt ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <LaundryIcons.CheckmarkBadge size={32} color="#059669" />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-dark)', marginBottom: 4 }}>
              Payment Verified!
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Your electronic receipt has been recorded on your order ticket.
            </p>

            {/* Receipt Summary Box */}
            <div
              style={{
                background: '#F3EFE6',
                borderRadius: 12,
                padding: 16,
                textAlign: 'left',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Amount Paid</span>
                <span style={{ fontWeight: 800, fontSize: 16, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                  {formatPeso(amount)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Payment Channel</span>
                <span style={{ fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-dark)' }}>
                  {selectedMethod}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Settlement Status</span>
                <span style={{ color: '#065F46', fontWeight: 800 }}>Settled & Verified</span>
              </div>
            </div>

            <button
              type="button"
              style={{
                width: '100%',
                background: 'var(--color-primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                padding: 14,
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
              }}
              onClick={onClose}
            >
              Done & View Order
            </button>
          </div>
        ) : (
          /* Payment Method Selection View */
          <div>
            {/* Amount Banner */}
            <div
              style={{
                background: '#0E7490',
                color: '#FFFFFF',
                borderRadius: 14,
                padding: '16px 20px',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em', opacity: 0.85 }}>
                Total Verified Amount
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#FEF08A', marginTop: 2 }}>
                {formatPeso(amount)}
              </div>
              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4 }}>
                Instant doorstep scale calculation
              </div>
            </div>

            {/* Methods List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {PAYMENT_METHODS.map((m) => {
                const isSelected = selectedMethod === m.id;
                const IconComp = LaundryIcons[m.icon] || LaundryIcons.ReceiptTicket;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMethod(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: isSelected ? '#ECFEFF' : '#F3EFE6',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: isSelected ? 'var(--color-primary)' : '#FAF8F5',
                          color: isSelected ? '#FFFFFF' : 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconComp size={18} color={isSelected ? '#FFFFFF' : 'var(--color-primary)'} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-text-dark)' }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {m.desc}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {m.badge && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            background: '#D97706',
                            color: '#FFFFFF',
                            padding: '2px 6px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                          }}
                        >
                          {m.badge}
                        </span>
                      )}
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: isSelected ? 'var(--color-primary)' : '#E7E2D8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFFFFF' }} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pay Button */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  background: '#F3EFE6',
                  color: 'var(--color-text-dark)',
                  border: 'none',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  flex: 2,
                  background: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                disabled={loading}
                onClick={handlePay}
              >
                {loading ? 'Processing...' : `Pay ${formatPeso(amount)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

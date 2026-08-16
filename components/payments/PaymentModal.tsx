'use client';

import { useState } from 'react';
import { formatPeso } from '@/lib/utils/currency';

interface PaymentModalProps {
  orderId: string;
  orderNumber: string;
  amount: number;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (receipt: any) => void;
}

type PaymentMethodType = 'gcash' | 'paymaya' | 'card' | 'cod';

const PAYMENT_METHODS: { id: PaymentMethodType; name: string; icon: string; desc: string; badge?: string }[] = [
  { id: 'gcash', name: 'GCash', icon: '📱', desc: 'Instant mobile e-wallet payment', badge: 'Popular' },
  { id: 'paymaya', name: 'Maya', icon: '💳', desc: 'Pay with your Maya wallet or app' },
  { id: 'card', name: 'Credit / Debit Card', icon: '🏦', desc: 'Visa, Mastercard, JCB (256-bit SSL)' },
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
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          width: '100%',
          maxWidth: 420,
          maxHeight: '90dvh',
          overflowY: 'auto',
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {receipt ? 'Payment Confirmed' : 'Online Checkout'}
            </h2>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Order {orderNumber}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: '#F1F5F9',
              color: '#64748B',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="toast toast--error" style={{ marginBottom: 16 }}>
            <div className="toast__message">{error}</div>
          </div>
        )}

        {/* Receipt View (Success State) */}
        {receipt ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#ECFDF5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, margin: '0 auto 16px',
              color: '#10B981',
              border: '2px solid #A7F3D0',
            }}>
              ✓
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
              Payment Successful!
            </h3>
            <p style={{ fontSize: 12, color: '#64748B', marginBottom: 20 }}>
              Your payment was verified. An official electronic receipt has been recorded.
            </p>

            {/* Receipt Summary Box */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: 12,
              border: '1px solid #E2E8F0',
              padding: 16,
              textAlign: 'left',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Amount Paid</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#0284C7' }}>{formatPeso(amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Payment Method</span>
                <span style={{ fontWeight: 700, textTransform: 'uppercase', color: '#0F172A' }}>{selectedMethod}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Status</span>
                <span className="status-badge status-badge--success">
                  Paid Online
                </span>
              </div>
            </div>

            <button type="button" className="btn btn--primary btn--full btn--lg" onClick={onClose}>
              Done &amp; View Order
            </button>
          </div>
        ) : (
          /* Payment Method Selection View */
          <div>
            {/* Amount Banner */}
            <div style={{
              background: '#F0F9FF',
              borderRadius: 14,
              padding: 16,
              textAlign: 'center',
              marginBottom: 16,
              border: '1px solid #BAE6FD',
            }}>
              <div style={{ fontSize: 11, color: '#0369A1', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                Total Amount Due
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#0284C7', marginTop: 2 }}>
                {formatPeso(amount)}
              </div>
            </div>

            {/* PayMongo Readiness Badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, color: '#0369A1',
              background: '#E0F2FE',
              padding: '8px 12px', borderRadius: 8,
              marginBottom: 16,
              border: '1px solid #BAE6FD',
              fontWeight: 600,
            }}>
              <span>🛡️</span>
              <span>PayMongo Sandbox Ready • GCash &amp; Card Enabled</span>
            </div>

            {/* Methods List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {PAYMENT_METHODS.map((m) => {
                const isSelected = selectedMethod === m.id;
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
                      borderRadius: 10,
                      background: isSelected ? '#F0F9FF' : '#FFFFFF',
                      border: isSelected ? '2px solid #0284C7' : '1px solid #CBD5E1',
                      textAlign: 'left',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 2px 8px rgba(2, 132, 199, 0.15)' : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{m.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>
                          {m.desc}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {m.badge && (
                        <span className="status-badge status-badge--info" style={{ fontSize: 9 }}>
                          {m.badge}
                        </span>
                      )}
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: isSelected ? '5px solid #0284C7' : '2px solid #CBD5E1',
                        background: '#fff',
                      }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pay Button */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ flex: 1 }}
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary btn--lg"
                style={{ flex: 2 }}
                disabled={loading}
                onClick={handlePay}
              >
                {loading ? <span className="btn__spinner" /> : `Pay ${formatPeso(amount)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

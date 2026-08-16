'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  orderNumber?: string;
}

export default function QrCodeDisplay({
  value,
  size = 180,
  label = 'Show this screen to your rider at pickup',
  orderNumber,
}: QrCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!value) return;

    QRCode.toDataURL(value, {
      width: size * 2, // 2x for sharp retina screens
      margin: 1.5,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        setDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
      });
  }, [value, size]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px',
      background: '#FFFFFF',
      borderRadius: 'var(--radius-lg)',
      border: '1.5px solid #BAE6FD',
      boxShadow: '0 4px 15px rgba(2, 132, 199, 0.08)',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 800,
        color: '#0284C7',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 8,
      }}>
        Digital Handoff QR Pass
      </div>

      <div style={{
        width: size,
        height: size,
        padding: 8,
        background: '#FFFFFF',
        borderRadius: 'var(--radius-md)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
      }}>
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`QR for Order ${orderNumber || value}`}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div className="skeleton" style={{ width: size - 16, height: size - 16 }} />
        )}
      </div>

      {orderNumber && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 800,
          fontSize: 16,
          color: '#0F172A',
          letterSpacing: '0.04em',
          marginBottom: 4,
        }}>
          {orderNumber}
        </div>
      )}

      <p style={{
        fontSize: 12,
        fontWeight: 600,
        color: '#64748B',
        maxWidth: 240,
        margin: 0,
        lineHeight: 1.3,
      }}>
        📱 {label}
      </p>
    </div>
  );
}

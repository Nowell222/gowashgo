'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import LaundryIcons from '@/components/common/LaundryIcons';

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
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!value) return;

    QRCode.toDataURL(value, {
      width: size * 2, // 2x for sharp retina screens
      margin: 1.5,
      color: {
        dark: '#1C1917',
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 16,
        background: '#FFFFFF',
        borderRadius: 16,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 800,
          color: 'var(--color-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 10,
        }}
      >
        <LaundryIcons.QrPass size={14} color="var(--color-primary)" />
        <span>Doorstep Handoff Pass</span>
      </div>

      <div
        style={{
          width: size,
          height: size,
          padding: 8,
          background: '#FFFFFF',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        }}
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`QR for Order ${orderNumber || value}`}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ width: size - 16, height: size - 16, background: '#F3EFE6', borderRadius: 8 }} />
        )}
      </div>

      {orderNumber && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: 16,
            color: 'var(--color-text-dark)',
            letterSpacing: '0.04em',
            marginBottom: 4,
          }}
        >
          {orderNumber}
        </div>
      )}

      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          maxWidth: 240,
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        {label}
      </p>
    </div>
  );
}

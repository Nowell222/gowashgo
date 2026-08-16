'use client';

import React, { useRef } from 'react';

interface PhotoCaptureProps {
  value?: string | null;
  onChange: (dataUrl: string) => void;
  onClear?: () => void;
  label?: string;
  buttonText?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
  disabled?: boolean;
}

/**
 * Native Camera & File Photo Capture component.
 * Opens the native device camera (rear/environment) on mobile phones or file picker on desktop.
 * Automatically resizes & compresses the image client-side before returning Base64 data URL.
 */
export default function PhotoCapture({
  value,
  onChange,
  onClear,
  label = 'Photo Proof',
  buttonText = '📷 Snap / Choose Photo',
  aspectRatio = 'video',
  disabled = false,
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Client-side canvas compression (max 1024px)
        const canvas = document.createElement('canvas');
        const maxDim = 1024;
        let { width, height } = img;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          onChange(compressedDataUrl);
        } else {
          onChange(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Reset input so the same photo can be re-selected if needed
    e.target.value = '';
  };

  const handleTriggerInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const heightStyle = aspectRatio === 'square' ? 200 : aspectRatio === 'video' ? 160 : 'auto';

  return (
    <div style={{ width: '100%' }}>
      {/* Hidden native camera/file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled}
      />

      {value ? (
        <div style={{
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          height: heightStyle,
          border: '1.5px solid #86EFAC',
          background: '#000',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 6,
          }}>
            <button
              type="button"
              onClick={handleTriggerInput}
              disabled={disabled}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
              }}
            >
              📷 Retake
            </button>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                disabled={disabled}
                style={{
                  background: 'rgba(239, 68, 68, 0.85)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 8px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{
            position: 'absolute',
            bottom: 6,
            left: 8,
            background: 'rgba(0, 0, 0, 0.65)',
            color: '#86EFAC',
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            ✓ Photo Attached
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn--secondary btn--full"
          onClick={handleTriggerInput}
          disabled={disabled}
          style={{
            border: '2px dashed #0284C7',
            background: '#F0F9FF',
            color: '#0284C7',
            fontWeight: 800,
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 24 }}>📷</span>
          <span style={{ fontSize: 13 }}>{buttonText}</span>
          <span style={{ fontSize: 10, color: '#64748B', fontWeight: 500 }}>
            Opens device camera or photo gallery
          </span>
        </button>
      )}
    </div>
  );
}

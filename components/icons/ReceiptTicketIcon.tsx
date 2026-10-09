import React from 'react';
import type { IconProps } from './CareTagIcon';

/**
 * Laundry claim ticket / bag receipt ticket.
 */
export function ReceiptTicketIcon({ size = 18, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M5 3V21L7.5 19.5L10 21L12 19.5L14 21L16.5 19.5L19 21V3L16.5 4.5L14 3L12 4.5L10 3L7.5 4.5L5 3Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <line x1="8" y1="8" x2="16" y2="8" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <line x1="8" y1="16" x2="13" y2="16" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export default ReceiptTicketIcon;

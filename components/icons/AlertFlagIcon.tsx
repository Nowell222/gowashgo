import React from 'react';
import type { IconProps } from './CareTagIcon';

/**
 * Inspection discrepancy flag for damaged fabric, missing items, or stains.
 */
export function AlertFlagIcon({ size = 18, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M4 22V3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M4 4H18.5C19.3 4 19.7 5 19.1 5.6L16.5 9L19.1 12.4C19.7 13 19.3 14 18.5 14H4" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

export default AlertFlagIcon;

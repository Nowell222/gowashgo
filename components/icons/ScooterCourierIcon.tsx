import React from 'react';
import type { IconProps } from './CareTagIcon';

/**
 * Laundry delivery courier scooter with courier bag cargo rack.
 */
export function ScooterCourierIcon({ size = 18, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <circle cx="6" cy="18" r="2.5" stroke={color} strokeWidth="1.75" />
      <circle cx="18" cy="18" r="2.5" stroke={color} strokeWidth="1.75" />
      <path d="M6 15.5H11L14 9H17" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 6V9" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <rect x="3.5" y="8" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export default ScooterCourierIcon;

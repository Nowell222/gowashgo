import React from 'react';
import type { IconProps } from './CareTagIcon';

/**
 * Front-loading washing machine drum with perforated circular window and controls.
 */
export function MachineDrumIcon({ size = 18, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect x="3.5" y="2.5" width="17" height="19" rx="2.5" stroke={color} strokeWidth="1.75" />
      <circle cx="12" cy="13" r="5" stroke={color} strokeWidth="1.75" />
      <circle cx="12" cy="13" r="2.5" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" />
      <circle cx="7.5" cy="6" r="1" fill={color} />
      <circle cx="10.5" cy="6" r="1" fill={color} />
      <line x1="14" y1="6" x2="17.5" y2="6" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export default MachineDrumIcon;

import React from 'react';
import type { IconProps } from './CareTagIcon';

/**
 * Portable calibrated hanging dial scale with bottom load hook.
 */
export function ScaleIcon({ size = 18, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <circle cx="12" cy="7" r="4.5" stroke={color} strokeWidth="1.75" />
      <circle cx="12" cy="7" r="1.25" fill={color} />
      <path d="M12 2V3" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 7L13.5 5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 11.5V16" stroke={color} strokeWidth="1.75" />
      <path d="M12 16C12 17.6569 10.6569 19 9 19C7.89543 19 7 18.1046 7 17" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M5 22H19" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export default ScaleIcon;

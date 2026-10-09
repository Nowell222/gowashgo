import React from 'react';
import type { IconProps } from './CareTagIcon';

/**
 * Detergent water drop icon with clean rinse curve.
 */
export function WaterDropIcon({ size = 18, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M12 2.5C12 2.5 5 11 5 15.5C5 19.0899 8.13401 22 12 22C15.866 22 19 19.0899 19 15.5C19 11 12 2.5 12 2.5Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M9 14.5C9 16.5 10.3 18 12.3 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default WaterDropIcon;

import React from 'react';
import type { IconProps } from './CareTagIcon';

/**
 * Laundry hamper / laundry bag icon with woven rib texture.
 */
export function BasketIcon({ size = 18, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M4 10L6.2 19.5C6.4 20.4 7.2 21 8.1 21H15.9C16.8 21 17.6 20.4 17.8 19.5L20 10" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 10H21" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M7 10L10 4H14L17 10" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13V18M12 13V18M15 13V18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default BasketIcon;

import React from 'react';
import type { IconProps } from './CareTagIcon';

/**
 * Clothes hanger / pressed garment finished icon.
 */
export function HangerIcon({ size = 18, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M12 7C10.5 7 10 5.8 10 4.8C10 3.3 11.2 2 12.7 2C14.2 2 15.3 3.1 15.3 4.5C15.3 6 13.8 7.2 12 7.7V9" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 9L2.8 16.2C2.1 16.7 2.4 17.8 3.3 17.8H20.7C21.6 17.8 21.9 16.7 21.2 16.2L12 9Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M4 18H20" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export default HangerIcon;

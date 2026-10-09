import React from 'react';
import type { IconProps } from './CareTagIcon';

/**
 * Neatly folded clothes stack.
 */
export function FoldedClothesIcon({ size = 18, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M5 7L12 4L19 7L12 10L5 7Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M5 11L12 14L19 11" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15L12 18L19 15" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default FoldedClothesIcon;

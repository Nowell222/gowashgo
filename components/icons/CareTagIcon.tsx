import React from 'react';

export interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Care-label garment tag with care symbol stitching motif.
 */
export function CareTagIcon({ size = 18, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M3.5 12V4.5H11L20.5 14L13 21.5L3.5 12Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <circle cx="7.5" cy="8.5" r="1.5" fill={color} />
      <path d="M11 15L15 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default CareTagIcon;

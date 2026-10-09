import React from 'react';
import type { IconProps } from './CareTagIcon';

/**
 * Tumble dryer with warm heat wave airflow.
 */
export function DryerHeatIcon({ size = 18, color = 'currentColor', className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect x="3.5" y="2.5" width="17" height="19" rx="2.5" stroke={color} strokeWidth="1.75" />
      <circle cx="12" cy="13" r="5" stroke={color} strokeWidth="1.75" />
      <path d="M10 11.5C11 12 11 14 12 14.5C13 15 13 13 14 13.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16.5" cy="6" r="1" fill={color} />
    </svg>
  );
}

export default DryerHeatIcon;

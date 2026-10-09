import React from 'react';

export interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Custom Laundry-Themed SVG Icon Library.
 * Replaces generic stock icon libraries (Lucide, etc.) with care-tag & laundry motifs.
 */
export const LaundryIcons = {
  // Portable hanging dial scale with hook
  Scale: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <circle cx="12" cy="7" r="4.5" stroke={color} strokeWidth="1.75" />
      <circle cx="12" cy="7" r="1.25" fill={color} />
      <path d="M12 2V3" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 7L13.5 5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 11.5V17" stroke={color} strokeWidth="1.75" />
      <path d="M12 17C12 18.6569 10.6569 20 9 20C7.89543 20 7 19.1046 7 18" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M5 22H19" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),

  // Woven laundry hamper / basket
  Basket: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M4 10L6.2 19.5C6.4 20.4 7.2 21 8.1 21H15.9C16.8 21 17.6 20.4 17.8 19.5L20 10" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 10H21" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M7 10L10 4H14L17 10" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13V18M12 13V18M15 13V18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  // Water droplet with clean detergent rinse motif
  WaterDrop: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M12 2.5C12 2.5 5 11 5 15.5C5 19.0899 8.13401 22 12 22C15.866 22 19 19.0899 19 15.5C19 11 12 2.5 12 2.5Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M9 14.5C9 16.5 10.3 18 12.3 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  // Clothing care-label tag
  CareTag: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M3.5 12V4.5H11L20.5 14L13 21.5L3.5 12Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <circle cx="7.5" cy="8.5" r="1.5" fill={color} />
      <path d="M11 15L15 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  // Front-loading washing machine
  Washer: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect x="4" y="3" width="16" height="18" rx="2.5" stroke={color} strokeWidth="1.75" />
      <circle cx="12" cy="13" r="5" stroke={color} strokeWidth="1.75" />
      <circle cx="12" cy="13" r="2.5" stroke={color} strokeWidth="1.25" strokeDasharray="2 2" />
      <circle cx="8" cy="6.5" r="1" fill={color} />
      <circle cx="11" cy="6.5" r="1" fill={color} />
      <line x1="14" y1="6.5" x2="17" y2="6.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),

  // Tumble dryer with heat waves
  Dryer: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect x="4" y="3" width="16" height="18" rx="2.5" stroke={color} strokeWidth="1.75" />
      <circle cx="12" cy="13" r="5" stroke={color} strokeWidth="1.75" />
      <path d="M10 11.5C11 12 11 14 12 14.5C13 15 13 13 14 13.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="6.5" r="1" fill={color} />
    </svg>
  ),

  // Neatly folded laundry clothes
  Fold: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M5 8L12 5L19 8L12 11L5 8Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M5 12L12 15L19 12" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 16L12 19L19 16" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // Courier delivery scooter with carrier box
  DeliveryScooter: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <circle cx="6" cy="18" r="2.5" stroke={color} strokeWidth="1.75" />
      <circle cx="18" cy="18" r="2.5" stroke={color} strokeWidth="1.75" />
      <path d="M6 15.5H11L14 9H17" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 6V9" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <rect x="3.5" y="8" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5" />
    </svg>
  ),

  // Scalloped laundry order ticket
  ReceiptTicket: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M5 3V21L7.5 19.5L10 21L12 19.5L14 21L16.5 19.5L19 21V3L16.5 4.5L14 3L12 4.5L10 3L7.5 4.5L5 3Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <line x1="8" y1="8" x2="16" y2="8" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <line x1="8" y1="16" x2="12" y2="16" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),

  // QR Pass badge
  QrPass: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.75" />
      <rect x="5" y="5" width="3" height="3" fill={color} />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.75" />
      <rect x="16" y="5" width="3" height="3" fill={color} />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.75" />
      <rect x="5" y="16" width="3" height="3" fill={color} />
      <path d="M14 14H17V17H14V14Z" fill={color} />
      <path d="M18 18H21V21H18V18Z" fill={color} />
      <path d="M14 20H16" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M20 14V16" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),

  // Verified checkmark badge
  CheckmarkBadge: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.75" />
      <path d="M8 12L11 15L16 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // Discrepancy / stain warning tag
  AlertDiscrepancy: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M12 3L21 19H3L12 3Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" fill={color} />
    </svg>
  ),

  // User profile
  User: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.75" />
      <path d="M5 20C5 16.5 8 14.5 12 14.5C16 14.5 19 16.5 19 20" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),

  // Phone direct call
  Phone: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M5 4H8.5L10 8L7.5 9.5C8.5 12 10.5 14 13 15L14.5 12.5L18.5 14V17.5C18.5 18.5 17.5 19.5 16.5 19.5C8.5 19 3.5 14 3 6C3 5 4 4 5 4Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  ),

  // Location doorstep pin
  Pin: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M12 21C12 21 18 14.5 18 9.5C18 6.18629 15.3137 3.5 12 3.5C8.68629 3.5 6 6.18629 6 9.5C6 14.5 12 21 12 21Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" stroke={color} strokeWidth="1.75" />
    </svg>
  ),

  // Laundry hub storefront / Home
  Home: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M3 10L12 3L21 10V20C21 20.5 20.5 21 20 21H4C3.5 21 3 20.5 3 20V10Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M9 21V13H15V21" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  ),

  // Online Card / GCash payment
  CreditCard: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="1.75" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="1.75" />
      <line x1="7" y1="15" x2="11" y2="15" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),

  // Cash on delivery peso icon
  Cash: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="1.75" />
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.75" />
      <path d="M6 10V10.01M18 14V14.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),

  // Post-service rating star
  Star: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M12 2.5L15.1 8.8L22 9.8L17 14.7L18.2 21.6L12 18.3L5.8 21.6L7 14.7L2 9.8L8.9 8.8L12 2.5Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" fill={style?.fill ? String(style.fill) : 'none'} />
    </svg>
  ),

  // Clock / Estimated Ready
  Clock: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.75" />
      <path d="M12 6.5V12L15.5 14" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // Camera / Proof snap
  Camera: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M4 8H7L8.5 5.5H15.5L17 8H20C20.5 8 21 8.5 21 9V19C21 19.5 20.5 20 20 20H4C3.5 20 3 19.5 3 19V9C3 8.5 3.5 8 4 8Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <circle cx="12" cy="14" r="3.5" stroke={color} strokeWidth="1.75" />
    </svg>
  ),

  // Plus / Add booking
  Plus: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M12 5V19M5 12H19" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),

  // Navigation Arrow
  ArrowRight: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M5 12H19M13 6L19 12L13 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  ArrowLeft: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M19 12H5M11 18L5 12L11 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // History / Activity list
  History: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M3.5 12C3.5 7.3 7.3 3.5 12 3.5C15.8 3.5 19 6 20.1 9.5M20.5 4V9.5H15M20.5 12C20.5 16.7 16.7 20.5 12 20.5C8.2 20.5 5 18 3.9 14.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7.5V12L15 14" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),

  // Fresh fabric / laundry sparkles
  Sparkles: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5L12 3Z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M19 3L19.8 5.2L22 6L19.8 6.8L19 9L18.2 6.8L16 6L18.2 5.2L19 3Z" fill={color} />
    </svg>
  ),

  // Refresh / Repeat wash cycle
  Refresh: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M4 12C4 7.58 7.58 4 12 4C15.42 4 18.34 6.15 19.46 9.2M20 4V9.5H14.5M20 12C20 16.42 16.42 20 12 20C8.58 20 5.66 17.85 4.54 14.8M4 20V14.5H9.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // Close cross
  Close: ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default LaundryIcons;

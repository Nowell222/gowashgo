/**
 * Generate a human-readable order number.
 * Format: WG-YYYYMMDD-XXXX (e.g., WG-20260816-0042)
 */
export function generateOrderNumber(sequenceNumber?: number): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = sequenceNumber ?? Math.floor(Math.random() * 9999) + 1;
  const seqStr = seq.toString().padStart(4, '0');
  return `WG-${dateStr}-${seqStr}`;
}

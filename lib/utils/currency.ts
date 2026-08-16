/**
 * Format centavos to peso display string.
 * e.g., 3500 → "₱35.00"
 */
export function formatPeso(centavos: number): string {
  return `₱${(centavos / 100).toFixed(2)}`;
}

/**
 * Parse peso amount to centavos.
 * e.g., 35.00 → 3500
 */
export function toCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

/**
 * Format centavos as a number without currency symbol.
 * e.g., 3500 → "35.00"
 */
export function centavosToDecimal(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

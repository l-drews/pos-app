/**
 * Format integer cents as EUR currency string (German locale).
 * Example: 1250 → "12,50 €"
 */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

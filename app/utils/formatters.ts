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

/**
 * Format an ISO date string as DD.MM.YYYY (German locale).
 * Example: "2025-04-25" → "25.04.2025"
 */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format an ISO datetime string as DD.MM.YYYY HH:mm (German locale).
 * Example: "2025-04-25T14:30:00Z" → "25.04.2025, 14:30"
 */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

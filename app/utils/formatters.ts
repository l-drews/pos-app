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
 * Format a Date as a local-timezone "YYYY-MM-DD" key (for routes and
 * day-grouping). Not UTC — toISOString() would shift the day near midnight.
 */
export function toLocalISODate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Parse a "YYYY-MM-DD" string as local-timezone midnight. Returns null for
 * anything else (including invalid dates like 2026-02-31).
 */
export function parseLocalISODate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
    ? date
    : null;
}

/**
 * Format an ISO datetime string as HH:mm (German locale).
 * Example: "2025-04-25T14:30:00Z" → "14:30"
 */
export function formatTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
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

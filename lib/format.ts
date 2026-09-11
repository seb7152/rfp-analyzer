/** Formatting helpers shared by the redesigned screens (French locale). */

export function formatDuration(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds)) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${rest.toString().padStart(2, "0")}` : `${hours} h`;
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits).replace(".", ",")} %`;
}

export function formatScore(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits).replace(".", ",");
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** OpenRouter bills in US dollars; shown with two decimals, French format. */
export function formatUsd(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Token counts read better in thousands: 84 200 → « 84 k ». */
export function formatTokens(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value < 1000) return String(value);
  const k = value / 1000;
  return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(".", ",")} k`;
}

export function plural(count: number, singular: string, pluralForm?: string) {
  return count > 1 ? (pluralForm ?? `${singular}s`) : singular;
}

/**
 * A séance is dated with or without a time: a date alone is stored at local
 * midnight, and read back as a date alone. The browser formats in its own
 * zone; the server (documents) in the organisation's.
 */

export const SERVER_TIME_ZONE = "Europe/Paris";

function localParts(iso: string, timeZone?: string): { hour: string; minute: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).formatToParts(d);
  return { hour: parts.find((p) => p.type === "hour")?.value ?? "", minute: parts.find((p) => p.type === "minute")?.value ?? "" };
}

/** True when the date carries a time (anything but midnight). */
export function hasTime(iso: string, timeZone?: string): boolean {
  const p = localParts(iso, timeZone);
  return !!p && !(p.hour === "00" && p.minute === "00");
}

/** « 12 sept. 2025 » or « 12 sept. 2025, 14:30 » ; long form « 12 septembre 2025 ». */
export function formatSessionDate(iso: string | null | undefined, options: { long?: boolean; timeZone?: string } = {}): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const timed = hasTime(iso, options.timeZone);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: options.long ? "long" : "short",
    year: "numeric",
    ...(timed ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: options.timeZone,
  });
}

/** The two halves of the planning inputs, in the browser's zone. */
export function toDateAndTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = d.getHours() === 0 && d.getMinutes() === 0 ? "" : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

/** ISO from the two halves; a date without a time is local midnight; no date is null. */
export function fromDateAndTime(date: string, time: string): string | null {
  if (!date) return null;
  const d = new Date(`${date}T${time || "00:00"}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

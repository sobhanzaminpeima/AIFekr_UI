import type { Locale } from "@/lib/i18n";

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;
const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Persian dates use the Persian calendar; other languages use their own format. */
const tag = (locale: Locale) => (locale === "fa" ? "fa-IR-u-ca-persian" : locale);

/** A value from an API row, as a person should read it: timestamps are never shown raw. */
export function liveCellText(value: unknown, locale: Locale): string {
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value)) return String(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(tag(locale), { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** "2026-11" as a month name, in the reader's language and calendar. */
export function liveMonthText(value: string, locale: Locale): string {
  if (!YEAR_MONTH.test(value)) return value;
  // Mid-month, so no time zone can move it into a neighbouring month.
  const date = new Date(`${value}-15T12:00:00Z`);
  return new Intl.DateTimeFormat(tag(locale), { year: "numeric", month: "long" }).format(date);
}

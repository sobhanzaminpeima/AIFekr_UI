/** The visitor's own IANA time zone, for form defaults; Istanbul only when the browser does not say. */
export function browserTimeZone(fallback = "Europe/Istanbul"): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === "string" && zone.includes("/") ? zone : fallback;
  } catch {
    return fallback;
  }
}

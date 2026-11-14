import { expect, test } from "@playwright/test";
import { dictionaries } from "../lib/i18n";
import { liveCellText } from "../lib/live-format";

// Localization gate (roadmap E13): every interface key exists in all four
// languages, and the shared table formatter never shows a raw ISO timestamp.
test("every dictionary key exists in Persian, German and Turkish", () => {
  const keys = Object.keys(dictionaries.en);
  for (const locale of ["fa", "de", "tr"] as const) {
    const have = dictionaries[locale] as Record<string, unknown>;
    const missing = keys.filter((k) => typeof have[k] !== "string" || !(have[k] as string).trim());
    expect(missing, `${locale} is missing: ${missing.join(", ")}`).toEqual([]);
  }
});

test("table cells never print raw ISO timestamps in any language", () => {
  for (const locale of ["fa", "en", "de", "tr"] as const) {
    expect(liveCellText("2026-11-09T19:57:49.753Z", locale)).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:/);
  }
});

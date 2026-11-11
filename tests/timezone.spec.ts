import { expect, test } from "@playwright/test";
import { browserTimeZone } from "../lib/timezone";

test("forms default to the visitor's own time zone", () => {
  const original = Intl.DateTimeFormat;
  try {
    (Intl as { DateTimeFormat: unknown }).DateTimeFormat = () => ({ resolvedOptions: () => ({ timeZone: "Europe/Bucharest" }) });
    expect(browserTimeZone()).toBe("Europe/Bucharest");
    (Intl as { DateTimeFormat: unknown }).DateTimeFormat = () => ({ resolvedOptions: () => ({ timeZone: "UTC" }) });
    expect(browserTimeZone()).toBe("Europe/Istanbul");
  } finally {
    (Intl as { DateTimeFormat: unknown }).DateTimeFormat = original;
  }
});

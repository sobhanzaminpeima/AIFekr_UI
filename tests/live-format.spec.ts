import { expect, test } from "@playwright/test";
import { liveCellText, liveMonthText } from "../lib/live-format";

test("timestamps are never shown raw", () => {
  const iso = "2026-11-09T19:57:49.753Z";
  for (const locale of ["fa", "en", "de", "tr"] as const) {
    const text = liveCellText(iso, locale);
    expect(text).not.toContain("T19:57");
    expect(text).not.toBe(iso);
  }
  expect(liveCellText(iso, "fa")).toMatch(/[۰-۹]/);
  expect(liveCellText(iso, "en")).toContain("2026");
});

test("ordinary values pass through unchanged", () => {
  expect(liveCellText("فرصت تست", "fa")).toBe("فرصت تست");
  expect(liveCellText(42, "en")).toBe("42");
  expect(liveCellText("2026-11-09", "en")).toBe("2026-11-09");
  expect(liveCellText("2026-11-09T99:99:00Z", "en")).toBe("2026-11-09T99:99:00Z");
});

test("forecast months read as month names", () => {
  expect(liveMonthText("2026-11", "en")).toBe("November 2026");
  expect(liveMonthText("2026-11", "fa")).toMatch(/آبان|آذر/);
  expect(liveMonthText("not-a-month", "en")).toBe("not-a-month");
  expect(liveMonthText("2026-13", "en")).toBe("2026-13");
});

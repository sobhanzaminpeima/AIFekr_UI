import { test, expect } from "@playwright/test";
import { ACCOUNTING_VIEWS, accountingPath } from "../lib/accounting-routes";
import { modules, moduleViewHref, resolveView } from "../lib/upstream/registry";
import { v2App } from "../lib/live-app";
import { readStream } from "../lib/accounting";

test("every accounting view retains its real navigation and a live frame", () => {
  const accounting = modules.find(m => m.id === "accounting")!;
  expect(accounting.views.map(v => v.id).sort()).toEqual([...ACCOUNTING_VIEWS].sort());
  for (const view of accounting.views) {
    const href = new URL(moduleViewHref(accounting, view), "https://example.test");
    expect(v2App(href.pathname)).toBe(true);
    expect(resolveView(accounting, href.pathname, href.searchParams).id).toBe(view.id);
  }
  expect(v2App("/accounting/accounts/5200")).toBe(true);
  expect(accountingPath("/accounting/not-implemented")).toBe(false);
  expect(v2App("/accounting/accounts/5200/unknown")).toBe(false);
  expect(v2App("/accounting-other")).toBe(false);
});

test("financial assistant preserves text split over stream chunks and reports errors", async () => {
  const encoder = new TextEncoder();
  const response = new Response(new ReadableStream({ start(c) { c.enqueue(encoder.encode('data: {"text":"درآ')); c.enqueue(encoder.encode('مد"}\n\ndata: [DONE]\n\n')); c.close(); } }));
  let answer = ""; await readStream(response, text => { answer += text; });
  expect(answer).toBe("درآمد");
  await expect(readStream(new Response('data: {"error":"unavailable"}\n\n'), () => {})).rejects.toThrow("unavailable");
});

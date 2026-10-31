import { test, expect } from "@playwright/test";
import { seoTopics, seoResearchInput } from "../lib/seo-contract";
import { v2App } from "../lib/live-app";
import {
  findModule,
  moduleViewHref,
  resolveView,
} from "../lib/upstream/registry";
test("all SEO views resolve to the implemented entry without claiming legacy detail routes", () => {
  const m = findModule("/seo")!;
  expect(m.views).toHaveLength(17);
  for (const v of m.views) {
    const href = moduleViewHref(m, v),
      url = new URL(href, "https://aifekr.com");
    expect(v2App(href)).toBe(true);
    expect(resolveView(m, url.pathname, url.searchParams).id).toBe(v.id);
  }
  expect(v2App("/seo/sites/unknown")).toBe(false);
});
test("research preserves the selected search market and rejects invalid quote inputs", () => {
  const body = {
    action: "rank",
    locationCode: 2840,
    languageCode: "en",
    rows: 10,
    keyword: "هوش مصنوعی",
    device: "mobile",
    platform: "google",
  };
  expect(seoResearchInput(body, "site-one")).toEqual({
    ...body,
    siteId: "site-one",
    competitorDomain: "",
  });
  for (const bad of [
    { rows: 101 },
    { rows: NaN },
    { locationCode: 0 },
    { languageCode: "english" },
  ])
    expect(() => seoResearchInput({ ...body, ...bad }, "site-one")).toThrow();
});
test("content topics preserve separate queued entries", () => {
  expect(seoTopics("  موضوع اول\n\nموضوع دوم  ")).toEqual([
    "موضوع اول",
    "موضوع دوم",
  ]);
});

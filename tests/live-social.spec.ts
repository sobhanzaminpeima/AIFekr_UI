import { expect, test } from "@playwright/test";
import { socialDraft, campaignLinks } from "../lib/social-contract";
import { v2App } from "../lib/live-app";
import { modules, resolveView, moduleViewHref } from "../lib/upstream/registry";
test("all social views map to the signed-in route, never a prototype subroute", () => {
  const module = modules.find(m => m.id === "social")!;
  expect(module.views).toHaveLength(12);
  for (const view of module.views) { const url = new URL(moduleViewHref(module, view), "https://example.test"); expect(v2App(url.pathname)).toBe(true); expect(resolveView(module, url.pathname, url.searchParams).id).toBe(view.id); }
  expect(v2App("/social/unknown")).toBe(false);
});
test("only nonempty provider text is displayed as a draft", () => {
  expect(socialDraft({ content: "A draft" }, "content")).toBe("A draft");
  expect(() => socialDraft({ content: " " }, "content")).toThrow("EMPTY_RESULT");
  expect(() => socialDraft({}, "report")).toThrow("EMPTY_RESULT");
});
test("campaign links preserve labels and accept at most two HTTP destinations", () => {
  expect(campaignLinks("Guide | https://example.com/guide")).toEqual([{ label: "Guide", url: "https://example.com/guide" }]);
  expect(() => campaignLinks("Click | javascript:alert(1)")).toThrow();
  expect(() => campaignLinks("A|https://a.test\nB|https://b.test\nC|https://c.test")).toThrow("MAX_TWO_LINKS");
});

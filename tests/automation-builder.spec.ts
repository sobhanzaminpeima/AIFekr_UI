import { expect, test } from "@playwright/test";
import { builderRequest, RECIPES, toggleRequest } from "../components/automation-builder";

test("each trigger is written to the system that runs it", () => {
  const base = { name: "N", keyword: "صدا", message: "سلام", publicReply: "", link: "https://aifekr.com/voice-studio?utm_campaign=x", days: "5" };
  expect(builderRequest({ ...base, trigger: "keyword_comment" })).toEqual({ url: "/api/social/instagram/campaigns", body: { name: "N", keyword: "صدا", dmMessage: "سلام", links: [{ label: "N", url: base.link }] } });
  expect(builderRequest({ ...base, trigger: "keyword_dm" }).url).toBe("/api/social/instagram/direct-rules");
  expect(builderRequest({ ...base, trigger: "stale_deal" }).body).toEqual({ name: "N", trigger: "stale_deal", condition: { days: 5 }, action: "create_task" });
  expect(builderRequest({ ...base, trigger: "no_activity_days", days: "999" }).body.condition).toEqual({ days: 90 });
});

test("recipes fill a complete form in Persian and English", () => {
  for (const r of RECIPES) for (const fa of [true, false]) {
    const d = r.draft(fa);
    expect(d.name.trim()).not.toBe("");
    if (d.trigger === "keyword_comment" || d.trigger === "keyword_dm") expect(d.keyword && d.message).toBeTruthy();
  }
});

test("pause and resume go through each system's own update route", () => {
  expect(toggleRequest("crm", "r1", false)).toEqual({ url: "/api/crm/automation-rules/r1", method: "PUT", body: { isActive: false } });
  expect(toggleRequest("instagram_comment", "c 1", true)!.url).toBe("/api/social/instagram/campaigns/c%201");
  expect(toggleRequest("unknown", "x", true)).toBeNull();
});

import { expect, test } from "@playwright/test";
import { firstRunComplete, firstRunSteps } from "../lib/first-run";

// Scripted new-user walkthrough (roadmap E5): each step ticks only from real activity.
test("a brand-new account sees every step open, each with a place to do it", () => {
  const steps = firstRunSteps({ usageTypes: [], libraryKinds: [], connectedKeys: [], automations: 0 });
  expect(steps.map((s) => s.done)).toEqual([false, false, false, false]);
  expect(steps.every((s) => s.href.startsWith("/"))).toBe(true);
  expect(firstRunComplete(steps)).toBe(false);
});

test("the walkthrough ticks steps in order as the user acts, then disappears", () => {
  let facts = { usageTypes: ["chat"], libraryKinds: [] as string[], connectedKeys: [] as string[], automations: 0 };
  expect(firstRunSteps(facts).filter((s) => s.done).map((s) => s.step)).toEqual(["chat"]);
  facts = { ...facts, libraryKinds: ["image"] };
  facts = { ...facts, connectedKeys: ["instagram"] };
  expect(firstRunSteps(facts).filter((s) => s.done)).toHaveLength(3);
  facts = { ...facts, automations: 1 };
  expect(firstRunComplete(firstRunSteps(facts))).toBe(true);
});

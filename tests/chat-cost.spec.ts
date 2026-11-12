import { expect, test } from "@playwright/test";
import { chatCostRange } from "../lib/chat-cost";

const providers = [{ model: "gemini", creditCost: 1 }, { model: "gpt-4o", creditCost: 4 }, { model: "deepseek", creditCost: 2 }];

test("automatic mode shows every price the router may charge", () => {
  expect(chatCostRange("auto", 1, providers)).toEqual([1, 4]);
});

test("a chosen model has one price", () => {
  expect(chatCostRange("gpt-4o", 1, providers)).toEqual([4, 4]);
  expect(chatCostRange("unknown", 1, providers)).toBeNull();
});

test("no providers yet falls back to the base price", () => {
  expect(chatCostRange("auto", 1, [])).toEqual([1, 1]);
  expect(chatCostRange("auto", null, [])).toBeNull();
});

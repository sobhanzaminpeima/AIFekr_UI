import { expect, test } from "@playwright/test";
import { composerShouldReset } from "../lib/chat-composer";

test("the chat settings arriving never clears what the user is typing", () => {
  expect(composerShouldReset("", "")).toBe(false);
  expect(composerShouldReset("mode=image", "mode=image")).toBe(false);
});

test("opening the page or following a new link fills the composer from the link", () => {
  expect(composerShouldReset(null, "")).toBe(true);
  expect(composerShouldReset("", "prompt=hello")).toBe(true);
});

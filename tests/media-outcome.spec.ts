import { test, expect } from "@playwright/test";
import { approvedMediaCost, imageOutputs, mediaFailure, failureGuidance } from "../lib/media-outcome";

test("costs use approved rates, including zero, without invented fallbacks", () => {
  expect(approvedMediaCost(null, "image", "standard", 1, 0)).toBeNull();
  expect(approvedMediaCost({ image_standard: 17 }, "image", "standard", 3, 0)).toBe(51);
  expect(approvedMediaCost({ image_hd: 0 }, "image", "hd", 2, 0)).toBe(0);
  expect(approvedMediaCost({ image_hd: -1 }, "image", "hd", 1, 0)).toBeNull();
  expect(approvedMediaCost({ video_10s: 41 }, "video", "standard", 1, 8)).toBe(41);
  expect(approvedMediaCost({ music_120s: 53 }, "music", "standard", 1, 90)).toBe(53);
});

test("a blank or malformed successful response is not an image result", () => {
  expect(imageOutputs({})).toEqual([]);
  expect(imageOutputs({ images: [{}, null, { url: "javascript:alert(1)" }] })).toEqual([]);
  expect(imageOutputs({ images: [{ url: "https://example.com/saved.png" }] })).toEqual(["https://example.com/saved.png"]);
});

test("failures recommend the relevant action in Persian and English", () => {
  expect(mediaFailure(402, {})).toBe("credits");
  expect(mediaFailure(403, { requiresUpgrade: true })).toBe("plan");
  expect(mediaFailure(429, {})).toBe("rate_limited");
  expect(mediaFailure(503, {})).toBe("disabled");
  expect(mediaFailure(422, {})).toBe("invalid_input");
  expect(mediaFailure(502, {})).toBe("provider");
  expect(failureGuidance("provider", false)).toContain("before resubmitting");
  expect(failureGuidance("credits", true)).toContain("کیف پول");
});

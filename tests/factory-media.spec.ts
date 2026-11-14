import { expect, test } from "@playwright/test";
import { orderFromFilename } from "../components/live-factory-media";

test("dropped images find their shot by number", () => {
  expect(["SHOT_012.png", "shot-12.jpg", "012.webp", "Shot 12 final.png"].map(orderFromFilename)).toEqual([12, 12, 12, 12]);
  expect(orderFromFilename("cover.png")).toBeNull();
});

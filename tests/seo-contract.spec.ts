import { expect, test } from "@playwright/test";
import { lastSeoMarket } from "../lib/seo-contract";

const job = (action: string, locationCode: number, languageCode: string) => ({
  action,
  input: JSON.stringify({ locationCode, languageCode }),
});

test("the newest market-based run is remembered", () => {
  expect(
    lastSeoMarket([job("keywords", 2792, "tr"), job("rank", 2840, "en")]),
  ).toEqual({ locationCode: 2792, languageCode: "tr" });
});

test("backlink runs say nothing about the market", () => {
  expect(
    lastSeoMarket([job("backlinks", 2840, "en"), job("rank", 2364, "fa")]),
  ).toEqual({ locationCode: 2364, languageCode: "fa" });
});

test("no usable run means no remembered market", () => {
  expect(lastSeoMarket([])).toBeNull();
  expect(lastSeoMarket([{ action: "rank", input: "{" }])).toBeNull();
});

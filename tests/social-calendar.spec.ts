import { expect, test } from "@playwright/test";
import { monthGrid, moveToDay } from "../components/social-calendar";

test("the month grid is whole weeks starting on the locale's first day", () => {
  const sat = monthGrid(2026, 10, 6);
  expect(sat.length % 7).toBe(0);
  expect(sat[0].getDay()).toBe(6);
  expect(sat.some((d) => d.getMonth() === 10 && d.getDate() === 30)).toBe(true);
  expect(monthGrid(2026, 10, 1)[0].getDay()).toBe(1);
});

test("dropping a post on a day keeps its time of day", () => {
  const original = new Date(2026, 10, 15, 18, 30).toISOString();
  const moved = moveToDay(original, new Date(2026, 10, 20));
  expect([moved.getDate(), moved.getHours(), moved.getMinutes()]).toEqual([20, 18, 30]);
});

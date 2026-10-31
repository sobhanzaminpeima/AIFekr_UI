import { test, expect } from "@playwright/test";
import {
  leadFieldPayload,
  leadEmbedCode,
  publicLeadPaths,
} from "../lib/lead-form-contract";
import { v2App } from "../lib/live-app";
import { findModule, moduleViewHref } from "../lib/upstream/registry";
test("lead builder clears hidden requirements and always keeps name visible", () => {
  const fields = leadFieldPayload({
    name_show: false,
    name_required: true,
    email_show: false,
    email_required: true,
    phone_show: true,
    phone_required: true,
    unexpected: true,
  });
  expect(fields.name).toEqual({ show: true, required: true });
  expect(fields.email).toEqual({ show: false, required: false });
  expect(fields.phone).toEqual({ show: true, required: true });
  expect(Object.keys(fields)).toHaveLength(5);
});
test("lead embed uses the existing JavaScript loader rather than an iframe to JavaScript", () => {
  expect(leadEmbedCode("https://aifekr.com", "form-one")).toBe(
    '<script src="https://aifekr.com/api/public/leadform/form-one/embed" async></script>',
  );
  expect(publicLeadPaths("x/y").page).toBe("/f/x%2Fy");
  expect(() => leadEmbedCode("javascript:alert(1)", "x")).toThrow();
});
test("all lead views stay on the verified exact route", () => {
  const module = findModule("/lead-gen")!;
  expect(module.views).toHaveLength(7);
  for (const view of module.views) {
    expect(moduleViewHref(module, view)).toMatch(
      /^\/lead-gen(?:\?tab=[a-z-]+)?$/,
    );
    expect(v2App(moduleViewHref(module, view))).toBe(true);
  }
  expect(v2App("/lead-gen/not-ready")).toBe(false);
});

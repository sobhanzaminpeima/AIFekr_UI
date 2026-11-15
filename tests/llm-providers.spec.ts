import { expect, test } from "@playwright/test";
import { ERR, HEALTH, LIMIT_FIELDS, errText, formOf, payloadOf, settingsDiff, type ProviderRow } from "../components/live-admin-llm-providers";

const provider = (over: Partial<ProviderRow> = {}): ProviderRow => ({
  id: "coarena", name: "Coarena", adapter: "coarena", baseUrl: "https://coarena.ai/api/v1", enabled: false,
  key: { configured: true, source: "env", envName: "COARENA_API_KEY", masked: "••••••••1234" },
  healthStatus: "UNKNOWN", lastHealthAt: null, lastSyncAt: null, lastSyncError: null, lastError: null,
  timeoutMs: 60000, defaultModelId: null, defaultCreditCost: 3,
  limits: { dailyRequestCap: null, perUserDailyCap: null, maxOutputTokens: null, maxConcurrency: null, softWarnPercent: 80, hardStopPercent: 100 },
  fallbackEnabled: false, autoRouting: false, snapshot: null, models: [], ...over,
});

test("the settings form round-trips without inventing changes", () => {
  const p = provider();
  expect(settingsDiff(p, formOf(p))).toEqual([]);
  expect(payloadOf(formOf(p))).toMatchObject({ timeoutMs: 60000, dailyRequestCap: null, softWarnPercent: 80, fallbackEnabled: false });
});

test("only edited fields are sent, and an emptied cap means no cap", () => {
  const p = provider({ limits: { ...provider().limits, dailyRequestCap: 500 } });
  const f = formOf(p);
  f.limits.dailyRequestCap = "";
  f.limits.perUserDailyCap = "20";
  f.timeoutSec = "30";
  f.fallbackEnabled = true;
  const changes = Object.fromEntries(settingsDiff(p, f));
  expect(Object.keys(changes).sort()).toEqual(["dailyRequestCap", "fallbackEnabled", "perUserDailyCap", "timeoutMs"]);
  expect(payloadOf(f)).toMatchObject({ dailyRequestCap: null, perUserDailyCap: 20, timeoutMs: 30000, fallbackEnabled: true });
});

test("the API key never appears in the form state", () => {
  const p = provider({ key: { configured: true, source: "vault", envName: null, masked: "••••••••abcd" } });
  expect(JSON.stringify(formOf(p))).not.toContain("abcd");
  expect(Object.keys(payloadOf(formOf(p)))).not.toContain("apiKey");
});

test("every status, error and limit label exists in fa, en, de and tr", () => {
  const tuples = [...Object.values(ERR), ...Object.values(HEALTH).map(([t]) => t), ...LIMIT_FIELDS.flatMap(([, a, b]) => [a, b])];
  for (const t of tuples) {
    expect(t).toHaveLength(4);
    for (const s of t) expect(s.trim().length).toBeGreaterThan(0);
    expect(t[0]).toMatch(/[؀-ۿ]/);
  }
});

test("server error codes become readable text; unknown codes pass through", () => {
  const en = (c: [string, string, string, string]) => c[1];
  expect(errText("QUOTA", en)).toBe("Daily credit used up");
  expect(errText("SUPER_ADMIN_REQUIRED", en)).toContain("super admin");
  expect(errText("SOMETHING_NEW", en)).toBe("SOMETHING_NEW");
  expect(errText(null, en)).toBe("");
});

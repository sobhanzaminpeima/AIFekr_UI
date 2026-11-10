export function seoTopics(value: unknown): string[] {
  return String(value ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
export function seoResearchInput(
  body: Record<string, unknown>,
  siteId: string,
) {
  const locationCode = Number(body.locationCode),
    rows = Number(body.rows);
  if (!Number.isInteger(locationCode) || locationCode <= 0)
    throw Error("INVALID_SEARCH_MARKET");
  if (!Number.isInteger(rows) || rows < 1 || rows > 100)
    throw Error("INVALID_RESULT_COUNT");
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(String(body.languageCode)))
    throw Error("INVALID_SEARCH_LANGUAGE");
  return {
    ...body,
    siteId,
    locationCode,
    rows,
    keyword: body.keyword ?? "",
    competitorDomain: body.competitorDomain ?? "",
  };
}

/**
 * The search market last run for a site, newest job first. Backlink jobs carry
 * market fields the provider ignores, so they say nothing about the choice.
 */
export function lastSeoMarket(jobs: Record<string, unknown>[]) {
  for (const job of jobs) {
    if (["backlinks", "referringDomains", "backlinkHistory"].includes(String(job.action))) continue;
    try {
      const input = JSON.parse(String(job.input)) as { locationCode?: unknown; languageCode?: unknown };
      if (Number.isInteger(input.locationCode) && typeof input.languageCode === "string")
        return { locationCode: input.locationCode as number, languageCode: input.languageCode };
    } catch {
      continue;
    }
  }
  return null;
}

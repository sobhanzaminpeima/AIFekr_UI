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

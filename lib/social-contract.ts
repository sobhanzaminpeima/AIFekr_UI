/** A successful HTTP status is not a confirmed useful draft. */
export function socialDraft(data: Record<string, unknown>, key: string): string {
  const text = data[key];
  if (typeof text !== "string" || !text.trim()) throw Error("EMPTY_RESULT");
  return text;
}
export function campaignLinks(text: string) {
  const lines = text.split("\n").map(s => s.trim()).filter(Boolean);
  if (lines.length > 2) throw Error("MAX_TWO_LINKS");
  return lines.map(line => {
    const divider = line.indexOf("|");
    if (divider < 1) throw Error("LINK_FORMAT_LABEL_PIPE_URL");
    const label = line.slice(0, divider).trim(), url = line.slice(divider + 1).trim();
    if (!label || !/^https?:$/.test(new URL(url).protocol)) throw Error("HTTP_LINK_REQUIRED");
    return { label, url };
  });
}

export const leadFieldKeys = [
  "name",
  "phone",
  "email",
  "company",
  "message",
] as const;
/** Match the backend's fixed field model; never let a hidden field remain required. */
export function leadFieldPayload(values: Record<string, unknown>) {
  return Object.fromEntries(
    leadFieldKeys.map((key) => {
      const show = key === "name" || values[key + "_show"] === true;
      return [
        key,
        { show, required: show && values[key + "_required"] === true },
      ];
    }),
  );
}
export function publicLeadPaths(slug: string) {
  const segment = encodeURIComponent(slug);
  return {
    page: `/f/${segment}`,
    embed: `/api/public/leadform/${segment}/embed`,
  };
}
export function leadEmbedCode(origin: string, slug: string) {
  const url = new URL(publicLeadPaths(slug).embed, origin);
  if (!["https:", "http:"].includes(url.protocol))
    throw Error("INVALID_ORIGIN");
  return `<script src="${url.href}" async></script>`;
}

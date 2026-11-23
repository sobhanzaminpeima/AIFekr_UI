/** Normalize aliases before deciding whether a tool already has a home in the menu. */
export function sidebarDestination(href: string, student = false) {
  const path = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  if (path === "/business" || path === "/business/crm") return "/crm";
  if (path === "/fit/dashboard") return "/fitness";
  if (path === "/learn" && student) return "/student";
  return path;
}

export function uniqueSidebarTools<T extends { href: string }>(tools: readonly T[], primary: readonly string[], student = false): T[] {
  const seen = new Set(primary.map(href => sidebarDestination(href, student)));
  return tools.filter(tool => {
    const destination = sidebarDestination(tool.href, student);
    if (seen.has(destination)) return false;
    seen.add(destination);
    return true;
  });
}

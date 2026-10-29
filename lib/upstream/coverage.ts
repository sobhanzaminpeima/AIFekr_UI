import { allModules, moduleViewHref, sourceRoutes } from "./registry";

export const examplePath = (path: string) =>
  path
    .replace("/admin/users/[id]", "/admin/users/1")
    .replace(/\[locale\]/g, "fa")
    .replace(/\[code\]/g, "AIF-2026")
    .replace(/\[[^\]]+\]/g, "demo");
export const upstreamRoutes = Array.from(
  new Set([
    ...sourceRoutes.map((p) => examplePath(p.route)),
    ...allModules.flatMap((m) => [
      examplePath(m.base),
      ...m.views.map((v) => examplePath(moduleViewHref(m, v))),
    ]),
  ]),
);
export function sourcePage(path: string) {
  return sourceRoutes.find(
    (p) =>
      (p.route !== "/[locale]" ||
        ["/fa", "/en", "/de", "/tr"].includes(path)) &&
      new RegExp("^" + p.route.replace(/\[[^\]]+\]/g, "[^/]+") + "$").test(
        path,
      ),
  );
}

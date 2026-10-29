const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const filename = path.resolve("lib/upstream/registry.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;
const registry = { exports: {} };
new Function("exports", "require", compiled)(
  registry.exports,
  Module.createRequire(filename),
);
const { allModules, sourceRoutes, SOURCE_COMMIT } = registry.exports;
const referencedModels = allModules
  .flatMap((m) => m.views.flatMap((v) => [v.model, ...(v.models || [])]))
  .filter(Boolean);
const summary = {
  repository: "https://github.com/sobhanzaminpeima/AIFekr",
  commit: SOURCE_COMMIT,
  sourcePages: sourceRoutes.length,
  modules: allModules.length,
  views: allModules.reduce((n, m) => n + m.views.length, 0),
  models: [...new Set(referencedModels)],
};
fs.writeFileSync(
  "reports/module-coverage.json",
  JSON.stringify(
    {
      ...summary,
      modules: allModules.map((m) => ({
        id: m.id,
        base: m.base,
        title: m.title[0],
        group: m.group,
        views: m.views.map((v) => ({
          id: v.id,
          title: v.title[0],
          kind: v.kind,
          model: v.model,
          related: v.models || [],
        })),
      })),
    },
    null,
    2,
  ),
);
fs.writeFileSync(
  "reports/module-coverage.md",
  `# AIFekr workspace coverage\n\nSource commit: ${SOURCE_COMMIT}\n\n${summary.sourcePages} source pages; ${summary.modules} module definitions; ${summary.views} views; ${summary.models.length} distinct domain models referenced.\n\nThis is frontend coverage. Shared schema-based views do not establish functional parity with upstream business rules or a connected backend.\n\n| Workspace | URL | Views |\n|---|---|---|\n` +
    allModules
      .map(
        (m) =>
          `| ${m.title[0]} | ${m.base} | ${m.views.map((v) => v.title[0]).join(" · ")} |`,
      )
      .join("\n"),
);
console.log(JSON.stringify({ ...summary, models: summary.models.length }));

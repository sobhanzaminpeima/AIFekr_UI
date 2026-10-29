const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");
const filename = path.resolve("lib/upstream/registry.ts");
const registry = {};
new Function(
  "exports",
  "require",
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText,
)(registry, Module.createRequire(filename));
const dedicated = {
  crm: "*",
  accounting: [
    "overview",
    "journal",
    "accounts",
    "ledger-setup",
    "expenses",
    "bank",
    "payroll",
    "budgets",
    "close-period",
    "owner-statements",
    "tax",
    "assistant",
  ],
  social: [
    "publish",
    "content",
    "analytics",
    "campaigns",
    "direct-rules",
    "brand",
    "calendar",
    "queue",
    "growth-report",
  ],
  seo: [
    "overview",
    "url",
    "keyword",
    "intelligence",
    "competitors",
    "content",
    "meta",
    "posts",
    "plan",
    "agent-pipeline",
    "rankings",
    "backlinks",
    "lessons",
  ],
  leads: ["overview", "forms", "inbox", "reports", "builder"],
  "voice-agent": ["agents", "setup", "knowledge", "calls", "appointments"],
  ceo: "*",
  agents: "*",
  meeting: "*",
  website: "*",
  startup: "*",
  organization: "*",
  student: "*",
  learn: "*",
  fitness: [
    "overview",
    "programs",
    "gym",
    "nutrition",
    "history",
    "profile",
    "reports",
    "plans",
    "athlete-card",
  ],
  voice: "*",
  image: ["generate", "reference"],
  video: ["generate", "reference"],
  music: ["generate"],
  factory: ["production", "script", "timeline", "edit"],
  play: ["arcade"],
  "admin-dashboard": ["overview"],
  "admin-packages": "*",
  "admin-billing-promotions": "*",
  "admin-financial": "*",
  "admin-users": "*",
  "admin-users-[id]": "*",
};
dedicated.marketplace = "*";
dedicated["admin-fitness-marketplace"] = ["overview"];
dedicated['admin-ai-courses-[id]-preview']='*';
for(const id of ['admin-financial-customers','admin-financial-invoices-[id]','admin-subscriptions','admin-credit-tiers','admin-billing-rates','admin-revenue','admin-industry-packs','admin-ai-courses']) dedicated[id]='*';
dedicated['admin-academy']=['overview'];
for (const id of ['doctor','owner','referral','factory','play','image','video','music']) dedicated[id] = '*';
for (const [id, views] of Object.entries({accounting:['automation'],social:['competitors'],seo:['sites','verify'],leads:['sources'],'voice-agent':['properties'],fitness:['trainers']})) dedicated[id] = [...dedicated[id], ...views];
const sharedKinds = new Set([
  "matrix",
  "connections",
  "chat",
  "game",
  "gym",
  "quiz",
  "flashcards",
  "inbox",
  "timeline",
  "studio",
]);
const rows = registry.allModules.flatMap((m) =>
  m.views.map((v) => ({
    module: m.id,
    group: m.group,
    route: registry.moduleViewHref(m, v),
    view: v.id,
    title: v.title[0],
    renderer:
      dedicated[m.id] === "*" || dedicated[m.id]?.includes(v.id)
        ? "dedicated"
        : sharedKinds.has(v.kind)
          ? "shared interaction"
          : "schema-based",
    kind: v.kind,
    source: m.source,
    model: v.model || null,
  })),
);
const summary = {
  sourceCommit: registry.SOURCE_COMMIT,
  sourcePageFiles: registry.sourceRoutes.length,
  moduleViews: rows.length,
  dedicated: rows.filter((r) => r.renderer === "dedicated").length,
  sharedInteraction: rows.filter((r) => r.renderer === "shared interaction")
    .length,
  schemaBased: rows.filter((r) => r.renderer === "schema-based").length,
};
fs.writeFileSync(
  "reports/internal-page-audit.json",
  JSON.stringify({ summary, rows }, null, 2),
);
fs.writeFileSync(
  "reports/internal-page-audit.md",
  `# Internal page renderer audit\n\nReference commit: ${summary.sourceCommit}\n\n${summary.sourcePageFiles} upstream page files; ${summary.moduleViews} registered module views. ${summary.dedicated} use dedicated experiences, ${summary.sharedInteraction} use shared interaction components, ${summary.schemaBased} remain schema-based.\n\nA dedicated renderer is not a claim of backend parity. Shared CRUD can be suitable for a resource page, but entries below require individual design review before calling the entire product complete. Admin user details use a separate ID-scoped page; unknown IDs have an explicit not-found state.\n\n| Module | View | Renderer | Route |\n|---|---|---|---|\n` +
    rows
      .map((r) => `| ${r.module} | ${r.title} | ${r.renderer} | ${r.route} |`)
      .join("\n"),
);
console.log(JSON.stringify(summary));

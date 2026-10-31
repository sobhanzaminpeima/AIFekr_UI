// Source audit only. A prototype screen is never evidence of a live connection.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const filename = path.join(root, 'lib/upstream/registry.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, resolveJsonModule: true, esModuleInterop: true } }).outputText;
const mod = new Module(filename, module);
mod.filename = filename; mod.paths = module.paths; mod._compile(compiled, filename);
const connected = { crm: 'live-crm.tsx', image: 'live-create.tsx', video: 'live-create.tsx', music: 'live-create.tsx', voice: 'live-voice.tsx', factory: 'live-factory.tsx', accounting: 'live-accounting.tsx', social: 'live-social.tsx', leads: 'live-leads.tsx', doctor: 'live-advisory.tsx', meeting: 'live-advisory.tsx', website: 'live-website.tsx', referral: 'live-referral.tsx', startup: 'live-startup.tsx' };
const flags = { accounting: 'UI_V2_ACCOUNTING_ENABLED', social: 'UI_V2_SOCIAL_ENABLED', leads: 'UI_V2_LEADS_ENABLED', doctor: 'UI_V2_ADVISORY_ENABLED', meeting: 'UI_V2_ADVISORY_ENABLED', website: 'UI_V2_WEBSITE_ENABLED', referral: 'UI_V2_REFERRAL_ENABLED', startup: 'UI_V2_STARTUP_ENABLED' };
const rows = mod.exports.modules.map(m => ({ module: m.id, route: m.base, views: m.views.length, status: connected[m.id] ? 'connected-in-source' : 'classic-only', adapter: connected[m.id] ?? null, featureFlag: flags[m.id] ?? null }));
const result = { generatedAt: new Date().toISOString(), scope: 'Source inventory only; deployment, enabled flags and external workflows require separate verification. Admin, account and public routes audited separately.', connected: rows.filter(r => r.status === 'connected-in-source').length, classicOnly: rows.filter(r => r.status === 'classic-only').length, modules: rows, otherLiveRoutes: ['/home', '/welcome', '/chat', '/create', '/gallery', '/pricing', '/login', '/register', '/about', '/contact', '/guides', '/features', '/solutions', '/payments'], otherClassicAreas: ['/admin', '/plans', '/credits', '/settings', '/notifications'] };
const out = path.join(root, 'docs/activation/live-coverage.json');
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ modules: rows.length, connectedInSource: result.connected, classicOnly: result.classicOnly }));

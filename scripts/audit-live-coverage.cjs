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
const connected = { crm: 'live-crm.tsx', image: 'live-create.tsx', video: 'live-create.tsx', music: 'live-create.tsx', voice: 'live-voice.tsx', factory: 'live-factory.tsx' };
const rows = mod.exports.modules.map(m => ({ module: m.id, route: m.base, views: m.views.length, status: connected[m.id] ? 'connected' : m.id === 'accounting' ? 'implementation-in-progress' : 'classic-only', adapter: connected[m.id] ?? (m.id === 'accounting' ? 'live-accounting.tsx' : null) }));
const result = { generatedAt: new Date().toISOString(), scope: 'registered product modules; admin, account and public routes audited separately', connected: rows.filter(r => r.status === 'connected').length, classicOnly: rows.filter(r => r.status === 'classic-only').length, modules: rows, otherLiveRoutes: ['/home', '/welcome', '/chat', '/create', '/gallery', '/pricing', '/login', '/register', '/about', '/contact', '/guides', '/features', '/solutions'], otherClassicAreas: ['/admin', '/payments', '/plans', '/credits', '/settings', '/notifications'] };
const out = path.join(root, 'docs/activation/live-coverage.json');
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ modules: rows.length, connected: result.connected, classicOnly: result.classicOnly, inProgress: 1 }));

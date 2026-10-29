# AIFekr — Warm Intelligence

This is a standalone, Persian-first **front-end demo**. It has no connection to the existing ai-platform backend. No money is charged, messages sent, accounts connected, or real AI media generated.

## Run

```sh
npm install
npm run dev
# http://localhost:3000
npm run build
npm start
npm run typecheck
npm test
```

The Playwright configuration uses installed Microsoft Edge. For another computer, install Playwright Chromium and replace `channel: 'msedge'` in `playwright.config.ts`.

## Review

- `/` — public landing
- `/home` — personal dashboard
- `/sitemap-ui` — complete registered route index
- `/design-system` — colors, typography, actions, forms, feedback states and table
- `/settings` — locale/theme, export/reset local data and random failure toggle
- `/admin/overview` — management shell

All four locale options change the document language and direction. Persian and English have the broadest content coverage. German and Turkish currently translate core navigation and common actions and fall back to English elsewhere.

## Identity

Deep graphite surfaces, warm restrained orange light, soft hairline borders and quiet typography. The brand gradient is reserved for important actions and the spark logo. Blue identifies learning, lime identifies FIT, violet identifies sound. Local Vazirmatn variable font prevents remote font requests; the font license is in `public/fonts/`. Artwork is authored SVG, not AI-generated output or stock imagery.

CSS tokens live in `app/globals.css`. Dark is the initial theme; light mode overrides semantic variables. Layout uses inline logical properties; Persian sets `dir=rtl`, other locales use LTR. The desktop sidebar becomes an icon rail on tablet and a drawer plus bottom navigation on mobile. Studios use Prompt / Result / History tabs on mobile. Tables render as cards below 768px. Native dialogs trap focus, handle Escape and become compact mobile dialogs. Reduced-motion preference disables animations.

## Architecture

- `app/[[...slug]]/page.tsx`: server route entry, one client renderer for this UI prototype.
- `components/platform.tsx`: explicit module dispatcher and route review surfaces.
- `components/ui`: shared primitives, dialogs, empty/error/loading state, icons and downloads.
- `components/providers.tsx`: locale/theme, local credit wallet, locally persisted generated sample outputs.
- `mocks/catalog.ts`: typed tools, route registry, contacts and project fixtures.
- `lib/api/client.ts`: promise-based mock data layer with 300–1200ms latency and a controllable 35% random failure mode.

For a production application, split the dispatcher into the route groups described in the brief and add server authentication/authorization. Use the fixtures as DTO contracts, replace the functions in `lib/api` with authenticated API calls, and replace browser storage with account-scoped server persistence. Credit debits/refunds must move to a server ledger. Rendering components should receive normalized results rather than provider-specific responses.

## Interaction rules

Creation costs appear before execution and require confirmation; unsuccessful creation refunds credits. The media studios intentionally return labelled sample artwork, storyboard text or a demo tone. Text streams progressively in chat. No real recorder, speech synthesis, generated video, social publishing, authentication provider or payment gateway is connected. The demo OTP is **123456**, and the demo discount is **AIFEKR10**.

CSV and text downloads are generated locally. Generated images download the sample SVG. The printable sample certificate must not be treated as an earned credential. The public shared conversation and verification pages are fixed samples, not a hosting or credential service.

## Upstream expansion — 2026-10-29

### Landing completion pass

Reviewed the HTML content of `https://aifekr.com` on 2026-10-29 and saved the reference in `reports/live-landing.html`. The local landing now includes a connected-workspace journey demo for business, content and learning; specialist CRM/accounting introductions; student/FIT sections; a searchable module explorer; practical guides; pricing/credit explanation; security information; and the final call to action. The original hero, creative showcase, industry routes and pricing remain part of the page. The module directory is positioned within the page rather than appended after the final CTA.

Public navigation includes product and solution menus. The footer groups product, solutions and resources, with mobile language/theme and login controls in the menu. Journey tabs support arrow, Home and End keys. Public content is local preview content; this change does not publish to aifekr.com or enable live integrations.

### Dedicated workflow expansion

### Internal completion pass

The administrator user directory now has account-specific columns and clickable names. `/admin/users/:id` reads the matching user, keeps notes/access/credits/history isolated by ID, confirms block/credit adjustments with a reason, prevents negative credit balances and exposes unknown IDs explicitly. Plan and block changes refresh the directory. Payment and usage sections do not substitute other users' records. Admin course previews likewise read the requested course ID rather than showing an unrelated sample.

Voice projects now have script segments, pauses, voice profiles, preset controls, project selection and archive/restore. Organization workspaces include identity setup, members, local invitation acceptance, role matrices, module controls and an audit log. CEO/agent/meeting views include strategic tasks, measurable goals, approval-to-task conversion, role configuration, staged simulation and editable meeting minutes. Student workspaces include subject libraries, resource metadata, notes, exam/task planning, a study timer, local group messages and editable research outlines. Academy text lessons have persistent exercise answers, completion tracking, a syllabus and explicitly non-accredited local completion records.

The coach marketplace connects application review in admin to seller activation, product creation, local orders, fulfillment and one review per completed order. These remain local previews, not connected services. Empty-state text now follows the workspace context rather than describing every missing record as a creative generation.

`scripts/internal-page-audit.cjs` produces a per-view renderer matrix in `reports/internal-page-audit.md` and JSON. Shared resource views are reported separately from dedicated experiences. Its counts describe rendering coverage, not production completeness or individual visual approval.

CRM and accounting now use a dedicated business shell rather than the generic module banner and horizontal tabs. Their internal sidebar groups specialist tasks, while the platform navigation collapses to an icon rail on these routes. CRM has warm relationship-intelligence accents; accounting uses restrained teal financial accents. The optional copilot panel shows calculated workspace insights, links to the relevant actions and produces a local status summary. It explicitly identifies local rule-based calculations rather than claiming a live AI connection. Shared browser state broadcasts updates so insights refresh after local workflow changes. Mobile uses a dismissible specialist drawer.

The canonical and supported business alias routes now use dedicated workspaces for accounting, CRM, social content, SEO, website projects, startup canvases, fitness, lead forms, call agents and package billing. Accounting validates double-entry journals, supports reversals and bank matching, snapshots payroll and locks closed periods. CRM connects contacts, deals, follow-ups and calculated forecasts. Lead forms collect local preview responses and convert them into CRM contacts. Admin plan prices and promotions feed pricing and checkout, and local purchases have downloadable receipts.

The social workspace has an editable content preview, local scheduling and reply-rule simulation. SEO inspects user-supplied HTML and tracks articles through writing/review stages without inventing search metrics. Website projects contain editable pages and sections with sandboxed previews and HTML exports. Startup canvases, MVP tasks and pitch outlines persist locally. FIT records workout sets and meals and reports actual logged sessions. Call agents have schedules, approved Q&A, text simulation and appointment conflict checks. Video factory drafts survive reloads. These components retain the existing design system.

External publishing, real AI generation, telephony, bank payments and production authentication still require backend integration. The HTML site exporter currently downloads one page at a time; the project JSON preserves all pages. Shared schema-based views still serve modules without a dedicated component.

Verified the local reference against `origin/main`: `b89eea53ec1e78a117718356d319aff3ac837b7f`. It contains 147 page files and 209 Prisma model definitions. The existing registry is now connected to the renderer: 78 module definitions expose 299 views and reference 186 distinct models. The sitemap includes canonical upstream routes, sample dynamic routes and module query tabs alongside the previous routes. See `reports/module-coverage.md` for the complete matrix.

`components/module-workspace.tsx` renders domain schemas with independent local collections, field forms, creation/edit/delete, searchable tables, CSV and JSON downloads, related record tabs, status boards, agendas, local inboxes, timelines, draft editors, stepped forms and permission matrices. Canonical media pages reuse the existing studios and factory. Student quizzes/flashcards and course previews reuse learning components. Public feature and industry pages list the relevant modules and link to their sections. The landing has a complete module directory and admin navigation includes the upstream administration sections.

The reusable domain views are scaffolding for specialized workflows. They do not establish feature parity: accounting journal balancing, payroll calculations, bank matching, owner settlements, production AI, API integrations, publishing, authentication, business validation and authorization remain outside these shared views. The original dedicated invoice/factory/admin experiences remain available. New workspace state is saved in namespaced browser storage and included in Settings export/reset.

## Original prototype coverage and limitations

The sitemap makes **200 registered routes** reachable across public, account, creation, business, learning, FIT and admin surfaces. Business child pages include invoice line-item calculation and print/PDF, bank matching, editable lean canvas, content/device previews, connectors and staged forms. The video factory includes editable chapters, scene reorder with drag or keyboard buttons, voice/music choices, per-scene cost review, progress and downloadable storyboard JSON. Admin includes permission/access matrices, model toggles/rates, reorderable provider fallback, versioned sample prompts, filtered logs and typed-confirmation backup restore.

Some business modules intentionally use shared table/wizard templates, and several admin sections share the same sample contacts/transactions dataset rather than bespoke domain schemas. This is a broad interactive prototype, not completion of every specialized workflow in the master brief. Full payroll/accounting logic, real media players/editors, map views, complete CMS editing, bespoke growth/finance reports and production integrations need dedicated implementation. German/Turkish coverage is partial. Certificate validation and sharing are fixed demos.

Next steps should specialize these domain workflows, finish German/Turkish translations and undertake screen-by-screen accessibility/performance review. Lighthouse scores are only reported when measured; they are not implied by the design.

## Validation

`tests/platform.spec.ts` exercises registered routes, generation and credit persistence, streamed chat, command search, admin filtering, mobile overflow, locale/theme switching, the seven-step video factory, invoice totals, permission changes and provider reordering. Build and typecheck are independent commands.

Additional reproducible review scripts (start production on port 3100 first):

```sh
node scripts/responsive.mjs   # all unique registered routes at 360px
node scripts/audit.mjs        # axe scans in dark and light themes
node scripts/lighthouse.mjs   # production landing, local Chrome
node scripts/capture.mjs      # 28 phase screenshots: fa/en, desktop/mobile
```

Reports live in `reports/`; screenshots live in `screenshots/`. Browser automation requires local Edge/Chrome as configured in the scripts. These automated checks supplement visual/keyboard review; they do not establish complete accessibility conformance.
# Internal workspace extension — 2026-10-29

Business assessment now has a context wizard, editable SWOT, actions and measurable targets. Owner pages share CRM property relationships and issued accounting statements, with owner-scoped visibility and booking overlap checks. Referral pages distinguish invitation events, earnings records and reserved payout requests; they do not invent a balance or transfer money.

Media archives use actual locally recorded generation entries. Lyrics, character continuity, factory versions, source files, exports and publication plans have separate workspaces. The arcade records attempts and points locally. Social competitor observations, SEO site records, financial report plans and property-to-call-agent knowledge handoff have dedicated interactions. Background publishing, domain ownership verification and automated financial delivery require external services.

Renderer coverage is tracked in `reports/internal-page-audit.md`: 198 dedicated views, 9 shared interaction views and 92 schema-based views out of 299. These categories describe presentation coverage, not backend parity or full product completion.
# Admin finance and course editorial pass — 2026-10-29

Admin purchases now expose searchable date/status-filtered receipts and ID-specific detail pages. Missing receipt IDs never fall back to another purchase. Customer and subscription cards read the matching user profile; purchases without a user ID remain unlinked. Sales exclude failed payments and report currencies separately. Manual exchange-rate configuration includes a conversion preview. Credit tiers and industry bundles have purpose-built editors; both remain local configuration.

Course administration now includes lesson ordering and editing, exact-ID preview, local publication state, generation queue visibility, revision snapshots and restoration that preserves the replaced version. Admin resource tabs use specific translated names rather than a repeated generic label.

Current renderer audit: 211 dedicated views, 9 shared interaction views, 79 schema-based views. Remaining entries are listed in `reports/internal-page-audit.md`; this pass does not represent full product completion.
# Home simplification — 2026-10-29

The home page keeps the single Business Doctor recommendation and removes the full module directory, search and category controls from its content. Module discovery remains available through the header workspace chooser and existing workspace navigation. This supersedes the earlier decision to list all requested modules on home.

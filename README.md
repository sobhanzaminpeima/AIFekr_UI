# AIFekr UI

Persian-first interactive front-end prototype based on `AIFekr-UI-Master-Prompt.md`.

```sh
npm install
npm run dev
```

Open [the dashboard](http://localhost:3000/home), [the landing](http://localhost:3000), or [the route index](http://localhost:3000/sitemap-ui).

See [DESIGN.md](DESIGN.md) for architecture, demo behavior, coverage and remaining domain-specific work. No production backend, payments or live AI services are connected.

The upstream expansion adds 78 module definitions and 299 views. Canonical examples:

- `/crm?tab=contacts`, `/accounting?tab=payroll`, `/social?tab=campaigns`
- `/student?view=planner`, `/fitness?tab=profile`, `/video-factory?tab=production`
- `/admin/dashboard`, `/admin/module-access`, `/admin/billing/promotions`
- `/features/crm`, `/industry/real-estate`

The sitemap includes the upstream pages and every registered module view. Schema-based domain workspaces support local editing, related record collections and CSV export. These are frontend prototypes; they do not implement the upstream backend's business rules. The full module/view matrix is in [reports/module-coverage.md](reports/module-coverage.md). Regenerate it with `node scripts/module-coverage.cjs`.

For an isolated browser test run, set `PLAYWRIGHT_PORT` to an unused port before `npm test` so an older preview server is not reused.

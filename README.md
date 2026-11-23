# AIFekr UI

Persian-first workspace and admin interface for [AIFekr](https://aifekr.com), built with Next.js 16.4.6. Production workflows use the [AIFekr backend](https://github.com/sobhanzaminpeima/AIFekr).

## Local development

```sh
npm install
npm run dev
```

Open [the dashboard](http://localhost:3000/home), [the landing](http://localhost:3000), or [the route index](http://localhost:3000/sitemap-ui).

See [DESIGN.md](DESIGN.md) for architecture, demo behavior, coverage and remaining domain-specific work. Local prototype views can run independently. Live views require the backend and an authenticated session.

The upstream expansion adds 78 module definitions and 299 views. Canonical examples:

- `/crm?tab=contacts`, `/accounting?tab=payroll`, `/social?tab=campaigns`
- `/student?view=planner`, `/fitness?tab=profile`, `/video-factory?tab=production`
- `/admin/dashboard`, `/admin/module-access`, `/admin/billing/promotions`
- `/features/crm`, `/industry/real-estate`

The sitemap includes the upstream pages and every registered module view. Schema-based domain workspaces support local editing, related record collections and CSV export. The coverage matrix includes prototype views as well as live integrations. The full module/view matrix is in [reports/module-coverage.md](reports/module-coverage.md). Regenerate it with `node scripts/module-coverage.cjs`.

For an isolated browser test run, set `PLAYWRIGHT_PORT` to an unused port before `npm test` so an older preview server is not reused.

## Customer and admin routes

The Gaming Shorts pilot is available in source at `/video-factory?service=gaming`, with a separate queue under `/admin/users/requests` and a draft landing at `/campaigns/gaming-shorts/index.html`. It supports resumable source uploads and private delivery of three clips, covers, subtitles and publishing metadata. The offer stays closed while its price and public sample await approval.

| Route | Purpose |
| --- | --- |
| [YouTube campaign](https://aifekr.com/youtube) | Compare the automatic and team-produced ten-minute packages. Prices come from the live catalog. |
| `/plans?plan=VF_AUTO_10` and `/plans?plan=VF_ECONOMY_10` | Preserve the selected package through sign-in and show the price before Zarinpal checkout. |
| `/video-factory` | Start an automatic project or submit the topic and channel for a manual order. |
| `/settings?tab=economy` | Track approval, preview delivered media, and download the film, thumbnail and publishing details. |
| `/admin/users/requests` | Review orders, approve requests, upload finished files and send delivery notifications. |
| `/admin/customer-growth#campaigns` | View the YouTube, Live and Voice Studio campaigns and their attribution. |

The workspace sidebar groups links by task, including content creation, business, and learning and health. Live and Video Factory carry a localized “New” badge, rendered as a dot when the sidebar is collapsed.

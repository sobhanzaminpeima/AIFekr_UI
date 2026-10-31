# Final product-module migration — 2026-11-01

The 25 registered product modules now have API-backed source adapters. This inventory is not a claim that every external provider is configured, that every paid workflow was exercised, or that admin/account pages have all been migrated. Re-run `node scripts/audit-live-coverage.cjs` after changing the registry.

New adapters cover SEO, CEO, assistant directory, organization, voice call center, academy, student workspace, fitness, coach marketplace, games and the separately authenticated property-owner portal. Settings now uses the real account profile/password endpoints and a bounded, decoded/re-encoded avatar upload.

The student workspace uses owned course sources, private notes, server-graded quizzes, spaced repetition, tasks/exams, groups and server-persisted study timers. Timed quiz tokens retain the server's original generation/start time and are kept in session storage for recovery; reopening never resets the server deadline. Saved timed quizzes without their original token cannot be submitted as new attempts.

Fitness uses the existing entitlement and conservative AI generation/coach APIs. Set logs are explicit drafts until saved; completing a session requires all required sets and updates authoritative weekly/monthly reports. Resume reads the saved session and revision. Exported athlete cards use the same referral code as the account's referral workspace.

Games use an unchanged copy of the backend deterministic engine and submit input replays rather than client-asserted scores. Server checks session ownership, timing, score, achievements and free-competition eligibility. No purchase is tied to participation.

Marketplace catalog prices are quoted into toman for Persian, TRY for Turkish and USD for English/German using existing administrator rates. Base catalog prices are preserved. Unavailable quotes are shown explicitly; there is no silent toman fallback. USD and EUR use the configured shared foreign-currency IBAN. Payment confirmation, receipt review, refunds and seller publication remain existing backend operations.

## Rollout switches

- `UI_V2_SEO_ENABLED`
- `UI_V2_TEAM_ENABLED` (CEO and assistant directory)
- `UI_V2_ORGANIZATION_ENABLED`
- `UI_V2_CALL_CENTER_ENABLED`
- `UI_V2_ACADEMY_ENABLED`
- `UI_V2_OWNER_ENABLED`
- `UI_V2_PROFILE_ENABLED`
- `UI_V2_FINAL_MODULES_ENABLED` (student, fitness, marketplace and games)

Only the migrated root entries are claimed. Existing detail pages, admin pages, payment receipts and checkouts remain on their established backend pages. Roll back these flags independently of the already-live accounting, social and earlier module flags.

## Validation before release

- UI TypeScript and 22 browser-free logic checks, including all module view routes and deterministic game replays.
- Backend TypeScript; 191 tests passed, 26 intentionally skipped in 47 selected test files.
- 49 local HTTP/database checks for real API contracts, profile image decoding, student material/notes/flashcards/timer, fitness set completion/reporting, cross-account denial, call-center CRUD and owner-portal isolation. Zero paid calls, real payments or external messages.
- Earlier local contract batches: SEO 18, team 13, organization 10, academy 12.
- Chrome at 390×844 and 320×740: main hamburger remains inside the header; main drawer opens/closes; CRM drawer closes after choosing Contacts. This visual check used the isolated design-review app. API checks used synthetic local accounts, not production users.
- Home: exact deployed route's `createRequire` now resolves both direct and hashed Prisma imports to the current isolated runtime. The read-only production runtime guard passed. No production account was impersonated.

## Limits

Provider provisioning, paid AI calls, real payment/receipt approval, public posting, group messaging to real people and actual phone calls were not executed for release verification. Their API forms preserve explicit confirmation and server errors. No economic settings or production schema were changed.

The requested wholesale Hoosha Halloween catalog import was not performed. Only publicly visible samples were inspected; no competitor text/image catalog is included in this release.

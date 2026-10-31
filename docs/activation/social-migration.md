# Social live adapter — 2026-10-31

The v2 social module now has an API adapter for its 12 registered views: account/publishing, content studio, analytics, inbox, comment campaigns, direct rules, brand, competitors, calendar/queue, growth report and connections. It reuses the existing tenant-scoped APIs and shell authorization, not prototype localStorage records. Calendar and queue currently expose the real scheduling form and queue table.

AI content and reports display the approved credit cost before explicit submission. Empty responses are not successful drafts. Scheduling, immediate publishing, disconnect, campaign activation/deletion and message sends are explicit actions with confirmation text and submission locks. Disconnect explains removal of account-specific rules and queued data. No automatic retry is made after transport failure. Manual reply IDs stay stable during a same-form retry. No live message, post, campaign, token or paid generation was created for verification.

Brand fields and content pillars use the existing profile contract. Campaign links support at most two labeled HTTP(S) destinations. Direct delivery settings round-trip unchecked booleans correctly. Unknown metrics are shown as missing, not zero. Existing plan gates and provider settings remain server-authoritative. The new route requires `UI_V2_SOCIAL_ENABLED=1`; leave it off to keep the classic page.

Evidence: 9 browser-free UI tests passed; 32 related backend tests passed; 8 local HTTP checks passed (five reads, invalid brief rejection, disconnected analytics and unchanged credits). TypeScript passed. Production build passed including the additional tools. Browser interaction/mobile visual QA is unavailable because local browser use is disabled. OAuth switching, actual publishing, delivery, remote competitor fetch and paid generation have not been live-tested. This file does not claim those external operations succeeded.

Additional tools now include explicit content-idea requests, deterministic quality checks, image analysis with an image-studio handoff, generated calendar drafts with manual queue insertion, competitor AI analysis and webhook-subscription controls. A richer visual month calendar remains pending. Do not mark the entire platform migration complete; SEO, student, fitness, business tools, wallet and admin still need live adapters.

## Production release

Released 2026-10-31: backend edb4eb08 (.next-rel-edb4eb0), UI 0d74040 (/var/www/aifekr-ui-v2-0d74040). Both PM2 processes are online. Accounting and social flags are enabled. Consistent SQLite backup was created and verified before switching. Home, English home and health returned 200; guest social/accounting returned 307 and guest Instagram status returned 401. Available disk: 5.7 GB. Rollback: backend .next-rel-2a2721a, UI /var/www/aifekr-ui-v2-b88f873, social flag disabled, accounting flag enabled.

No signed-in production walkthrough or external publishing, messaging, OAuth switch, paid generation or real payment was performed. Browser access remains unavailable. Source inventory: 8 of 25 registered product modules have live adapters, 17 remain classic-only; this is not a declaration of completed platform migration.

# Live UI coverage and accounting migration — 2026-10-31

## Audit

`scripts/audit-live-coverage.cjs` produces `live-coverage.json`. It distinguishes registered prototype modules from live adapters; a route existing in the design is not proof of API integration. Baseline: 25 product modules, 6 connected creative/CRM modules, accounting in progress, 18 classic-only modules. Home, onboarding, chat, public pages and admin/account routes are tracked separately. Legal pages and payment history were integrated in newer commits during this work and must be preserved.

## Accounting implementation

The adapter uses the design's BusinessShell, panels, tables, forms and modals. Views: overview, journal, accounts/drill-down, ledger setup, expenses/vendors, bank reconciliation/import, payroll, budgets, tax, fiscal periods, owner statements, assistant and scheduled reports. Writes use existing tenant-scoped APIs, explicit forms/confirmation and synchronous duplicate-submit locks. No financial action runs on page load. Manual journals and owner statements support multiple lines. Credit rates for the assistant come from the approved cost API. Restricted users see read-only controls; server authorization remains authoritative.

The module pulse now reads live bank/expense/period data and refreshes after writes. Failed requests remain unknown rather than showing demo balances. No prototype route may fall through to a demo on the live server. Unknown accounting paths are excluded.

Main backend changes include accounting copy/access in the shell and manual journal API authorization/ownership/ledger validation. `UI_V2_ACCOUNTING_ENABLED=1` is required before routing accounting to v2. Leave unset for rollback to classic. Deploy backend before UI if enabling this contract.

## Verification and limits

- 69 accounting/routing tests passed, including real balanced posting, cross-workspace read/reversal denial, forged-origin rejection and unbalanced-write rejection.
- Full backend suite: 1,352 passed, 88 skipped, no failed tests. This is not proof for skipped capabilities.
- Five browser-free UI logic checks passed: route/view mapping, unknown route rejection, streamed response/error handling and media safeguards.
- Both TypeScript checks and the UI production build passed.
- No paid synthesis, real payment, production financial mutation or customer-account sign-in occurred.
- Browser walkthrough, mobile visual verification and production rollout of this increment remain pending. Browser use is disabled in Work settings.
- Wallet adapter from the previous session was unfinished: its typing/retry issues were corrected, but it is not enabled. Its localization, purchase currency and live contract need verification before rollout.

## Still open

Accounting parity needs a final per-action local HTTP walkthrough and review of BI export/token management, AI proposals/anomalies, commission and management-fee tools, and report preview presentation. These are not marked completed by the presence of navigation tabs. Social, SEO, lead generation, business/learning/fitness/admin migrations remain separate work; do not enable their prototype screens.

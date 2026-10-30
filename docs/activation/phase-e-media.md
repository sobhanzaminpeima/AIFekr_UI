# Phase E — media first-result guardrails (2026-10-31)

This increment preserves the v2 design and all approved financial rules. It does not complete every module in Phase E.

## Verified problems and changes

- Shared media controls used hardcoded image costs and fallback video/music costs. They now read `/api/credits/costs`, the same approved table used by generation routes. Unknown costs disable submission and offer a reload; zero is supported without inventing a price. Duration tiers match the existing backend.
- A successful HTTP response with no valid image URLs could be shown as a completed generation. It now fails visibly, without fabricating a result or first success.
- Studio failures used a generic retry action. They now preserve the prompt and reference images and explain credit, package, input, rate-limit, availability and unconfirmed-provider outcomes. Resubmission is always explicit; no automatic paid retry was added.
- An optional image example fills the prompt without submitting it. Confirmed image results offer an optional next step to chat. The existing primary action, confirmation, cost summary, progress and output cards remain in the design.
- A synchronous submission guard prevents repeated confirmation clicks from launching duplicate requests while the current generation is pending.

## Evidence

- Production read-only SQLite baseline (`mode=ro`), counts only: chat 26 module views / 7 started / 7 succeeded; voice 9 module views; CRM 6; image 3. Historical stored row counts: 21 images, 3 voice jobs, 85 CRM contacts, 3 student materials. These historical counts are not a cohort conversion rate.
- Three browser-free logic tests passed (approved rates, output validation, actionable failures), TypeScript passed, production build passed.
- Local HTTP smoke: guest cost request 401; authenticated local test account cost request 200; blank image prompt 400; balance unchanged. No provider call or live payment was made.
- Local dev required Webpack because Turbopack could not resolve the linked Next package. No production configuration was changed to address this local issue.
- Browser walkthrough and mobile screenshots are not verified: local browser access is disabled in Work settings. No production account was used to sign in.

## Rollout boundaries

Released UI code `1d542ce` at `/var/www/aifekr-ui-v2-1d542ce`, port 3048. Preview and production health checks passed, as did the public homepage check. Artifact SHA-256 matched before extraction. Rollback remains `/var/www/aifekr-ui-v2-eb83908`; no release folder was deleted. Disk free after release: 6.4 GB. Source is pushed to `AIFekr_UI`, branch `codex/first-success-media`.

No backend code, schema, plan, exchange rate, credit amount, trial entitlement or paid-provider setting is changed. Paused accounting changes remain uncommitted and are excluded. Remaining Phase E modules and phases F–H remain open. Voice/video trial economics still require explicit owner approval.

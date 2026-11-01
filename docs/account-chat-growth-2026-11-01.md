# Connected account and chat workspaces

Production UI build: `ad8a44d` with backend `48a04847`.

Connected real-data pages: Settings, referral wallet, AI credit wallet and notification center. Chat supports preserved-history editing branches, transferring a conversation into/out of a project and opening project contents. Backend validates ownership; no account content is fetched from prototype/localStorage fixtures.

Package cards show actual features. The backend's checkout now presents a quote before payment-order creation. Customer Growth exports and admin frame changes are in the main repository.

Validation: TypeScript and production build passed; 25 logic tests passed. Synthetic local account passed HTTP/SSR/API checks for seven pages, account pages in four locales, chat branches, project transfers and notifications. Browser use was disabled in Work settings, so this release has no completed visual/device interaction review. No paid generation or real payment was used for testing.

Pending owner input: paid Chat plans lack fixed USD/TRY prices and approved conversion rates have expired. They remain available in Persian; foreign chat pricing was not changed without approval. See main repository release notes for detailed verification and rollback paths.

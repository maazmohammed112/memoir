# KREDO Sheet Approval & Freshness Pipeline

## Root causes fixed

- The dedicated Sheet tab rendered raw polling results instead of the approval/annotation-decorated transaction list. Local approvals therefore looked amber again after navigation or reload.
- KREDO selected the newest Email Vault month during startup and Insights defaulted to Email only. Those defaults hid newer Google Sheet rows even when the live Sheet read contained them.
- The GViz URL was stable across polls. Browser/intermediary cache behavior could return an older response despite `cache: no-store`.
- Approve actions only received the rendered app ID. They did not send the stable Transaction ID and Reference ID needed for safe Google Sheet row updates.

## Current data flow

1. KREDO reads the explicit `Transactions` tab with `headers=1`, `select *`, a unique GViz request ID, and a cache-busting query value.
2. Rows are normalized into stable IDs and sorted newest-first.
3. Approval state is saved immediately under app ID, Transaction ID, and Reference ID.
4. Every KREDO surface decorates the raw data with the same approval and merchant-memory rules.
5. Sheet transactions call `POST /api/kredo-sheet` with stable identity fields.
6. The server allowlists the KREDO spreadsheet and forwards the update to the approval-enabled Apps Script deployment.
7. The Apps Script locates the row by Transaction ID or Reference ID, writes `Approved` into Review Flag and the approval audit text into Review Reason, then returns a verified row count.
8. KREDO forces a fresh Sheet read. If remote write-back is unavailable, the local approval remains durable and the UI reports the Sheet sync as pending.

## One-time Apps Script activation

The currently deployed Smart Finance v6 web app exposes ingestion and review-queue capabilities but does not expose an approval-update action. To activate write-back without changing existing ingestion behavior:

1. Add `scripts/kredo-google-apps-script-writeback.gs` to the existing bound Apps Script project.
2. Add the two-line `tryHandleKredoWriteback_(e)` guard shown at the top of that file to the existing `doPost(e)`.
3. Redeploy the web app.
4. Set `KREDO_SHEET_APPROVAL_WEBAPP_URL` to the redeployed `/exec` URL in Vercel and local development.

Do not point `KREDO_SHEET_APPROVAL_WEBAPP_URL` at the old ingestion-only deployment. The API intentionally fails closed until the new deployment returns a verified update response.

## Verification log

- Live GViz verification: four rows returned; both September 1, 2026 rows present.
- Approval reload regression: a newly rehydrated row inherits approval by Transaction ID/Reference ID and remains emerald.
- Freshness regression: cache-busted reads include the newest date and order it first.
- API regression: an unconfigured deployment returns a safe pending response; a verified Apps Script response succeeds.
- `npm run check`, `npm run test:reconciliation`, full `npm test`, and `npm run build` are the release gates.

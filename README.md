# Memoir — encrypted personal vault

Memoir is a mobile-first, local-first personal memory vault. It includes encrypted offline storage, cross-device Firebase synchronization, precise AI-assisted field retrieval, clipboard history, birthdays, lifecycle reminders, Telegram integration, responsive layouts, and PWA support.

## Local development

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and use newly rotated server secrets.
3. Run `pnpm dev`.
4. Open `http://localhost:5173`.

The UI is served on port 5173 and the local API runs on port 8787.

## Firebase console setup still required

The Firebase web configuration is already included. In the Firebase Console:

1. Open **Authentication → Sign-in method** and enable **Email/Password**.
2. Create a **Cloud Firestore** database.
3. Deploy `firestore.rules` using the Firebase CLI.
4. For Telegram OTPs and background access, create a Firebase Admin service account and place its JSON (single-line JSON or Base64) in `FIREBASE_SERVICE_ACCOUNT_JSON`.
5. Generate a long random secret (at least 24 characters) for `VAULT_SERVER_KEY`.
6. Generate a separate long random `OTP_SECRET`, add `CRON_SECRET` in Vercel, and keep `APP_TIMEZONE=Asia/Calcutta` for background reminder delivery.
7. On Vercel Hobby, configure an external HTTPS scheduler to call `GET https://YOUR_DOMAIN/api/reminders` every minute with the header `Authorization: Bearer YOUR_CRON_SECRET`.

Without steps 1–3, Memoir remains fully usable offline but shows **Offline ready** rather than **Synced**. Without steps 4–5, Telegram background queries and the secure server mirror remain disabled.

## Security model

- Gemini and Mistral credentials exist only in server environment variables.
- Every approved UID has a separate IndexedDB database, wrapped AES-256-GCM vault key, Firestore collection, AI log, secure server mirror, Telegram queue, and reminder delivery namespace.
- The four-digit account number only selects the intended account. Firebase email/password and a user-specific Telegram OTP are the authentication factors.
- Firestore receives ciphertext, not plaintext browser records.
- The AI router receives record IDs, titles, categories, and field labels—but never secret field values.
- The client inserts approved values only after the AI selects the requested record and fields.
- Each Telegram bot is restricted to its assigned chat ID, validates its own webhook secret, and reads only that UID's separately encrypted server mirror through Firebase Admin.
- Telegram never returns banking records, passwords, passcodes, PINs, CVVs, secrets, card numbers, account numbers, or IFSC values. It can still queue create, update, and delete requests for the signed-in app.
- Firebase rules accept only the two explicit UID/email pairs and require a server-issued Telegram OTP session tied to the current password sign-in and browser identity. Every session expires after 12 hours.
- Each account permits two active devices. A correctly verified third device can explicitly replace both existing sessions; those sessions are revoked immediately and their apps return to sign-in on the next security heartbeat.
- OTP challenges expire after five minutes, store only keyed hashes, reject cross-user verification, enforce a two-minute resend delay, allow three requests before a 12-hour resend lock, and allow three incorrect entries before a four-hour verification lock.

## Smart reminders

- Notifications run 1 day, 5 hours, 3 hours, 2 hours, 30 minutes, 10 minutes, and exactly at the due time.
- Reminders can repeat every day, week, month, or year. Completing a recurring occurrence advances it to the next valid calendar occurrence instead of closing the series.
- Telegram reminder messages include **Done** and **Snooze 30m** buttons. The action is applied immediately to the secure server mirror and then synchronized to every signed-in device.
- Windows that occurred before the reminder was created are skipped automatically.
- Snoozed reminders send nothing until resumed.
- A reminder completed by the owner is green. Twelve hours without a response moves it to Completed as a red `no-response` item; confirming it later turns it green.
- The app synchronizes Telegram-created actions into the encrypted Firebase record collection without a page refresh.
- Countdown badges update every second without rerendering the page, and delivery keys are claimed atomically so the same Telegram notification cannot be sent twice.

## Notification center

- The navbar bell separates reminder and birthday deliveries due within the next 14 hours from Telegram deliveries sent during the previous 14 hours.
- Sent receipts are encrypted like every other vault record and remain visible for 14 hours.
- Expired receipts are automatically deleted from local storage and Firestore during background synchronization.
- A small animated Rhino status chip appears while records are being saved, edited, deleted, or synchronized from Telegram.
- Memoir uses one consistent light interface; theme switching is intentionally unavailable.

## Birthdays

- Birthday cards are ordered by the next upcoming month/day every year, not by the original birth year.
- Day and month are required. Birth year is optional and is stored as `0000-MM-DD` when unknown.
- A known year shows exact current years, months, and days plus the age at the next birthday. An unknown year shows `Age unavailable` without affecting reminders.

## Telegram webhook

After deployment, set separate strong `MAAZ_TELEGRAM_WEBHOOK_SECRET` and `DEEPTI_TELEGRAM_WEBHOOK_SECRET` values, then configure each bot’s webhook to:

`https://YOUR_DOMAIN/api/telegram`

Pass that bot's matching secret as Telegram’s `secret_token`. Both bots can use the same URL because the chat ID and signature route every update to its isolated UID. Each Telegram user must open their assigned bot and tap **Start** once before OTP delivery can work.

## Deployment

`vercel.json` provides Vite output configuration, SPA fallback, and security headers. `package.json` requires Node.js `24.x` for Vercel builds and server functions. Add these values to Vercel’s encrypted environment variables for Production, Preview, and Development as appropriate:

- `GEMINI_API_KEY`, `MISTRAL_API_KEY`
- `GEMINI_MODELS`, `MISTRAL_MODELS`, `TELEGRAM_AI_PROVIDER`
- `MAAZ_TELEGRAM_BOT_TOKEN`, `MAAZ_TELEGRAM_CHAT_ID`, `MAAZ_TELEGRAM_WEBHOOK_SECRET`
- `DEEPTI_TELEGRAM_BOT_TOKEN`, `DEEPTI_TELEGRAM_CHAT_ID`, `DEEPTI_TELEGRAM_WEBHOOK_SECRET`
- `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_PROJECT_ID`
- `VAULT_SERVER_KEY`, `OTP_SECRET`, `CRON_SECRET`, `APP_TIMEZONE`

Keep `APP_TIMEZONE=Asia/Calcutta`. Generate `VAULT_SERVER_KEY`, `OTP_SECRET`, both webhook secrets, and `CRON_SECRET` as separate long random values. Do not reuse a password. `FIREBASE_SERVICE_ACCOUNT_JSON` must be the complete single-line service-account JSON (or its Base64 encoding).

Vercel Hobby only supports daily Vercel Cron jobs, so this repository intentionally does not declare a `crons` block. For precise reminders on Hobby, use an external scheduler such as cron-job.org to call `/api/reminders` every minute and send `Authorization: Bearer YOUR_CRON_SECRET`. The endpoint rejects requests without the correct secret.

Telegram reminder delivery requires the matching user-specific bot token/chat ID, the Firebase Admin secure mirror, and the external scheduler. Telegram messages, AI queries, and the **Done**/**Snooze 30m** buttons additionally require each bot's webhook to point to `https://YOUR_DOMAIN/api/telegram`, configured with its matching webhook secret and with `message` and `callback_query` updates enabled.

Run `pnpm build`, then deploy. `public/404.html`, the manifest, app icon, and service worker are included.

The app blocks common right-click and keyboard shortcuts as a casual inspection deterrent. No website can reliably disable browser developer tools; access control, ciphertext-only Firestore records, server-side secret storage, and strict Firebase rules are the security boundary.

## Brand assets

Production logo assets live in `public/brand/`:

- `memoir-rhino-dark-transparent.png` — high-resolution transparent master
- `memoir-rhino-ui.png` — optimized transparent in-app artwork
- `memoir-app-icon.png` — full-bleed high-resolution app icon master
- `favicon-32.png`, `apple-touch-icon.png`, `pwa-192.png`, and `pwa-512.png` — platform exports

The dark transparent mark is converted to a restrained white watermark with CSS only on dark surfaces, preserving a single authoritative logo geometry.

## Credential safety

Any Gemini key, Mistral key, or Telegram token previously pasted into a chat should be revoked and replaced before deployment. `.env.local` is ignored by Git, but rotation is still necessary because chat disclosure cannot be undone.

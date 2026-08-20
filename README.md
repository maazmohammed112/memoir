# Memoir — encrypted personal vault

Memoir is a mobile-first, local-first personal memory vault for credentials, banking records, documents, personal notes, clipboard history, birthdays, and reminders. It combines encrypted offline storage, owner-isolated Firebase synchronization, the vault-scoped Rhinous assistant, Telegram automation, a responsive premium interface, and installable PWA support.

No demo records are included. Every displayed record belongs to the currently selected and authenticated owner.

## Current feature set

### Home and interface

- Responsive layouts for mobile phones, tablets, laptops, and desktops.
- One consistent light theme with Rhino branding, professional Lucide icons, skeleton loading states, background sync indicators, confirmation dialogs, toasts, and small Rhino activity animations.
- Bottom mobile navigation and fixed desktop sidebar for Home, Memories, Rhinous, Reminders, Clipboard, and Birthdays.
- Hidden visual scrollbars, mobile zoom prevention, safe-area support, and strict horizontal-overflow containment.
- Global search across local titles, notes, field labels, and field values.
- Birthday search results are routed to Birthdays; reminders and clipboard results are routed to their own sections.

### Memories

- Create, view, edit, delete, copy, search, and securely import memories.
- Supported categories: Login, Finance, Identity, Government Document, Personal, Birthday, Wi-Fi, Clipboard, and Reminder.
- The Memories tab intentionally excludes birthdays and provides count-aware filters for All, Banks, Documents, Logins, Wi-Fi, and Personal records.
- Finance records containing a card number use a responsive payment-card design with masked/revealed values and field-level copy controls.
- Document records support document/reference numbers, issuing authority, issued/expiry dates, and HTTPS soft-copy links such as Google Drive links.
- Bulk import accepts 1–100 JSON memory objects, encrypts them in the browser, and synchronizes them without a page reload.
- Every edit and deletion requires confirmation.

### Clipboard Vault

- Capture the browser’s current text clipboard or manually paste/type content.
- Store a title/note and timestamp with each clipboard item.
- Copy, edit, delete, search, and retrieve clipboard items through Rhinous.
- Clipboard records remain isolated per Memoir owner.

### Birthdays

- Birthday records live only in the Birthday tab, not the Memories list.
- Records are ordered by the next upcoming month/day each year.
- Day and month are required; birth year is optional and is stored as `0000-MM-DD` when unknown.
- A known year shows the current age in years, months, and days plus the age on the next birthday.
- An unknown year shows `Age unavailable` without affecting birthday scheduling.
- Telegram birthday windows are two days, one day, five hours, two hours, and midnight.
- Rhinous can compose a birthday message using the selected birthday record without exposing unrelated private data.

### Smart reminders

- One-time and recurring daily, weekly, monthly, or yearly reminders.
- Telegram delivery windows: 1 day, 5 hours, 3 hours, 2 hours, 30 minutes, 10 minutes, and exactly at the due time.
- Windows that passed before a reminder was created are skipped automatically.
- Live countdowns update every second.
- Snooze/resume controls pause or restore future notifications.
- Telegram messages contain **Done** and **Snooze 30m** inline buttons.
- Completing a recurring occurrence advances the series to its next valid calendar occurrence.
- Owner-completed reminders appear green. After 12 hours without a response, an overdue non-recurring reminder is completed in red as `no-response`; later confirmation changes it to green.
- Atomic delivery reservations prevent duplicate Telegram notifications.

### Notification center

- Separates upcoming reminder/birthday deliveries from already-sent Telegram receipts.
- Displays only deliveries within the next 14 hours and receipts from the previous 14 hours.
- Sent receipts are encrypted vault records and are removed automatically after 14 hours.

### Rhinous assistant

- User-selectable Gemini or Mistral provider; individual model choice remains server-managed.
- Ordered model fallback temporarily cools down unavailable, overloaded, or rate-limited models and tries the next configured model.
- Vault-only scope guard rejects unrelated general trivia.
- Privacy-safe conversation history supports follow-ups such as “only the password,” “the other one,” or “edit that.”
- Exact field routing can return one requested field, selected fields, or every field in one matching record.
- Responses support sanitized Markdown, structured field tables, finance-card rendering, and a separate copy button for each returned value.
- Can propose one or many create/update/delete actions for memories and reminders.
- Every proposed mutation is reviewed and confirmed on the authenticated device before it changes Firebase.
- AI requests contain record IDs, titles, categories, field names, protected placeholders, and privacy-safe history—not stored secret values.

### Telegram

- Separate bot token, chat ID, webhook secret, secure mirror, action queue, and delivery namespace for every approved owner.
- Can retrieve non-sensitive notes, birthdays, and reminder information.
- Can queue one or many memory/reminder additions, edits, or deletions; the signed-in app reviews, encrypts, and synchronizes queued changes.
- Banking records, passwords, passcodes, PINs, CVVs, secrets, tokens, card/account numbers, and IFSC values are never returned through Telegram.
- Supports webhook delivery in production and long polling during local development when no webhook is configured.

### Offline and PWA behavior

- Installable web app with manifest, favicons, Apple touch icon, and maskable PWA artwork.
- Service worker caches only same-origin HTTP(S) GET shell/assets and ignores API and browser-extension requests.
- Encrypted IndexedDB cache opens previously synchronized records offline.
- An IndexedDB mutation queue stores offline creates, updates, and deletions and flushes them to Firestore when connectivity returns.
- Firebase uses persistent multi-tab caching and real-time listeners for background cross-device updates.

## Authentication and security model

1. The first visit shows the Memoir Rhino splash screen.
2. A server-validated four-digit vault number selects an approved owner; the number is not an authentication factor.
3. The owner signs in with the exact Firebase email/password account mapped to that UID.
4. Memoir sends a six-digit OTP to that owner’s isolated Telegram bot/chat.
5. A valid OTP creates a device-bound verified session for at most 12 hours.

Additional controls:

- Only the two explicitly approved UID/email pairs in `lib/users.js` and `firestore.rules` can access the application.
- Incorrect vault numbers are limited to three attempts, followed by a four-hour lock.
- OTPs expire after five minutes and are stored as keyed hashes, never plaintext.
- OTP requests require a two-minute cooldown. Three requests trigger a 12-hour request lock.
- Three incorrect OTP entries trigger a four-hour verification lock.
- Every account permits at most two active device sessions.
- On a third device, a correct OTP opens a takeover screen. Choosing **Login here and sign out both** atomically revokes both earlier sessions.
- Active devices revalidate their session in the background and return to sign-in after revocation.
- Manual logout deletes the verified server session and clears the local password gate.
- All protected API calls require the Firebase ID token plus Memoir’s persistent device identity headers.
- Common inspect/right-click shortcuts are blocked only as a casual deterrent. Browser developer tools cannot be reliably disabled; encryption, authentication, server-held secrets, and Firebase rules are the real boundary.

## Encryption and privacy boundaries

Memoir has two deliberately separate encrypted storage paths.

### Owner vault

- A random 256-bit AES-GCM master key encrypts each record in the browser.
- The master key is wrapped with an AES-GCM key derived from the owner’s Firebase password using PBKDF2-SHA-256.
- Firestore `users/{uid}/items/{itemId}` receives only encrypted payloads and sync metadata.
- Each owner has a separate IndexedDB database, key record, queue, Firebase collection, assistant log, and session namespace.

### Server automation mirror

- Telegram and scheduled reminders need server-side access while the browser is closed.
- The authenticated browser mirrors records to `secureVault/{uid}/items/{itemId}`.
- Mirror payloads are separately encrypted with AES-256-GCM using `VAULT_SERVER_KEY`.
- This mirror is isolated per UID and readable only by trusted server functions with Firebase Admin plus the server key.
- AI providers still receive only the redacted catalog and placeholders; decrypted mirror values are not sent to Gemini or Mistral.

Do not describe the server mirror as zero-knowledge or end-to-end encryption: a trusted server holding `VAULT_SERVER_KEY` can decrypt it for Telegram/reminder automation. The client-synced owner collection remains ciphertext-only.

## Architecture

```text
Browser / PWA
  ├─ IndexedDB: encrypted records, wrapped key, offline queue
  ├─ Firebase Auth: approved email/password identity
  ├─ Firestore users/{uid}: client-encrypted cross-device vault
  └─ Memoir APIs (Firebase token + device identity)
       ├─ Auth + Telegram OTP + two-device enforcement
       ├─ AI router: redacted catalog → Gemini or Mistral
       ├─ Secure server mirror: server-encrypted per UID
       ├─ Telegram webhook/polling + isolated action queues
       └─ Reminder sweep + atomic delivery receipts
```

## Local development

Requirements: Node.js 24 and pnpm.

1. Run `pnpm install`.
2. Copy `.env.example` to `.env.local`.
3. Add newly generated development credentials and secrets.
4. Run `pnpm dev`.
5. Open `http://localhost:5173`.

Vite serves the interface on port 5173 and proxies `/api/*` to the Express API on port 8787. The API uses Node watch mode, so backend edits reload automatically.

Useful commands:

- `pnpm dev` — run Vite and the local API.
- `pnpm check` — syntax-check the client, service worker, APIs, libraries, and local server.
- `pnpm build` — create the production Vite bundle in `dist/`.
- `pnpm preview` — preview the production UI bundle.
- `pnpm start` — run only the local Express API.

## Firebase setup

1. Enable **Authentication → Email/Password**.
2. Create the approved users and ensure their UIDs/emails exactly match `lib/users.js` and `firestore.rules`.
3. Create the default Cloud Firestore database.
4. Deploy the rules with `firebase deploy --only firestore:rules`.
5. Generate a Firebase Admin service-account key.
6. Store the complete single-line JSON or its Base64 encoding in `FIREBASE_SERVICE_ACCOUNT_JSON`.

`FIREBASE_SERVICE_ACCOUNT_FILE` is a local-development alternative and must not point to a local file on Vercel.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-only Gemini access |
| `MISTRAL_API_KEY` | Server-only Mistral access |
| `GEMINI_MODELS` | Ordered comma-separated Gemini fallback list |
| `MISTRAL_MODELS` | Ordered comma-separated Mistral fallback list |
| `TELEGRAM_AI_PROVIDER` | `gemini` or `mistral` for Telegram routing |
| `MAAZ_TELEGRAM_BOT_TOKEN` | Maaz-isolated bot token |
| `MAAZ_TELEGRAM_CHAT_ID` | Maaz-isolated allowed chat |
| `MAAZ_TELEGRAM_WEBHOOK_SECRET` | Maaz webhook signature secret |
| `DEEPTI_TELEGRAM_BOT_TOKEN` | Deepti-isolated bot token |
| `DEEPTI_TELEGRAM_CHAT_ID` | Deepti-isolated allowed chat |
| `DEEPTI_TELEGRAM_WEBHOOK_SECRET` | Deepti webhook signature secret |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin service-account JSON or Base64 |
| `FIREBASE_SERVICE_ACCOUNT_FILE` | Local-only service-account file path |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `VAULT_SERVER_KEY` | At least 24 characters; encrypts the automation mirror |
| `OTP_SECRET` | At least 24 characters; hashes OTPs and rate-limit identities |
| `CRON_SECRET` | Bearer secret protecting the scheduled reminder endpoint |
| `APP_TIMEZONE` | Server reminder timezone; currently `Asia/Calcutta` |
| `PORT` | Local API port; defaults to `8787` |

Never prefix server secrets with `VITE_`; Vite-prefixed variables are exposed to the browser bundle.

## Telegram setup

For each owner:

1. Create a separate Telegram bot and obtain its token.
2. Add the matching bot token, chat ID, and a newly generated webhook secret to Vercel.
3. Open the bot from the assigned Telegram account and tap **Start**.
4. Configure its webhook as `https://YOUR_DOMAIN/api/telegram`.
5. Pass the matching secret as Telegram’s `secret_token` and enable `message` plus `callback_query` updates.

Both bots use the same endpoint. The webhook secret and chat ID select the correct isolated UID; cross-user updates are ignored.

## Reminder scheduling

The authenticated browser calls the reminder engine while Memoir is open. Closed-browser delivery requires an external scheduler to call:

```text
GET https://YOUR_DOMAIN/api/reminders
Authorization: Bearer YOUR_CRON_SECRET
```

Vercel Hobby only permits daily native cron jobs, so `vercel.json` intentionally contains no `crons` block. Use a trusted external HTTPS scheduler for minute-level delivery. The endpoint rejects missing or incorrect secrets, and delivery records prevent duplicate messages.

## API routes

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/auth` | POST | Vault selection, OTP request/verify/status/revoke, rate limits, device sessions |
| `/api/assistant` | POST | Authenticated redacted Gemini/Mistral routing |
| `/api/sync` | POST | Authenticated server-mirror mutations and snapshots |
| `/api/telegram` | POST | Authenticated app actions or signed Telegram webhook updates |
| `/api/reminders` | POST | Run one authenticated owner’s reminder sweep |
| `/api/reminders` | GET | Run scheduled sweeps for all owners using `CRON_SECRET` |
| `/api/health` | GET | Basic runtime health; production supports secret-protected deep diagnostics |

## Firestore collections

- `users/{uid}` — owner metadata and wrapped client vault key.
- `users/{uid}/items/{itemId}` — client-encrypted records.
- `verifiedSessions/{uid}/sessions/{authTime}` — device-bound OTP sessions.
- `otpChallenges/{uid}/sessions/{authTime}` — hashed expiring OTP challenges.
- `authRateLimits/{uid}` — OTP request and verification limits.
- `accountCodeRateLimits/{fingerprint}` — vault-number attempt limits.
- `secureVault/{uid}/items/{itemId}` — separately encrypted automation mirror.
- `telegramActionQueue/{uid}/items/{queueId}` — encrypted Telegram/background mutations awaiting the app.
- `telegramMessageDeliveries/{uid}/items/{deliveryId}` — Telegram deduplication claims.
- `reminderDeliveries/{uid}/items/{deliveryId}` — reminder deduplication and receipts.
- `telegramLinks/{chatId}` — server-side chat-to-UID association.

Client Firestore rules deny direct access to every server-managed collection.

## Project structure

### Root configuration

- `.env.example` — environment-variable template containing no live credentials.
- `package.json` — Node 24 requirement, scripts, runtime dependencies, and development tools.
- `pnpm-lock.yaml` — reproducible dependency resolution.
- `pnpm-workspace.yaml` — pnpm workspace definition.
- `vite.config.js` — Vite build target, port 5173, and local `/api` proxy.
- `vercel.json` — Vite output, SPA rewrites, and production security headers.
- `firebase.json` — Firestore rules path and optional Firebase Hosting SPA configuration.
- `firestore.rules` — approved-owner, password-provider, 12-hour-session, and OTP-gated data access rules.
- `index.html` — viewport restrictions, PWA metadata, icons, and application mount point.
- `server.js` — local Express API, Telegram polling, 30-second local reminder sweep, and health response.
- `README.md` — current operational and architecture reference.

### Client

- `src/main.js` — interface rendering, navigation, search, category filters, editors, cards, assistant chat, reminders, birthdays, notifications, Telegram action application, and event handling.
- `src/store.js` — Firebase authentication, device identity, wrapped vault key, AES-GCM encryption, IndexedDB, offline queue, Firestore reconciliation/listeners, server mirror, and session lifecycle.
- `src/styles.css` — base design system, layout, components, forms, responsive rules, chat, cards, modals, and PWA interface styling.
- `src/brand.css` — authentication experience, Rhino branding, finance/document enhancements, loaders, notification/reminder visuals, and strict mobile containment fixes.

### Server APIs

- `api/auth.js` — owner selection, Telegram OTP, attempt locks, 12-hour sessions, and two-device takeover.
- `api/assistant.js` — vault-only system policy, redacted catalog, safe conversation history, JSON validation, action normalization, and Gemini/Mistral fallback.
- `api/sync.js` — per-owner encrypted automation mirror and runtime cache synchronization.
- `api/telegram.js` — signed per-owner webhooks, local polling, safe retrieval, queued AI actions, and Done/Snooze callbacks.
- `api/reminders.js` — recurrence, delivery windows, no-response completion, Telegram buttons, and atomic deduplication.
- `api/health.js` — Vercel runtime, Firebase Admin, approved-user, bot, and chat diagnostics.

### Server libraries

- `lib/firebaseAdmin.js` — Admin SDK initialization, service-account parsing, token validation, device hashing, and verified-session checks.
- `lib/users.js` — approved owner definitions and isolated Telegram environment mapping.
- `lib/serverCrypto.js` — AES-256-GCM encryption/decryption for the server automation mirror.
- `lib/runtimeVault.js` — process-local owner vaults, queued actions, and delivery state.
- `lib/telegramClient.js` — Telegram Bot API request helper and profile resolution.

### PWA and brand assets

- `public/sw.js` — safe network-first service worker with same-origin shell caching.
- `public/manifest.webmanifest` — standalone PWA identity, colors, and icons.
- `public/404.html` — deployment fallback page.
- `public/brand/memoir-rhino-dark-transparent.png` — high-resolution transparent Rhino master.
- `public/brand/memoir-rhino-ui.png` — optimized transparent in-app Rhino.
- `public/brand/memoir-app-icon.png` — high-resolution app-icon master.
- `public/brand/favicon-32.png` — browser favicon.
- `public/brand/apple-touch-icon.png` — Apple home-screen icon.
- `public/brand/pwa-192.png` and `public/brand/pwa-512.png` — installable PWA icons.

## Deployment

1. Add every required environment variable to Vercel Production, Preview, and Development as appropriate.
2. Keep secrets server-only and generate a different random value for every webhook, OTP, cron, and vault key.
3. Run `pnpm check` and `pnpm build`.
4. Push `main` or deploy through Vercel.
5. Deploy the matching Firestore rules.
6. Configure both Telegram webhooks.
7. Configure the external reminder scheduler.
8. Check `/api/health`, then use the protected deep health check when diagnosing Firebase or Telegram configuration.

## Current operational constraints

- General reminder delivery can run while the app is closed through the protected scheduler endpoint. Birthday delivery is currently browser-driven and requires a signed-in Memoir page to be active near the delivery window.
- First-time vault-key setup or password-based key recovery requires an internet connection.
- Clipboard capture is limited by browser permission and reads only the current clipboard value; a PWA cannot access iPhone’s historic system clipboard automatically.
- Telegram/background features require the server-encrypted automation mirror. Without Firebase Admin plus `VAULT_SERVER_KEY`, the browser vault still works but closed-browser automation does not.
- Vercel serverless runtime memory is not persistent; Firestore is the durable source for mirror records, queued actions, sessions, and delivery claims.

## Credential safety

- Revoke and replace every API key, service-account private key, Telegram token, webhook secret, or password that has ever been pasted into a chat, screenshot, terminal log, or commit.
- `.env.local` is ignored by Git, but that does not undo disclosure elsewhere.
- Never commit a Firebase service-account JSON file.
- Use newly generated values in Vercel and local development rather than reusing personal passwords.

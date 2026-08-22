# Memoir — Encrypted Personal Vault & Autonomous Chief of Staff

Memoir is a mobile-first, local-first personal memory vault for credentials, banking records, government documents, warranties, personal notes, clipboard history, birthdays, voice memos, and smart reminders. It combines encrypted offline storage, owner-isolated Firebase synchronization, the vault-scoped **Rhinous** assistant, on-device multimodal capture (multi-image & local PDF parsing), an autonomous Telegram Chief of Staff, and installable PWA support.

No demo records are included. Every displayed record belongs to the currently selected and authenticated owner.

---

## 🌟 Major Highlights & New Features

### 1. 🖼️ Multi-Image & Multi-Document AI Capture (Up to 5 Files)
- **Multi-File Selection**: Capture via camera or upload up to **5 images, invoices, warranty cards, or PDFs** in a single submission.
- **Interactive Preview Chips**: Selected files appear as thumbnail chips above the chat input with filenames and individual **`[X]` removal buttons** to discard specific files before sending.
- **Custom User Guidance**: Add custom instructions (e.g., *"Extract all 3 grocery bills and the AC warranty card"*, *"Organize these into my finance vault"*) or leave blank for automatic Smart Capture.
- **Dual AI Vision Engine**: Powered by Google Gemini and Mistral Pixtral Vision (`pixtral-12b-2409` & `pixtral-large-latest`) with automatic bidirectional fallback.

### 2. ⚡ Client-Side Local PDF & Document Text Extractor
- **Zero AI Extraction Cost**: Uses browser-native stream decompression (`DecompressionStream('deflate')` / `DecompressionStream('deflate-raw')`) and PDF stream block parsing (`BT...ET`, `Tj`, `TJ`) to extract raw text **100% on the local machine**.
- **100% Private & Instant**: Text extraction runs in milliseconds on device without uploading binary PDFs to external OCR services.
- **Pristine AI Structuring**: The extracted text is provided directly to Rhinous to structure invoice numbers, GSTINs, amounts in ₹, purchase dates, and warranty validity with zero OCR errors or hallucinations.

### 3. 🤖 Autonomous Chief of Staff (Morning & Evening Briefings)
- **Morning Briefing (10:00 AM IST)**:
  - Personalized daily summary sent directly to your Telegram bot.
  - Formats today's scheduled reminders, pending to-do lists, upcoming birthdays, and expiring cards/warranties.
- **Evening Daily Review (9:30 PM IST)**:
  - Reflection check-in asking how your day went.
  - Interactive 1-tap Telegram buttons: `[Done]`, `[Tomorrow 10 AM]`, `[Dismiss]`.
- **Instant On-Demand Telegram Commands**:
  - `/briefing` or `/today` — Trigger today's morning or evening briefing anytime.
  - `/reminders` or `/tasks` — View all active reminders and pending tasks.
  - `/test` or `/ping` — Diagnostic connectivity check confirming bot status, owner UID, and `Asia/Calcutta` timezone.
  - `/start` and `/help` — View interactive usage instructions.
- **App-Closed Cloud Delivery**: A `cron-job.org` heartbeat calls the secured server sweep every five minutes. It works independently of the browser/PWA and covers reminders, birthdays, expiry alerts, and both Chief of Staff briefings.
- **Vercel Hobby Backups**: Two once-daily Vercel cron jobs provide redundant morning and evening briefing delivery without requiring Vercel Pro. Browser sweeps remain only an extra fast-path while Memoir is open.

### 4. 🧠 Intelligent Vault Assistant (Rhinous)
- **Complete Credential & Field Resolution**: When asking for passwords, Wi-Fi keys, or birthdays, Rhinous retrieves the exact, complete record fields (e.g. `Date: August 22, 1995 (1995-08-22)`, `Network`, `Password`) directly to the authenticated owner.
- **Temporal Calendar Awareness**: Understands user local time (`Asia/Calcutta`), day-of-week context, and handles recurring reminders naturally.
- **Redacted Privacy Catalog**: The AI model only receives anonymized title/type metadata; sensitive payload decryption occurs exclusively on device.

---

## 📱 Complete Feature Set

### Home & Core Interface
- Responsive mobile-first layout optimized for phones, tablets, laptops, and desktops.
- Modern theme with Memoir branding, sharp Lucide vector icons, skeleton loaders, sync indicators, and micro-interactions.
- **Consolidated Navigation**:
  - **Home**: Quick stats, Expiring Soon dashboard, and recent activity.
  - **Memories**: Encrypted cards, credentials, notes, documents, and finance.
  - **Rhinous**: Multimodal AI chat assistant with multi-image & audio support.
  - **Planner**: To-do Lists and Reminders.
  - **Capture**: Voice Audio memo recorder and Clipboard Vault.
  - **Birthdays**: Dedicated birthday tracker and wish generator.
- **Expiring Soon Dashboard**: High-priority alert banner for banking cards, IDs, and appliance warranties expiring within 5 months.
- **Global Instant Search**: Search across titles, notes, field labels, and values in real time.

### Voice Memo & Audio Vault
- **In-App Voice Recording**: Client-side recording with `MediaRecorder` and live speech-to-text transcript preview.
- **AES-256-GCM Encrypted Storage**: Audio is chunked and stored in Firestore under `secureAudio` per owner.
- **Dedicated Audio Tab**: HTML5 audio player with transcription retry support, edit capabilities, and reminder linking.
- **Telegram Voice Note Ingestion**: Voice messages sent to Telegram are automatically downloaded, encrypted, transcribed, and added to your Audio tab.

### To-do Lists & Thermal Receipts
- Encrypted To-do workspace with subtasks, check/uncheck states, and optional INR amounts.
- **Paper-Style Thermal Receipt Generator**: Renders printable branded receipt images locally in the browser with Rhino watermark and printer-feed animation.
- Share receipts via image copy, download, or native OS share sheet.

### Expiry Tracking & Multi-Stage Alerts
- **Validity Chips**: Live calculations (`4 yr 11 mo left`, `2 mo left`).
- **5-Month Warning Window**: Critical alerts displayed prominently on the dashboard.
- **Multi-Stage Sweep**: Telegram notifications at 5 mo, 4 mo, 3 mo, 2 mo, 1 mo, 10 days, 5 days, 2 days, and 1 day before expiry.

### Selective Secure Sharing
- **Field-Level Granularity**: Share specific details (e.g. Bank Account & IFSC) while keeping passwords, PINs, and CVVs guarded.
- **Attachment Inclusion**: Toggle whether to include decrypted images or PDF documents in the share payload.
- **One-Tap Channels**: Forward directly to WhatsApp, Telegram, Gmail, Instagram Direct, or clipboard.

### Clipboard Vault
- Fast text clipboard capture for temporary notes, code snippets, and addresses.
- Isolated per user profile with full AI search and edit support.

### Birthdays & Wishes
- Ordered timeline by upcoming month and day with calculated age.
- 5-stage automated Telegram reminders (2 days, 1 day, 5 hours, 2 hours, midnight).
- Personalized wish generator powered by Rhinous.

---

## 🔒 Architecture & Security Model

```text
Browser / PWA (Client)
  ├── IndexedDB: Local AES-GCM encrypted records, wrapped keys, offline queue
  ├── Firebase Auth: Email/password authentication with device binding
  ├── Native Stream Decompressor: Client-side local PDF text extraction
  └── Memoir Server APIs (Vercel / Node.js)
        ├── /api/auth: Device sessions, Telegram OTP challenge/verify
        ├── /api/assistant: Redacted routing, Gemini 2.5 & Mistral Pixtral Vision
        ├── /api/telegram: Webhook, photo OCR, voice download, inline callbacks
        ├── /api/reminders: secured cloud sweep for reminders, birthdays, expiry alerts, and briefings
        ├── /api/audio: Encrypted chunked audio upload and streaming
        └── /api/sync: AES-256-GCM server automation mirror
```

Authentication challenges, rate limits, and device sessions use an encrypted server-only Realtime Database record. This keeps Telegram OTP available when Firestore reaches its daily quota. Verified sessions are also mirrored to Firestore when it is healthy so client security rules remain enforced.

### Encryption Layers
1. **Client-Side Master Vault (AES-GCM 256-bit)**:
   - Key derived client-side via PBKDF2-SHA-256 with 100,000 iterations.
   - Firestore `users/{uid}/items` receives only encrypted ciphertexts.
2. **Server Automation Mirror (AES-256-GCM)**:
   - Stored in `secureVault/{uid}/items` encrypted with `VAULT_SERVER_KEY`.
   - Enables headless Telegram bot replies, voice processing, and reminder sweeps when the browser is closed.

---

## 🛠️ Local Development

### Prerequisites
- Node.js 22+
- npm or pnpm

### Setup
1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/maazmohammed112/memoir.git
   cd memoir
   npm install
   ```

2. Configure environment variables in `.env.local`:
   ```ini
   # Firebase
   FIREBASE_API_KEY=...
   FIREBASE_AUTH_DOMAIN=...
   FIREBASE_PROJECT_ID=...
   FIREBASE_DATABASE_URL=https://YOUR_PROJECT-default-rtdb.firebaseio.com
   FIREBASE_SERVICE_ACCOUNT_JSON=...

   # AI Providers
   GEMINI_API_KEY=...
   MISTRAL_API_KEY=...

   # Telegram Bot (User 1 - Maaz)
   MAAZ_TELEGRAM_BOT_TOKEN=...
   MAAZ_TELEGRAM_CHAT_ID=...

   # Telegram Bot (User 2 - Deepti)
   DEEPTI_TELEGRAM_BOT_TOKEN=...
   DEEPTI_TELEGRAM_CHAT_ID=...

   # Security & Timezone
   VAULT_SERVER_KEY=...
   CRON_SECRET=use-a-random-value-at-least-16-characters-long
   SCHEDULER_GRACE_MINUTES=20
   APP_TIMEZONE=Asia/Calcutta
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Verify syntax and production build:
   ```bash
   npm run check
   npm run build
   ```

---

## App-Closed Telegram Automation

Memoir uses three cooperating triggers. All of them call the same idempotent server sweep, so Firestore delivery claims prevent duplicate Telegram messages even when two triggers overlap.

1. **cron-job.org heartbeat — primary**
   - A free external HTTPS job calls `/api/reminders` every five minutes without opening Memoir.
   - It refreshes each approved owner from the encrypted `secureVault/{uid}/items` mirror before evaluating anything.
   - It covers normal/recurring reminders, five-stage birthday alerts, expiry alerts, overdue automation, the 10:00 AM briefing, and the 9:30 PM review.
2. **Vercel Hobby cron — briefing backup**
   - `/api/reminders-morning` runs once daily in Vercel's `05:00 UTC` execution hour, which falls inside Memoir's morning delivery window in India.
   - `/api/reminders-evening` runs once daily in the `16:00 UTC` execution hour, which falls inside the evening delivery window.
   - These are backups because Vercel Hobby permits daily schedules but only offers hourly timing precision.
3. **Signed-in browser sweep — optional fast-path**
   - When Memoir is already open, the app can request the same owner-scoped sweep immediately.
   - Closing the tab or phone does not stop the cron-job.org/Vercel cloud triggers.

### One-time cron-job.org setup

Create one job at [cron-job.org](https://cron-job.org/) with these exact settings:

- **Title**: `Memoir Telegram heartbeat`
- **URL**: `https://memoir-vert.vercel.app/api/reminders`
- **Enabled**: Yes
- **Schedule**: Every 5 minutes
- **Request method**: `GET`
- **Custom header name**: `Authorization`
- **Custom header value**: `Bearer YOUR_CRON_SECRET` — replace `YOUR_CRON_SECRET` with the exact value configured as `CRON_SECRET` in Vercel Production.
- **Request timeout**: 30 seconds
- **Save response body**: Off, if the console offers this option
- **Failure notification**: On

Use cron-job.org's **Test run** button once after saving. A successful invocation returns HTTP `200` and a compact JSON result containing counts only; it never returns vault contents or the secret. HTTP `403` means the two `CRON_SECRET` values do not match. Do not place the secret in the URL query string.

The custom authorization value is stored by the scheduler because it must send it on every request. Use a dedicated random scheduler secret (at least 16 characters), keep response-body history disabled, and rotate the same value in both Vercel and cron-job.org if it is ever exposed.

### Required production data path

Headless automation reads the server-encrypted mirror, not browser IndexedDB. `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_PROJECT_ID`, and `VAULT_SERVER_KEY` must therefore be configured in Vercel Production, and the app must successfully mirror each saved update to `secureVault/{uid}/items`. Every scheduled sweep now refreshes that collection instead of trusting a possibly stale warm-function cache.

---

## 📡 API Reference

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/auth` | POST | Vault user profile selection, Telegram OTP auth, device sessions |
| `/api/assistant` | POST | Redacted AI assistant, multi-image vision OCR, local PDF text ingestion |
| `/api/telegram` | POST | Telegram webhook for photos, voice notes, `/briefing`, `/reminders`, `/test` |
| `/api/reminders` | GET / POST | Secured cron-job.org heartbeat, Vercel, and owner-triggered reminder/birthday/expiry/briefing sweep |
| `/api/reminders-morning` | GET | Vercel Hobby morning briefing backup |
| `/api/reminders-evening` | GET | Vercel Hobby evening review backup |
| `/api/audio` | GET / POST / DELETE | Encrypted audio streaming, chunked upload, and cleanup |
| `/api/sync` | POST | Encrypted server-mirror mutation and snapshot synchronization |
| `/api/alexa` | POST | Secure Alexa bridge for voice lookups |
| `/api/health` | GET | Health and diagnostic check |

---

## 📁 Database Schema (Firestore)

- `users/{uid}/items/{itemId}` — Client-side encrypted vault records.
- `secureVault/{uid}/items/{itemId}` — Server-encrypted automation mirror.
- `secureAudio/{uid}/items/{audioId}` — Encrypted audio metadata with `chunks` subcollection.
- `verifiedSessions/{uid}/sessions/{authTime}` — Firestore mirror of active bound device sessions for client security rules.
- `telegramActionQueue/{uid}/items/{queueId}` — Action queue for mutations originating from Telegram.
- `reminderDeliveries/{uid}/items/{deliveryId}` — Atomic delivery and deduplication keys.

### Realtime Database (server-only)

- `serverAuth/{uid}` — AES-256-GCM encrypted OTP challenge, request/verification limits, and device-session state. Deploy `database.rules.json` so browser clients cannot read or write this path; Firebase Admin continues to access it from server APIs.

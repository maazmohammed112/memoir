# Memoir — encrypted personal vault

Memoir is a mobile-first, local-first personal memory vault for credentials, banking records, documents, warranties, personal notes, clipboard history, birthdays, voice memos, and reminders. It combines encrypted offline storage, owner-isolated Firebase synchronization, the vault-scoped Rhinous assistant, multimodal smart capture (vision & audio), Telegram automation, a responsive premium interface, and installable PWA support.

No demo records are included. Every displayed record belongs to the currently selected and authenticated owner.

---

## Current feature set

### Home and interface

- Responsive layouts for mobile phones, tablets, laptops, and desktops.
- Modern theme with Memoir branding, sharp Lucide vector icons, skeleton loading states, background sync indicators, confirmation dialogs, toasts, and activity animations.
- Bottom mobile navigation and fixed desktop sidebar for Home, Memories, Rhinous, Reminders, Clipboard, and Birthdays.
- **Expiring Soon Dashboard**: High-priority section on Home view alerting the owner about banking cards, IDs, and appliance warranties expiring within 5 months.
- Global search across local titles, notes, field labels, and field values.
- Birthday search results are routed to Birthdays; reminders and clipboard results are routed to their own sections.

### Smart Multimodal Capture Agent (Vision & Voice)

- **Camera Snap & OCR**: Snap or upload photos of warranty cards, electronics receipts, invoices, or identity documents directly into Rhinous chat.
- **On-Device Image Compression**: High-resolution photos are compressed client-side to optimal sizes before encryption and processing.
- **Dual AI Vision Engine**: Powered by Google Gemini and Mistral Pixtral Vision (`pixtral-12b-2409` & `pixtral-large-latest`) with automatic bidirectional fallback if one provider is throttled or offline.
- **Field Extraction**: Automatically extracts Brand, Model, Serial Number, Purchase Date, Expiry/Validity Date, Warranty Period, and Support contacts.
- **Voice Memo Dictation & Audio Storage**:
  - Live microphone speech transcription in chat with browser permission handling and media stream management.
  - Full audio binary/base64 is preserved and permanently saved into the memory record in Firestore.
  - Interactive HTML5 `<audio controls>` player in the memory detail view allowing owners to replay the original voice note anytime.
  - Fallback audio file picker for devices with restrictive OS-level microphone permissions.

### Telegram Voice & Photo Bot

- **Photo Ingestion**: Send photos of receipts, warranty cards, or bills to your isolated Telegram bot to extract structured vault records automatically.
- **Voice Note Capture**: Send voice notes dictating reminders (e.g. *"Remind me about laptop repair tomorrow at 4 PM"*) or memories.
- **Voice Audio Persistence**: Telegram voice audio is downloaded, encrypted, and attached to the created vault action as `Audio Recording` alongside the transcript.
- **Done & Snooze Callbacks**: Inline buttons to complete or snooze reminders directly from Telegram.

### Expiry Tracking & Automated Alerts

- **Validity Chips**: Cards, warranties, and identity documents calculate live remaining time (`4 yr 11 mo left`, `2 mo left`).
- **5-Month Critical Window**: Records expiring in under 5 months display high-visibility `ShieldAlert` badges and appear on the Home dashboard.
- **Multi-Stage Telegram Reminder Sweep**: Sends automated Telegram alerts at 5 months, 4 months, 3 months, 2 months, 1 month, 10 days, 5 days, 2 days, and 1 day before expiry.

### Selective Secure Sharing

- **Field-Level Sharing**: Share specific memory fields (e.g., Bank Name, Account Number, IFSC) without exposing passwords, ATM PINs, or CVVs.
- **Sensitive Guard**: Secret fields are filtered and hidden by default with prominent caution banners.
- **Light Monospace Preview**: Real-time monospace preview box showing the exact formatted text before sharing.
- **One-Tap Integrations**: Direct forwarding to **WhatsApp**, **Telegram**, **Gmail**, **Instagram Direct**, and the native OS Share Sheet.

### Memories & Finance

- Create, view, edit, delete, copy, search, and securely import memories.
- Supported categories: Login, Finance, Identity, Government Document, Personal, Birthday, Wi-Fi, Clipboard, and Reminder.
- Finance records containing card numbers render responsive payment cards with masked/revealed toggles and field copy buttons.
- Document records support document numbers, issuing authority, validity dates, soft-copy drive links, and attached voice recordings.
- Bulk import accepts 1–100 JSON memory objects and encrypts them client-side without page reload.

### Smart Reminders & Temporal Intelligence

- One-time and recurring daily, weekly, monthly, or yearly reminders.
- **Temporal Context Awareness**: Rhinous analyzes the current date, time, and upcoming calendar days to schedule accurate dates.
  - If a daily or weekly reminder time has already passed today (e.g., *"every Friday at 11 AM"* when it is currently 2 PM on Friday), Rhinous automatically sets `Due at` to the upcoming Friday.
- Telegram notification schedule: 1 day, 5 hours, 3 hours, 2 hours, 30 minutes, 10 minutes, and exactly at the due time.
- Atomic delivery deduplication prevents duplicate notifications.

### Clipboard Vault

- Capture text clipboard or type notes directly.
- Full search, copy, edit, delete, and AI retrieval for saved clips.
- Isolated per Memoir owner.

### Birthdays

- Dedicated Birthday timeline ordered by the next upcoming month/day.
- Supports optional birth year with exact age calculations (`Age unavailable` if omitted).
- Automatic 5-stage Telegram reminders: 2 days, 1 day, 5 hours, 2 hours, and midnight.
- Rhinous can compose personalized birthday wishes based on saved notes and tone.

---

## Architecture & Security Model

```text
Browser / PWA
  ├─ IndexedDB: client-encrypted records, wrapped key, offline queue
  ├─ Firebase Auth: approved email/password identity
  ├─ Firestore users/{uid}: client-encrypted cross-device vault
  └─ Memoir APIs (Firebase ID token + device identity headers)
       ├─ Auth + Telegram OTP + two-device session enforcement
       ├─ Multimodal AI Router: Redacted catalog + Gemini / Mistral Pixtral
       ├─ Secure Server Mirror: AES-256-GCM encrypted per UID
       ├─ Telegram Webhook / Polling: Photo, voice note, and text ingestion
       └─ Reminder & Expiry Sweep: Multi-stage automated deliveries
```

### Encryption Boundaries

1. **Owner Vault (Client-Side AES-GCM)**:
   - 256-bit AES-GCM master key derived via PBKDF2-SHA-256.
   - Firestore `users/{uid}/items` receives only ciphertext payloads.
2. **Server Automation Mirror (Server-Side AES-256-GCM)**:
   - Synchronized to `secureVault/{uid}/items` encrypted with `VAULT_SERVER_KEY`.
   - Used for closed-browser Telegram ingestion, voice note processing, and automated reminder sweeps.

---

## Local Development

Requirements: Node.js 22+ and pnpm / npm.

1. Clone repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and add credentials.
3. Start development server:
   ```bash
   npm run dev
   ```
4. Build and syntax check:
   ```bash
   npm run check
   npm run build
   ```

---

## API Endpoints

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/auth` | POST | Vault selection, Telegram OTP request/verify/status/revoke, device sessions |
| `/api/assistant` | POST | Redacted AI routing, document OCR, voice note transcription (Gemini / Mistral) |
| `/api/sync` | POST | Encrypted server-mirror mutations and snapshots |
| `/api/telegram` | POST | Telegram webhook for photos, voice notes, text commands, and callback queries |
| `/api/reminders` | POST / GET | On-demand and scheduled reminder / card expiry sweeps |
| `/api/health` | GET | Runtime health and diagnostic checks |

---

## Firestore Collections

- `users/{uid}/items/{itemId}` — Client-encrypted vault records.
- `secureVault/{uid}/items/{itemId}` — Server-encrypted automation mirror.
- `verifiedSessions/{uid}/sessions/{authTime}` — Device-bound active sessions.
- `otpChallenges/{uid}/sessions/{authTime}` — Hashed expiring OTP challenges.
- `authRateLimits/{uid}` — OTP request and verification security rate limits.
- `accountCodeRateLimits/{fingerprint}` — Four-digit vault code attempt limits.
- `telegramActionQueue/{uid}/items/{queueId}` — Encrypted actions queued via Telegram.
- `reminderDeliveries/{uid}/items/{deliveryId}` — Reminder deduplication records.


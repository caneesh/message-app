# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A two-user private messaging web app: React 18 + Vite frontend, Firebase Authentication (phone/SMS) for sign-in, Cloud Firestore for message storage, Firebase Hosting for deploy. The app is hardcoded to a *single* chat document whose two members are provisioned out-of-band by an admin script — there is no group chat, no chat list, no user discovery.

There is no test suite and no linter configured. `npm run build` is the only "check" available.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run create-chat` | Run the admin script (`scripts/createPrivateChat.js`) to create/update the single chat doc using Firebase Admin SDK |
| `firebase deploy --only firestore:rules` | Push `firestore.rules` |
| `firebase deploy --only hosting` | Deploy `dist/` to Firebase Hosting |

The admin script reads `.env.admin` (loaded via `dotenv`) and requires a `serviceAccountKey.json`. The frontend reads `.env` (Vite `VITE_*` vars). Both files are gitignored along with `serviceAccountKey.json`.

## Architecture

### Two execution contexts
1. **Browser (Vite/React)** — uses the client `firebase` SDK. Entry: `src/main.jsx` → `App.jsx` → `AuthProvider` → `AppLayout`. Configured via `src/firebase/firebaseConfig.js`, which validates `VITE_FIREBASE_*` env vars at module load and throws if any are missing.
2. **Node admin script** — `scripts/createPrivateChat.js` uses `firebase-admin`. It is the *only* code path allowed to create or modify chat documents; Firestore rules deny `create/update/delete` on `chats/{chatId}` from the client (see `firestore.rules`).

### Auth flow
`src/auth/AuthContext.jsx` owns all auth state. Phone sign-in uses `signInWithPhoneNumber` + an invisible `RecaptchaVerifier` bound to the DOM element `#recaptcha-container`, which is rendered inside `Login.jsx`. The verifier is stored in a ref and cleared on error so it can be recreated. `confirmationResult` is held in component state across the two-step flow (send code → verify code). Phone numbers must be E.164 (`+13125551234`).

### Routing / gating
There is no router. `AppLayout` switches between `<Login />` and `<ChatPage />` based on `currentUser` from `AuthContext`. `ChatPage` short-circuits to a config error if `VITE_PRIVATE_CHAT_ID` is unset.

### Firestore data model
- `chats/{chatId}` — fields: `members: string[]` (exactly two UIDs), `createdAt`, `updatedAt`. Created by the admin script only.
- `chats/{chatId}/messages/{messageId}` — fields: `senderId`, `text`, `createdAt`, `senderPhone`. Created by clients via `addDoc`; never updated or deleted.

`MessageList` subscribes with `onSnapshot` over `orderBy('createdAt', 'asc')`. `MessageInput` writes with `serverTimestamp()` and trims to 2000 chars client-side.

### Security rules (`firestore.rules`)
The rules are the source of truth for the data contract — keep them in sync with any schema change:
- Read on `chats/{chatId}` and its `messages` subcollection requires `request.auth.uid` to be in that chat's `members` array (resolved via `get()`).
- Message `create` requires: `senderId == request.auth.uid`, `text` is a non-empty string ≤ 2000 chars, and the doc has *only* the keys `senderId, text, createdAt, senderPhone`. Adding a new field anywhere requires updating `hasOnlyAllowedFields()` or it will be rejected at write time.
- `update` and `delete` are denied for messages; chat docs are write-denied entirely from the client.

### Environment variables
Two separate files, distinct purposes:
- `.env` (frontend, `VITE_*` prefix required for Vite to expose them): the six Firebase web config values plus `VITE_PRIVATE_CHAT_ID`. Validated in `firebaseConfig.js`.
- `.env.admin` (Node admin script): `GOOGLE_APPLICATION_CREDENTIALS` (path to service account JSON), `PRIVATE_CHAT_ID`, `USER_ID_1`, `USER_ID_2`. Validated at the top of `createPrivateChat.js`.

`VITE_PRIVATE_CHAT_ID` and `PRIVATE_CHAT_ID` must match — that's the link between the two configs.

### Hosting / SPA rewrite
`firebase.json` rewrites all paths to `/index.html` (SPA fallback) and serves from `dist/`. The build output directory is fixed by Vite defaults; no custom `vite.config.js` build config.

## Working in this codebase

- When changing the message schema, update **all three** of: `MessageInput.jsx` (write shape), `MessageList.jsx` (read shape), and `firestore.rules` `hasOnlyAllowedFields()` / `isValidMessage()`. Forgetting the rule produces a silent `permission-denied` at runtime.
- The recaptcha container ID `recaptcha-container` is referenced as a string in `AuthContext.jsx` and as a DOM element in `Login.jsx`. If you change the ID, change both.
- Onboarding new members to the existing chat is not a frontend concern — it requires re-running `npm run create-chat` with new `USER_ID_*` values. The frontend has no UI for this.
- There is no client-side encryption; messages are stored in plaintext in Firestore (called out explicitly in README).

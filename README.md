# Message App

A private shared space for two people to communicate, remember, plan, and care for each other. Built with React, Vite, and Firebase.

## Overview

More than just a chat app - this is a complete private space for couples, close friends, or family members to:
- Chat in real-time with rich features
- Track shared reminders with accountability
- Record important decisions
- Store memories together
- Manage shared lists and events
- Keep important information in a vault

## Tech Stack

- **Frontend:** React 18, Vite
- **Backend:** Firebase (Authentication, Firestore, Storage, Cloud Functions, Cloud Messaging)
- **Hosting:** Firebase Hosting

## Features

### Chat
- Real-time messaging
- Reply to messages
- Edit and delete messages
- Message reactions (emoji)
- Pin important messages
- Typing indicators
- Read receipts
- Photo and file sharing (up to 5MB)
- Quick status buttons (Reached safely, On the way, Call me, etc.)
- Search messages

### Dashboard
- Today's overview at a glance
- Overdue and due-today reminders
- Upcoming events
- Recent check-ins
- Active decisions

### Reminders
- Shared reminders with due dates
- Assign to yourself or partner
- Priority levels (low, normal, high)
- Track who completed what

### Decisions
- Record important decisions
- Track status (active, changed, cancelled)
- Add reasoning/context
- Link to source messages

### Memories
- Save meaningful moments
- Add descriptions and dates
- Link photos from chat

### Lists
- Shared lists (groceries, packing, etc.)
- Check off items
- Track who completed what

### Events
- Shared calendar events
- Categorize by type (appointment, travel, birthday, etc.)
- Set date and time

### Vault
- Store important information
- Categories: emergency, health, home, travel, school, finance
- Search and filter
- Note: Not for passwords or highly sensitive data

### Check-in
- Daily mood/status check-in
- See how your partner is feeling
- Optional notes

### Other Features
- Dark mode
- Push notifications
- Device management
- PIN lock screen
- Auto-delete old messages (configurable)
- Convert messages to reminders/decisions/memories

## Project Structure

```
src/
  firebase/       # Firebase configuration
  auth/           # Authentication components
  chat/           # Chat and feature components
    ChatPage.jsx
    MessageList.jsx
    MessageInput.jsx
    Dashboard.jsx
    Reminders.jsx
    Decisions.jsx
    Vault.jsx
    Memories.jsx
    Events.jsx
    Lists.jsx
    Notes.jsx
    CheckIn.jsx
    Settings.jsx
    Devices.jsx
  layout/         # Layout components
  App.jsx         # Main app component
  main.jsx        # Entry point
  styles.css      # Global styles
functions/        # Cloud Functions
public/           # Static assets and service worker
scripts/          # Admin scripts
```

## Setup

### 1. Install Dependencies

```bash
npm install
cd functions && npm install && cd ..
```

### 2. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the wizard
3. Add a web app and copy the config values

### 3. Enable Authentication

1. Go to **Authentication** > **Sign-in method**
2. Enable **Phone** authentication
3. (Optional) Add test phone numbers for development

### 4. Create Firestore Database

1. Go to **Firestore Database** > **Create database**
2. Start in test mode, select a region
3. Click **Enable**

### 5. Enable Storage

1. Go to **Storage** > **Get started**
2. Start in test mode
3. Select a region and click **Done**

### 6. Set Up Cloud Messaging (Push Notifications)

1. Go to **Project Settings** > **Cloud Messaging**
2. Under "Web Push certificates", click **Generate key pair**
3. Copy the VAPID key for your `.env` file

### 7. Create Users and Private Chat

#### Create Two Users
1. Run the app with `npm run dev`
2. Sign in with two different phone numbers
3. Note both UIDs from Firebase Console > Authentication > Users

#### Download Service Account Key
1. Go to **Project Settings** > **Service accounts**
2. Click **Generate new private key**
3. Save as `serviceAccountKey.json` in project root
4. **Never commit this file**

#### Configure Admin Environment
```bash
cp .env.admin.example .env.admin
```

Edit `.env.admin`:
```
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
PRIVATE_CHAT_ID=private-chat-001
USER_ID_1=uid_of_first_user
USER_ID_2=uid_of_second_user
```

#### Run Setup Script
```bash
npm run create-chat
```

### 8. Configure Frontend Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_PRIVATE_CHAT_ID=private-chat-001
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

### 9. Deploy Security Rules and Indexes

```bash
firebase deploy --only firestore,storage
```

### 10. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

### 11. Run Development Server

```bash
npm run dev
```

## Deployment

### Full Deployment
```bash
npm run build
firebase deploy
```

### Partial Deployment
```bash
firebase deploy --only hosting          # Frontend only
firebase deploy --only firestore        # Rules and indexes
firebase deploy --only storage          # Storage rules
firebase deploy --only functions        # Cloud Functions
```

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run create-chat` | Create private chat (admin) |
| `firebase deploy` | Deploy everything |
| `firebase deploy --only hosting` | Deploy frontend |
| `firebase deploy --only firestore` | Deploy Firestore rules/indexes |
| `firebase deploy --only functions` | Deploy Cloud Functions |

## Environment Variables

### Frontend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `VITE_PRIVATE_CHAT_ID` | Yes | ID of the private chat |
| `VITE_FIREBASE_VAPID_KEY` | No | For push notifications |

### Admin (.env.admin)

| Variable | Description |
|----------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON |
| `PRIVATE_CHAT_ID` | ID for the chat to create |
| `USER_ID_1` | First user's Firebase UID |
| `USER_ID_2` | Second user's Firebase UID |

## Security

### What's Protected
- Only the two configured users can access the chat and all features
- Firestore rules validate all data writes
- Storage rules restrict file uploads to authenticated members
- File uploads are type and size restricted

### Limitations
- **Not end-to-end encrypted:** Data is encrypted in transit and at rest by Firebase, but project admins can technically access it
- **Vault is not for secrets:** Do not store passwords, SSNs, or credit card numbers
- **Firebase access:** Anyone with Firebase project access can view data

### Security Best Practices
- Never commit `serviceAccountKey.json`, `.env`, or `.env.admin`
- Use strong, unique passwords for your Firebase account
- Enable 2FA on your Google account
- Regularly review Firebase Console access

## Cloud Functions

The app includes these Cloud Functions:

| Function | Description |
|----------|-------------|
| `sendNewMessageNotification` | Send push notification when new message arrives |
| `cleanupOldMessages` | Auto-delete old messages (runs daily) |
| `createInvite` | Generate invite codes |
| `redeemInvite` | Redeem invite codes |

## Troubleshooting

### "You do not have access to this chat"
1. Verify `VITE_PRIVATE_CHAT_ID` matches the created chat
2. Ensure your UID is in the chat's `members` array
3. Deploy Firestore rules: `firebase deploy --only firestore:rules`

### Push notifications not working
1. Ensure VAPID key is set in `.env`
2. Check that the service worker is registered
3. Verify browser notification permissions

### File upload fails
1. Check file size (max 5MB)
2. Verify file type is allowed
3. Deploy storage rules: `firebase deploy --only storage`

### Cloud Functions errors
1. Check function logs: `firebase functions:log`
2. Verify Node.js version is 20 in `functions/package.json`
3. Redeploy: `firebase deploy --only functions`

## Known Limitations

- Single private chat only (no group chats)
- No end-to-end encryption
- No offline support
- No video/voice calls
- No recurring reminders
- Push notifications require browser support

## License

Private project - not for redistribution.

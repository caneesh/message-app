# Message App

A simple private one-to-one messaging app built with React, Vite, and Firebase. Designed for secure communication between two known users.

## Tech Stack

- React 18
- Vite
- Firebase Authentication (phone/SMS)
- Cloud Firestore
- Firebase Hosting

## Features

- Phone/SMS authentication
- Real-time messaging
- Private chat between two users
- Mobile-responsive UI
- PWA-ready (manifest included)

## Project Structure

```
src/
  firebase/       # Firebase configuration
  auth/           # Authentication components
  chat/           # Chat components
  layout/         # Layout components
  App.jsx         # Main app component
  main.jsx        # Entry point
  styles.css      # Global styles
scripts/
  createPrivateChat.js  # Admin script to create chat
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name and follow the setup wizard
4. Once created, click the web icon (</>) to add a web app
5. Register your app with a nickname
6. Copy the Firebase config values shown

### 3. Enable Phone Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Click on **Phone**
3. Enable the toggle
4. Click **Save**

#### Testing with Test Phone Numbers

For development, add test phone numbers to avoid SMS charges:

1. In Firebase Console, go to **Authentication** > **Sign-in method** > **Phone**
2. Scroll to **Phone numbers for testing**
3. Add test numbers (e.g., `+15555550100`) with verification codes (e.g., `123456`)

### 4. Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll add security rules later)
4. Select a location closest to your users
5. Click **Enable**

### 5. Create Users and Set Up Private Chat

#### Create Two Users

1. Run the app with `npm run dev`
2. Sign in with the first phone number - note the UID from Firebase Console > Authentication > Users
3. Sign out and sign in with the second phone number - note the UID

#### Download Service Account Key

1. Go to Firebase Console > Project Settings > Service accounts
2. Click **Generate new private key**
3. Save the JSON file as `serviceAccountKey.json` in your project root
4. **Never commit this file** - it's in `.gitignore`

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

#### Run the Setup Script

```bash
npm run create-chat
```

### 6. Configure Frontend Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_PRIVATE_CHAT_ID=private-chat-001
```

### 7. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

### 8. Run Development Server

```bash
npm run dev
```

## Deployment

### Deploy to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

Or deploy everything:

```bash
npm run build
firebase deploy
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run create-chat` | Create private chat (admin) |
| `firebase deploy --only firestore:rules` | Deploy security rules |
| `firebase deploy --only hosting` | Deploy to hosting |

## Environment Variables

### Frontend (.env)

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_PRIVATE_CHAT_ID` | ID of the private chat |

### Admin (.env.admin)

| Variable | Description |
|----------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON |
| `PRIVATE_CHAT_ID` | ID for the chat to create |
| `USER_ID_1` | First user's Firebase UID |
| `USER_ID_2` | Second user's Firebase UID |

## Security Notes

- **Access-Controlled:** Only the two configured users can read/write messages
- **Not End-to-End Encrypted:** Messages are stored in Firestore. Firebase admins and project owners can technically access stored data
- **Do not use for highly sensitive communication** unless you add end-to-end encryption
- **Never commit:** `serviceAccountKey.json`, `.env`, or `.env.admin`

## Limitations

- One fixed chat only (no group chat)
- No file attachments
- No push notifications
- No message editing or deletion
- No end-to-end encryption
- No offline support
- No read receipts or typing indicators

## Troubleshooting

### "Missing required environment variables"

Check that your `.env` file exists and contains all required `VITE_FIREBASE_*` values.

### "You do not have access to this chat"

1. Verify `VITE_PRIVATE_CHAT_ID` matches the chat created by the admin script
2. Ensure your user UID is in the chat's `members` array
3. Check that Firestore security rules are deployed

### Phone auth not working

1. Ensure Phone authentication is enabled in Firebase Console
2. For testing, use test phone numbers to avoid SMS quota issues
3. Check browser console for reCAPTCHA errors

### Permission denied errors

1. Deploy Firestore rules: `firebase deploy --only firestore:rules`
2. Verify the chat document exists and contains your UID in `members`

## Future Enhancements

- End-to-end encryption
- Push notifications
- Message deletion
- Read receipts
- Typing indicators
- Multiple chat support
- File attachments
- Offline support with service worker

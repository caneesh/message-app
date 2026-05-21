# Chat Backup and Restore Plan

## Overview

This document describes the chat backup system and how to restore data if needed.

## Backup System

### How It Works

1. **Scheduled Backup** (`scheduledChatBackup`): Runs every 6 hours (configurable)
2. **Cleanup** (`cleanupOldChatBackups`): Runs daily to remove backups older than retention period

### Backup Storage Location

Backups are stored in Cloud Storage at:

```
backups/chats/{yyyy}/{MM}/{dd}/{HH}/chat-{chatId}.json.gz
backups/chats/{yyyy}/{MM}/{dd}/{HH}/manifest.json
```

Example:
```
backups/chats/2026/05/21/18/chat-private-chat-001.json.gz
backups/chats/2026/05/21/18/manifest.json
```

### Data Included in Backups

Each chat backup includes:

1. **Chat metadata** - The main chat document
2. **Messages** - Last 90 days by default (configurable via `CHAT_BACKUP_MESSAGE_DAYS`)
3. **Reminders**
4. **Notes**
5. **Promises**
6. **Decisions**
7. **Memories**
8. **Pinned Messages**
9. **Reactions**
10. **Check-ins**
11. **Special Messages**
12. **Important Dates**
13. **Lists** (including list items)
14. **Events**
15. **Capsules**
16. **Follow-ups**
17. **Misunderstandings**

### Data NOT Included

- **aiRuns** - Audit/cost metadata (excluded by design)
- **Binary files** - Photos, voice notes, file attachments are NOT included
  - File metadata (storagePath, contentType, size) IS preserved
  - Actual binary content must be restored separately if needed

### Backup File Format

Each backup is a gzip-compressed JSON file with the following structure:

```json
{
  "backupVersion": "1.0.0",
  "backupCreatedAt": "2026-05-21T18:00:00.000Z",
  "chatId": "private-chat-001",
  "chatMetadata": {
    "members": ["uid1", "uid2"],
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  "subcollections": {
    "messages": [
      {
        "id": "msg123",
        "text": "Hello",
        "senderId": "uid1",
        "createdAt": "2026-05-21T12:00:00.000Z"
      }
    ],
    "reminders": [...],
    "notes": [...],
    ...
  }
}
```

### Manifest File

Each backup run creates a manifest file listing all backed-up chats:

```json
{
  "backupVersion": "1.0.0",
  "startedAt": "2026-05-21T18:00:00.000Z",
  "completedAt": "2026-05-21T18:01:30.000Z",
  "durationMs": 90000,
  "chatCount": 5,
  "successCount": 5,
  "failureCount": 0,
  "skippedCount": 0,
  "messageDaysIncluded": 90,
  "backupFiles": [
    {
      "chatId": "private-chat-001",
      "path": "backups/chats/2026/05/21/18/chat-private-chat-001.json.gz",
      "messageCount": 1500,
      "status": "success",
      "subcollectionCounts": {
        "messages": 1500,
        "reminders": 10,
        "notes": 5
      }
    }
  ]
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CHAT_BACKUP_ENABLED` | `false` | Set to `true` to enable backups |
| `CHAT_BACKUP_BUCKET` | (required) | Cloud Storage bucket name for backups |
| `CHAT_BACKUP_SCHEDULE` | `every 6 hours` | Backup schedule (Cloud Scheduler format) |
| `CHAT_BACKUP_RETENTION_DAYS` | `30` | Days to keep backups before cleanup |
| `CHAT_BACKUP_MESSAGE_DAYS` | `90` | Days of messages to include in backup |

### Setting Environment Variables

```bash
firebase functions:config:set \
  backup.enabled=true \
  backup.bucket=my-backup-bucket \
  backup.retention_days=30 \
  backup.message_days=90
```

Or set in `.env` for Cloud Functions:

```env
CHAT_BACKUP_ENABLED=true
CHAT_BACKUP_BUCKET=my-backup-bucket
CHAT_BACKUP_RETENTION_DAYS=30
CHAT_BACKUP_MESSAGE_DAYS=90
```

## Inspecting Backups

### List Available Backups

Using `gsutil`:

```bash
gsutil ls -r gs://BUCKET_NAME/backups/chats/
```

### Download a Backup

```bash
gsutil cp gs://BUCKET_NAME/backups/chats/2026/05/21/18/chat-private-chat-001.json.gz ./
```

### View Backup Contents

```bash
# Decompress and view
gunzip -c chat-private-chat-001.json.gz | jq .

# View just message count
gunzip -c chat-private-chat-001.json.gz | jq '.subcollections.messages | length'

# View backup metadata
gunzip -c chat-private-chat-001.json.gz | jq '{version: .backupVersion, chatId: .chatId, created: .backupCreatedAt}'
```

### View Manifest

```bash
gsutil cat gs://BUCKET_NAME/backups/chats/2026/05/21/18/manifest.json | jq .
```

## Manual Restore Procedure

**WARNING: Restore operations modify production data. Always test on staging first.**

### Prerequisites

1. Access to backup files in Cloud Storage
2. Firebase Admin SDK credentials
3. Node.js environment with `firebase-admin` installed

### Step 1: Download the Backup

```bash
gsutil cp gs://BUCKET_NAME/backups/chats/2026/05/21/18/chat-private-chat-001.json.gz ./
gunzip chat-private-chat-001.json.gz
```

### Step 2: Inspect the Backup

Review the backup contents before restoring:

```bash
jq '.chatMetadata' chat-private-chat-001.json
jq '.subcollections | keys' chat-private-chat-001.json
jq '.subcollections.messages | length' chat-private-chat-001.json
```

### Step 3: Restore Script

Create a restore script (example):

```javascript
// restore-chat.js
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize with service account for STAGING
admin.initializeApp({
  credential: admin.credential.cert('./service-account-staging.json'),
  projectId: 'your-staging-project'
});

const db = admin.firestore();

async function restoreChat(backupFile, options = {}) {
  const {
    dryRun = true,
    targetChatId = null, // Override chat ID for staging
  } = options;

  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const chatId = targetChatId || backup.chatId;

  console.log(`Restoring chat: ${chatId}`);
  console.log(`Backup version: ${backup.backupVersion}`);
  console.log(`Backup created: ${backup.backupCreatedAt}`);
  console.log(`Dry run: ${dryRun}`);

  if (dryRun) {
    console.log('\n--- DRY RUN MODE ---\n');
  }

  // Restore chat metadata
  console.log('Restoring chat metadata...');
  if (!dryRun) {
    await db.collection('chats').doc(chatId).set(backup.chatMetadata);
  }

  // Restore each subcollection
  for (const [subcollection, docs] of Object.entries(backup.subcollections)) {
    console.log(`Restoring ${subcollection}: ${docs.length} documents`);
    
    if (!dryRun) {
      const batch = db.batch();
      let count = 0;

      for (const doc of docs) {
        const { id, ...data } = doc;
        const ref = db.collection(`chats/${chatId}/${subcollection}`).doc(id);
        batch.set(ref, data);
        count++;

        // Commit in batches of 500
        if (count % 500 === 0) {
          await batch.commit();
          console.log(`  Committed ${count} documents...`);
        }
      }

      if (count % 500 !== 0) {
        await batch.commit();
      }
    }
  }

  console.log('\nRestore complete!');
}

// Usage
restoreChat('./chat-private-chat-001.json', {
  dryRun: true,  // Set to false to actually restore
  targetChatId: 'staging-test-chat'  // Use different ID for staging
});
```

### Step 4: Test on Staging

1. Set up a staging Firebase project
2. Run restore with `dryRun: true` first
3. Run restore with `dryRun: false` to staging
4. Verify data in staging

### Step 5: Production Restore (If Needed)

**Only after successful staging test:**

1. Create a backup of current production state
2. Update script to point to production credentials
3. Run restore with `dryRun: true` to verify
4. Run restore with `dryRun: false`
5. Verify restored data

## Restoring Media Files

Backup JSON files contain metadata references to media files, not the actual binary content.

If you need to restore media files:

1. **From Cloud Storage backups**: If Cloud Storage has its own backup/versioning
2. **From original storage**: Files may still exist in `chatFiles/` and `chatVoice/` paths

The metadata in the backup includes:
- `storagePath`: Original storage location
- `contentType`: MIME type
- `size`: File size in bytes
- `durationSeconds`: For voice notes

## Disaster Recovery Notes

### Full Firestore Recovery

For complete disaster recovery, configure Firestore managed exports separately:

1. Go to Firebase Console → Firestore → Backups
2. Configure scheduled exports to Cloud Storage
3. These exports capture the entire database structure

### Storage Recovery

1. Enable Cloud Storage versioning for media files
2. Configure lifecycle policies for version retention

## Security Notes

1. Backup files are NOT accessible to clients
2. Storage rules explicitly deny access to `/backups/**`
3. Only Admin SDK (service account) can read/write backups
4. Backup URLs are never stored in Firestore
5. Message content is never logged (only counts and metadata)

## Troubleshooting

### Backup Not Running

1. Check `CHAT_BACKUP_ENABLED` is set to `true`
2. Check `CHAT_BACKUP_BUCKET` is configured
3. Check Cloud Function logs for errors
4. Verify service account has Storage write permissions

### Cleanup Not Working

1. Check retention days configuration
2. Check Cloud Function logs
3. Verify bucket permissions

### Large Backups Timing Out

1. Reduce `CHAT_BACKUP_MESSAGE_DAYS` to include fewer messages
2. Increase function timeout (max 540 seconds)
3. Increase function memory

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-05-21 | Initial backup system |

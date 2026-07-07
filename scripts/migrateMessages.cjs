/**
 * Migration script to restore messages from a restored Firestore backup database
 * to the default database.
 *
 * Usage: node scripts/migrateMessages.js
 *
 * Prerequisites:
 * - GOOGLE_APPLICATION_CREDENTIALS env var set to service account key path
 * - Or run with: gcloud auth application-default login
 */

const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

const PROJECT_ID = 'ctask-manager'
const SOURCE_DATABASE = 'restored-backup-jun24'
const CHAT_ID = 'aneesh_tina' // Your chat ID

// Initialize source database (restored backup)
const sourceApp = initializeApp({
  projectId: PROJECT_ID,
}, 'source')

const sourceDb = getFirestore(sourceApp, SOURCE_DATABASE)

// Initialize target database (default)
const targetApp = initializeApp({
  projectId: PROJECT_ID,
}, 'target')

const targetDb = getFirestore(targetApp)

async function migrateMessages() {
  console.log('Starting message migration...')
  console.log(`Source: ${SOURCE_DATABASE}`)
  console.log(`Target: (default)`)
  console.log(`Chat ID: ${CHAT_ID}`)
  console.log('---')

  try {
    // Get all messages from source
    const sourceMessagesRef = sourceDb.collection('chats').doc(CHAT_ID).collection('messages')
    const sourceSnapshot = await sourceMessagesRef.orderBy('createdAt', 'asc').get()

    console.log(`Found ${sourceSnapshot.docs.length} messages in source database`)

    if (sourceSnapshot.empty) {
      console.log('No messages to migrate')
      return
    }

    // Get existing messages in target to avoid duplicates
    const targetMessagesRef = targetDb.collection('chats').doc(CHAT_ID).collection('messages')
    const targetSnapshot = await targetMessagesRef.get()
    const existingIds = new Set(targetSnapshot.docs.map(doc => doc.id))

    console.log(`Found ${existingIds.size} existing messages in target database`)

    // Filter to only new messages
    const newMessages = sourceSnapshot.docs.filter(doc => !existingIds.has(doc.id))
    console.log(`${newMessages.length} new messages to migrate`)

    if (newMessages.length === 0) {
      console.log('All messages already exist in target. Nothing to migrate.')
      return
    }

    // Migrate in batches of 500
    const BATCH_SIZE = 500
    let migrated = 0
    let batch = targetDb.batch()
    let batchCount = 0

    for (const doc of newMessages) {
      const data = doc.data()
      const targetRef = targetMessagesRef.doc(doc.id)
      batch.set(targetRef, data)
      batchCount++
      migrated++

      if (batchCount >= BATCH_SIZE) {
        console.log(`Committing batch... (${migrated}/${newMessages.length})`)
        await batch.commit()
        batch = targetDb.batch()
        batchCount = 0
      }
    }

    // Commit remaining
    if (batchCount > 0) {
      console.log(`Committing final batch... (${migrated}/${newMessages.length})`)
      await batch.commit()
    }

    console.log('---')
    console.log(`Migration complete! Migrated ${migrated} messages.`)

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

async function migrateSubcollections() {
  console.log('\nMigrating message subcollections (reactions, editHistory)...')

  const sourceMessagesRef = sourceDb.collection('chats').doc(CHAT_ID).collection('messages')
  const sourceSnapshot = await sourceMessagesRef.get()

  let totalReactions = 0
  let totalEditHistory = 0

  for (const msgDoc of sourceSnapshot.docs) {
    const messageId = msgDoc.id

    // Migrate reactions
    const reactionsSnapshot = await sourceDb
      .collection('chats').doc(CHAT_ID)
      .collection('messages').doc(messageId)
      .collection('reactions').get()

    if (!reactionsSnapshot.empty) {
      const batch = targetDb.batch()
      for (const reactionDoc of reactionsSnapshot.docs) {
        const targetRef = targetDb
          .collection('chats').doc(CHAT_ID)
          .collection('messages').doc(messageId)
          .collection('reactions').doc(reactionDoc.id)
        batch.set(targetRef, reactionDoc.data(), { merge: true })
        totalReactions++
      }
      await batch.commit()
    }

    // Migrate edit history
    const editHistorySnapshot = await sourceDb
      .collection('chats').doc(CHAT_ID)
      .collection('messages').doc(messageId)
      .collection('editHistory').get()

    if (!editHistorySnapshot.empty) {
      const batch = targetDb.batch()
      for (const editDoc of editHistorySnapshot.docs) {
        const targetRef = targetDb
          .collection('chats').doc(CHAT_ID)
          .collection('messages').doc(messageId)
          .collection('editHistory').doc(editDoc.id)
        batch.set(targetRef, editDoc.data(), { merge: true })
        totalEditHistory++
      }
      await batch.commit()
    }
  }

  console.log(`Migrated ${totalReactions} reactions, ${totalEditHistory} edit history entries`)
}

async function migrateBundledAttachments() {
  console.log('\nMigrating bundled attachments...')

  const sourceMessagesRef = sourceDb.collection('chats').doc(CHAT_ID).collection('messages')
  const bundleSnapshot = await sourceMessagesRef.where('type', '==', 'attachment_bundle').get()

  let totalAttachments = 0

  for (const msgDoc of bundleSnapshot.docs) {
    const messageId = msgDoc.id

    const attachmentsSnapshot = await sourceDb
      .collection('chats').doc(CHAT_ID)
      .collection('messages').doc(messageId)
      .collection('attachments').get()

    if (!attachmentsSnapshot.empty) {
      const batch = targetDb.batch()
      for (const attachDoc of attachmentsSnapshot.docs) {
        const targetRef = targetDb
          .collection('chats').doc(CHAT_ID)
          .collection('messages').doc(messageId)
          .collection('attachments').doc(attachDoc.id)
        batch.set(targetRef, attachDoc.data(), { merge: true })
        totalAttachments++
      }
      await batch.commit()
    }
  }

  console.log(`Migrated ${totalAttachments} bundled attachments`)
}

async function main() {
  await migrateMessages()
  await migrateSubcollections()
  await migrateBundledAttachments()
  console.log('\nAll migrations complete!')
  process.exit(0)
}

main()

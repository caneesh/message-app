#!/usr/bin/env node

/**
 * Copy messages from restored-backup database to main (default) database
 *
 * Usage:
 *   node scripts/restoreMessages.js
 *
 * Prerequisites:
 *   - Firebase CLI logged in: firebase login
 *   - Run from project root
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

const PROJECT_ID = 'ctask-manager'
const CHAT_ID = process.env.VITE_PRIVATE_CHAT_ID || process.argv[2]

if (!CHAT_ID) {
  console.error('Error: Please provide CHAT_ID as argument or set VITE_PRIVATE_CHAT_ID')
  console.error('Usage: node scripts/restoreMessages.js <CHAT_ID>')
  process.exit(1)
}

async function main() {
  console.log('Initializing Firebase Admin...')

  // Initialize app for restored-backup database
  const restoredApp = initializeApp({
    projectId: PROJECT_ID,
  }, 'restored')

  // Initialize app for main (default) database
  const mainApp = initializeApp({
    projectId: PROJECT_ID,
  }, 'main')

  const restoredDb = getFirestore(restoredApp, 'restored-backup')
  const mainDb = getFirestore(mainApp)

  console.log(`\nReading messages from restored-backup database...`)
  console.log(`Chat ID: ${CHAT_ID}`)

  const messagesRef = restoredDb.collection('chats').doc(CHAT_ID).collection('messages')
  const snapshot = await messagesRef.get()

  if (snapshot.empty) {
    console.log('No messages found in restored backup.')
    process.exit(0)
  }

  console.log(`Found ${snapshot.size} messages to restore.`)

  // Check current messages in main database
  const mainMessagesRef = mainDb.collection('chats').doc(CHAT_ID).collection('messages')
  const mainSnapshot = await mainMessagesRef.get()
  console.log(`Main database currently has ${mainSnapshot.size} messages.`)

  const existingIds = new Set(mainSnapshot.docs.map(d => d.id))
  const toRestore = snapshot.docs.filter(d => !existingIds.has(d.id))

  console.log(`\n${toRestore.length} messages to copy (skipping ${snapshot.size - toRestore.length} duplicates)`)

  if (toRestore.length === 0) {
    console.log('Nothing to restore - all messages already exist.')
    process.exit(0)
  }

  console.log('\nRestoring messages in batches...')

  const BATCH_SIZE = 500
  let restored = 0

  for (let i = 0; i < toRestore.length; i += BATCH_SIZE) {
    const batch = mainDb.batch()
    const chunk = toRestore.slice(i, i + BATCH_SIZE)

    for (const doc of chunk) {
      const destRef = mainMessagesRef.doc(doc.id)
      batch.set(destRef, doc.data())
    }

    await batch.commit()
    restored += chunk.length
    console.log(`  Restored ${restored}/${toRestore.length} messages`)
  }

  console.log(`\nDone! Restored ${restored} messages to main database.`)
  console.log('\nNote: The restored-backup database still exists.')
  console.log('To delete it when you\'re satisfied:')
  console.log('  gcloud firestore databases delete --database=restored-backup')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})

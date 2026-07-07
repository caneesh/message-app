/**
 * Migration script to backfill commentsSummary for existing thoughts
 * Run with: node scripts/migrateCommentsSummary.js
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load service account
const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json')
let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
} catch (err) {
  console.error('Error: Could not find serviceAccountKey.json')
  console.error('Please download it from Firebase Console > Project Settings > Service Accounts')
  console.error('and place it in the project root as serviceAccountKey.json')
  process.exit(1)
}

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
})

const db = getFirestore()

async function migrateCommentsSummary() {
  console.log('Starting commentsSummary migration...\n')

  // Get all chats
  const chatsSnap = await db.collection('chats').get()
  console.log(`Found ${chatsSnap.size} chat(s)\n`)

  let totalThoughts = 0
  let updatedThoughts = 0
  let skippedThoughts = 0

  for (const chatDoc of chatsSnap.docs) {
    const chatId = chatDoc.id
    console.log(`Processing chat: ${chatId}`)

    // Get all thoughts in this chat
    const thoughtsSnap = await db
      .collection('chats')
      .doc(chatId)
      .collection('thoughts')
      .get()

    console.log(`  Found ${thoughtsSnap.size} thought(s)`)

    for (const thoughtDoc of thoughtsSnap.docs) {
      totalThoughts++
      const thoughtId = thoughtDoc.id
      const thoughtData = thoughtDoc.data()

      // Skip if already has commentsSummary with data
      if (thoughtData.commentsSummary?.commentCount > 0) {
        console.log(`  - Thought ${thoughtId}: Already has commentsSummary, skipping`)
        skippedThoughts++
        continue
      }

      // Get all comments for this thought
      const commentsSnap = await db
        .collection('chats')
        .doc(chatId)
        .collection('thoughts')
        .doc(thoughtId)
        .collection('comments')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .get()

      const activeComments = commentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Build commentsSummary
      let commentsSummary
      if (activeComments.length === 0) {
        commentsSummary = {
          commentCount: 0,
          lastCommentAt: null,
          lastCommentBy: null,
          updatedAt: new Date()
        }
      } else {
        const latestComment = activeComments[0]
        commentsSummary = {
          commentCount: activeComments.length,
          lastCommentAt: latestComment.createdAt,
          lastCommentBy: latestComment.authorId,
          updatedAt: new Date()
        }
      }

      // Update the thought
      await db
        .collection('chats')
        .doc(chatId)
        .collection('thoughts')
        .doc(thoughtId)
        .update({ commentsSummary })

      console.log(`  - Thought ${thoughtId}: Updated with ${commentsSummary.commentCount} comment(s)`)
      updatedThoughts++
    }

    console.log('')
  }

  console.log('Migration complete!')
  console.log(`  Total thoughts: ${totalThoughts}`)
  console.log(`  Updated: ${updatedThoughts}`)
  console.log(`  Skipped (already had data): ${skippedThoughts}`)
}

migrateCommentsSummary()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\nMigration failed:', err)
    process.exit(1)
  })

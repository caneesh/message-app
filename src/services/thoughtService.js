/**
 * Thought service for CRUD operations on thoughts
 */

import { db } from '../firebase/firebaseConfig'
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'
import { splitThoughtIntoBlocks, isValidMood } from '../utils/thoughtUtils'

const MAX_TITLE_LENGTH = 120
const MAX_BODY_LENGTH = 10000
const MAX_BLOCKS = 100

/**
 * Create a new thought
 * @param {string} chatId - The chat ID
 * @param {string} userId - The author's user ID
 * @param {Object} data - Thought data { title, body, mood }
 * @returns {Object} - { success, thoughtId, error }
 */
export async function createThought(chatId, userId, { title, body, mood = 'normal' }) {
  if (!chatId || !userId) {
    return { success: false, error: 'Missing chatId or userId' }
  }

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return { success: false, error: 'Body is required' }
  }

  if (body.length > MAX_BODY_LENGTH) {
    return { success: false, error: `Body exceeds maximum length of ${MAX_BODY_LENGTH} characters` }
  }

  if (title && title.length > MAX_TITLE_LENGTH) {
    return { success: false, error: `Title exceeds maximum length of ${MAX_TITLE_LENGTH} characters` }
  }

  if (!isValidMood(mood)) {
    return { success: false, error: 'Invalid mood value' }
  }

  const blocks = splitThoughtIntoBlocks(body)
  if (blocks.length > MAX_BLOCKS) {
    return { success: false, error: `Too many paragraphs. Maximum is ${MAX_BLOCKS}` }
  }

  try {
    const thoughtsRef = collection(db, 'chats', chatId, 'thoughts')
    const thoughtData = {
      chatId,
      authorId: userId,
      title: title?.trim() || '',
      body: body.trim(),
      blocks,
      mood,
      status: 'shared',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    const docRef = await addDoc(thoughtsRef, thoughtData)
    return { success: true, thoughtId: docRef.id }
  } catch (error) {
    console.error('Error creating thought:', error)
    return { success: false, error: error.message || 'Failed to create thought' }
  }
}

/**
 * List all shared thoughts for a chat
 * @param {string} chatId - The chat ID
 * @returns {Object} - { success, thoughts, error }
 */
export async function listThoughts(chatId) {
  if (!chatId) {
    return { success: false, error: 'Missing chatId', thoughts: [] }
  }

  try {
    const thoughtsRef = collection(db, 'chats', chatId, 'thoughts')
    const q = query(
      thoughtsRef,
      where('status', '==', 'shared'),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    const thoughts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return { success: true, thoughts }
  } catch (error) {
    console.error('Error listing thoughts:', error)
    return { success: false, error: error.message || 'Failed to list thoughts', thoughts: [] }
  }
}

/**
 * Get a single thought by ID
 * @param {string} chatId - The chat ID
 * @param {string} thoughtId - The thought ID
 * @returns {Object} - { success, thought, error }
 */
export async function getThought(chatId, thoughtId) {
  if (!chatId || !thoughtId) {
    return { success: false, error: 'Missing chatId or thoughtId' }
  }

  try {
    const thoughtRef = doc(db, 'chats', chatId, 'thoughts', thoughtId)
    const snapshot = await getDoc(thoughtRef)

    if (!snapshot.exists()) {
      return { success: false, error: 'Thought not found' }
    }

    const thought = { id: snapshot.id, ...snapshot.data() }

    if (thought.status === 'deleted') {
      return { success: false, error: 'Thought has been deleted' }
    }

    return { success: true, thought }
  } catch (error) {
    console.error('Error getting thought:', error)
    return { success: false, error: error.message || 'Failed to get thought' }
  }
}

/**
 * Update a thought (only author can update)
 * @param {string} chatId - The chat ID
 * @param {string} thoughtId - The thought ID
 * @param {string} userId - The user attempting to update
 * @param {Object} updates - Fields to update { title, body, mood }
 * @returns {Object} - { success, error }
 */
export async function updateThought(chatId, thoughtId, userId, updates) {
  if (!chatId || !thoughtId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const thoughtRef = doc(db, 'chats', chatId, 'thoughts', thoughtId)
    const snapshot = await getDoc(thoughtRef)

    if (!snapshot.exists()) {
      return { success: false, error: 'Thought not found' }
    }

    const thought = snapshot.data()

    if (thought.authorId !== userId) {
      return { success: false, error: 'Only the author can update this thought' }
    }

    if (thought.status === 'deleted') {
      return { success: false, error: 'Cannot update a deleted thought' }
    }

    const updateData = { updatedAt: serverTimestamp() }

    if (updates.title !== undefined) {
      if (updates.title && updates.title.length > MAX_TITLE_LENGTH) {
        return { success: false, error: `Title exceeds maximum length of ${MAX_TITLE_LENGTH} characters` }
      }
      updateData.title = updates.title?.trim() || ''
    }

    if (updates.body !== undefined) {
      if (!updates.body || updates.body.trim().length === 0) {
        return { success: false, error: 'Body cannot be empty' }
      }
      if (updates.body.length > MAX_BODY_LENGTH) {
        return { success: false, error: `Body exceeds maximum length of ${MAX_BODY_LENGTH} characters` }
      }
      updateData.body = updates.body.trim()
      updateData.blocks = splitThoughtIntoBlocks(updates.body)
      if (updateData.blocks.length > MAX_BLOCKS) {
        return { success: false, error: `Too many paragraphs. Maximum is ${MAX_BLOCKS}` }
      }
    }

    if (updates.mood !== undefined) {
      if (!isValidMood(updates.mood)) {
        return { success: false, error: 'Invalid mood value' }
      }
      updateData.mood = updates.mood
    }

    await updateDoc(thoughtRef, updateData)
    return { success: true }
  } catch (error) {
    console.error('Error updating thought:', error)
    return { success: false, error: error.message || 'Failed to update thought' }
  }
}

/**
 * Soft delete a thought (only author can delete)
 * @param {string} chatId - The chat ID
 * @param {string} thoughtId - The thought ID
 * @param {string} userId - The user attempting to delete
 * @returns {Object} - { success, error }
 */
export async function softDeleteThought(chatId, thoughtId, userId) {
  if (!chatId || !thoughtId || !userId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const thoughtRef = doc(db, 'chats', chatId, 'thoughts', thoughtId)
    const snapshot = await getDoc(thoughtRef)

    if (!snapshot.exists()) {
      return { success: false, error: 'Thought not found' }
    }

    const thought = snapshot.data()

    if (thought.authorId !== userId) {
      return { success: false, error: 'Only the author can delete this thought' }
    }

    if (thought.status === 'deleted') {
      return { success: false, error: 'Thought is already deleted' }
    }

    await updateDoc(thoughtRef, {
      status: 'deleted',
      updatedAt: serverTimestamp()
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting thought:', error)
    return { success: false, error: error.message || 'Failed to delete thought' }
  }
}

/**
 * Get the user's private read state for a thought
 * @param {string} chatId - The chat ID
 * @param {string} uid - The user's ID
 * @param {string} thoughtId - The thought ID
 * @returns {Object} - { success, readState, error }
 */
export async function getThoughtReadState(chatId, uid, thoughtId) {
  if (!chatId || !uid || !thoughtId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const readStateRef = doc(db, 'chats', chatId, 'thoughtReadState', uid, 'items', thoughtId)
    const snapshot = await getDoc(readStateRef)

    if (!snapshot.exists()) {
      return { success: true, readState: null }
    }

    return { success: true, readState: snapshot.data() }
  } catch (error) {
    console.error('Error getting thought read state:', error)
    return { success: false, error: error.message || 'Failed to get read state' }
  }
}

/**
 * Update the user's private read state for a thought
 * Also updates the shared read receipt summary (without detailed block info)
 * @param {string} chatId - The chat ID
 * @param {string} uid - The user's ID
 * @param {string} thoughtId - The thought ID
 * @param {Object} readState - Read state data
 * @returns {Object} - { success, error }
 */
export async function updateThoughtReadState(chatId, uid, thoughtId, readState) {
  if (!chatId || !uid || !thoughtId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const readStateRef = doc(db, 'chats', chatId, 'thoughtReadState', uid, 'items', thoughtId)
    const snapshot = await getDoc(readStateRef)

    const now = serverTimestamp()
    const readPercent = Math.max(0, Math.min(100, readState.readPercent ?? 0))
    const data = {
      thoughtId,
      readerId: uid,
      lastReadBlockIndex: readState.lastReadBlockIndex ?? 0,
      readBlockIds: readState.readBlockIds ?? [],
      readPercent,
      lastReadAt: now,
      updatedAt: now
    }

    if (!snapshot.exists()) {
      data.firstOpenedAt = now
      await setDoc(readStateRef, data)
    } else {
      await updateDoc(readStateRef, data)
    }

    const receiptRef = doc(db, 'chats', chatId, 'thoughtReadReceipts', thoughtId, 'readers', uid)
    const receiptSnapshot = await getDoc(receiptRef)
    const receiptData = {
      thoughtId,
      readerId: uid,
      readPercent,
      lastReadAt: now,
      updatedAt: now
    }

    if (!receiptSnapshot.exists()) {
      receiptData.firstOpenedAt = now
      await setDoc(receiptRef, receiptData)
    } else {
      await updateDoc(receiptRef, receiptData)
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating thought read state:', error)
    return { success: false, error: error.message || 'Failed to update read state' }
  }
}

/**
 * Get the read receipt summary for a thought (for author to see reader progress)
 * @param {string} chatId - The chat ID
 * @param {string} thoughtId - The thought ID
 * @param {string} readerId - The reader's UID to fetch
 * @returns {Object} - { success, receipt, error }
 */
export async function getThoughtReadReceipt(chatId, thoughtId, readerId) {
  if (!chatId || !thoughtId || !readerId) {
    return { success: false, error: 'Missing required parameters' }
  }

  try {
    const receiptRef = doc(db, 'chats', chatId, 'thoughtReadReceipts', thoughtId, 'readers', readerId)
    const snapshot = await getDoc(receiptRef)

    if (!snapshot.exists()) {
      return { success: true, receipt: null }
    }

    return { success: true, receipt: snapshot.data() }
  } catch (error) {
    console.error('Error getting thought read receipt:', error)
    return { success: false, error: error.message || 'Failed to get read receipt' }
  }
}

/**
 * List thoughts for export
 * @param {string} chatId - The chat ID
 * @param {string} scope - 'my_thoughts' | 'all_shared'
 * @param {string} currentUserId - The current user's ID
 * @returns {Object} - { success, thoughts, error }
 */
export async function listThoughtsForExport(chatId, scope, currentUserId) {
  if (!chatId || !currentUserId) {
    return { success: false, error: 'Missing chatId or userId', thoughts: [] }
  }

  if (!['my_thoughts', 'all_shared'].includes(scope)) {
    return { success: false, error: 'Invalid scope', thoughts: [] }
  }

  try {
    const thoughtsRef = collection(db, 'chats', chatId, 'thoughts')
    let q

    if (scope === 'my_thoughts') {
      q = query(
        thoughtsRef,
        where('status', '==', 'shared'),
        where('authorId', '==', currentUserId),
        orderBy('createdAt', 'asc')
      )
    } else {
      q = query(
        thoughtsRef,
        where('status', '==', 'shared'),
        orderBy('createdAt', 'asc')
      )
    }

    const snapshot = await getDocs(q)
    const thoughts = snapshot.docs.map(doc => ({
      id: doc.id,
      authorId: doc.data().authorId,
      title: doc.data().title || '',
      body: doc.data().body || '',
      mood: doc.data().mood || 'normal',
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt
    }))

    return { success: true, thoughts }
  } catch (error) {
    console.error('Error listing thoughts for export:', error)
    return { success: false, error: error.message || 'Failed to list thoughts', thoughts: [] }
  }
}

export default {
  createThought,
  listThoughts,
  getThought,
  updateThought,
  softDeleteThought,
  getThoughtReadState,
  updateThoughtReadState,
  getThoughtReadReceipt,
  listThoughtsForExport
}

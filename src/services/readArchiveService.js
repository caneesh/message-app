import { db } from '../firebase/firebaseConfig'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'

const HIDDEN_REASONS = ['read', 'clear_all', 'delete_for_me', 'manual_archive']

function generateBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export async function archiveReadMessage(chatId, uid, messageId, reason = 'read') {
  if (!chatId || !uid || !messageId) return false
  if (!HIDDEN_REASONS.includes(reason)) reason = 'read'

  const stateRef = doc(db, 'chats', chatId, 'messageUserState', uid, 'items', messageId)

  await setDoc(stateRef, {
    messageId,
    hiddenFromMainView: true,
    hiddenFromArchiveView: false,
    hiddenReason: reason,
    hiddenAt: serverTimestamp(),
    archiveClearedAt: null,
    archiveClearBatchId: null,
    updatedAt: serverTimestamp()
  }, { merge: true })

  return true
}

export async function archiveAllRead(chatId, uid, messageIds, reason = 'read') {
  if (!chatId || !uid || !messageIds?.length) return 0
  if (!HIDDEN_REASONS.includes(reason)) reason = 'read'

  const batch = writeBatch(db)
  const now = serverTimestamp()

  for (const messageId of messageIds) {
    const stateRef = doc(db, 'chats', chatId, 'messageUserState', uid, 'items', messageId)
    batch.set(stateRef, {
      messageId,
      hiddenFromMainView: true,
      hiddenFromArchiveView: false,
      hiddenReason: reason,
      hiddenAt: now,
      archiveClearedAt: null,
      archiveClearBatchId: null,
      updatedAt: now
    }, { merge: true })
  }

  await batch.commit()
  return messageIds.length
}

export async function clearArchiveView(chatId, uid) {
  if (!chatId || !uid) return 0

  const itemsRef = collection(db, 'chats', chatId, 'messageUserState', uid, 'items')
  const q = query(itemsRef, where('hiddenFromMainView', '==', true), where('hiddenFromArchiveView', '!=', true))

  const snapshot = await getDocs(q)
  if (snapshot.empty) return 0

  const batch = writeBatch(db)
  const batchId = generateBatchId()
  const now = serverTimestamp()

  snapshot.docs.forEach(docSnap => {
    batch.update(docSnap.ref, {
      hiddenFromArchiveView: true,
      archiveClearedAt: now,
      archiveClearBatchId: batchId,
      updatedAt: now
    })
  })

  await batch.commit()
  return snapshot.size
}

export async function getMessageUserState(chatId, uid, messageId) {
  if (!chatId || !uid || !messageId) return null

  const stateRef = doc(db, 'chats', chatId, 'messageUserState', uid, 'items', messageId)
  const snap = await getDoc(stateRef)

  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getAllMessageUserStates(chatId, uid) {
  if (!chatId || !uid) return []

  const itemsRef = collection(db, 'chats', chatId, 'messageUserState', uid, 'items')
  const snapshot = await getDocs(itemsRef)

  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
}

export async function getArchivedMessageIds(chatId, uid) {
  if (!chatId || !uid) return []

  const itemsRef = collection(db, 'chats', chatId, 'messageUserState', uid, 'items')
  const q = query(
    itemsRef,
    where('hiddenFromMainView', '==', true),
    where('hiddenFromArchiveView', '!=', true)
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map(docSnap => docSnap.id)
}

export function isHiddenFromMain(state) {
  return state?.hiddenFromMainView === true
}

export function isHiddenFromArchive(state) {
  return state?.hiddenFromArchiveView === true
}

export function isVisibleInArchive(state) {
  return state?.hiddenFromMainView === true && state?.hiddenFromArchiveView !== true
}

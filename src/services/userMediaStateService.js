import { db } from '../firebase/firebaseConfig'
import { collection, doc, setDoc, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore'

export async function deleteMediaForMe(chatId, uid, messageId, mediaKind = 'image') {
  if (!chatId || !uid || !messageId) {
    throw new Error('Missing required parameters')
  }

  if (!['image', 'video', 'link', 'document', 'voice', 'text'].includes(mediaKind)) {
    throw new Error('Invalid mediaKind. Must be "image", "video", "link", "document", "voice", or "text"')
  }

  const itemRef = doc(db, 'chats', chatId, 'userMediaState', uid, 'items', messageId)

  await setDoc(itemRef, {
    messageId,
    mediaKind,
    action: 'deleted_for_me',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: uid
  })

  return true
}

export async function loadDeletedMediaForMe(chatId, uid) {
  if (!chatId || !uid) {
    return new Set()
  }

  try {
    const itemsRef = collection(db, 'chats', chatId, 'userMediaState', uid, 'items')
    const snapshot = await getDocs(itemsRef)

    const deletedIds = new Set()
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.action === 'deleted_for_me') {
        deletedIds.add(data.messageId)
      }
    })

    return deletedIds
  } catch (error) {
    console.error('Error loading deleted media:', error)
    return new Set()
  }
}

export async function undoDeleteMediaForMe(chatId, uid, messageId) {
  if (!chatId || !uid || !messageId) {
    throw new Error('Missing required parameters')
  }

  const itemRef = doc(db, 'chats', chatId, 'userMediaState', uid, 'items', messageId)
  await deleteDoc(itemRef)

  return true
}

// Legacy aliases for backward compatibility
export const deleteImageForMe = (chatId, uid, messageId) =>
  deleteMediaForMe(chatId, uid, messageId, 'image')

export const loadDeletedImagesForMe = loadDeletedMediaForMe

export const undoDeleteImageForMe = undoDeleteMediaForMe

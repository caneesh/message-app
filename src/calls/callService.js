import { db } from '../firebase/firebaseConfig'
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
  getDocs,
} from 'firebase/firestore'

export const CALL_STATUS = {
  RINGING: 'ringing',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  ENDED: 'ended',
  MISSED: 'missed',
  FAILED: 'failed',
}

export const CALL_TIMEOUT_MS = 45000

export const CALL_TYPE = {
  VIDEO: 'video',
  VOICE: 'voice',
}

export async function createCall(chatId, callerId, receiverId, type = CALL_TYPE.VIDEO) {
  const callsRef = collection(db, 'chats', chatId, 'calls')
  const callDoc = await addDoc(callsRef, {
    chatId,
    createdBy: callerId,
    receiverId,
    status: CALL_STATUS.RINGING,
    type,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    offer: null,
    answer: null,
    answeredAt: null,
    endedAt: null,
    endedBy: null,
  })
  return callDoc.id
}

export async function updateCallOffer(chatId, callId, offer) {
  const callRef = doc(db, 'chats', chatId, 'calls', callId)
  await updateDoc(callRef, {
    offer,
    updatedAt: serverTimestamp(),
  })
}

export async function updateCallAnswer(chatId, callId, answer) {
  const callRef = doc(db, 'chats', chatId, 'calls', callId)
  await updateDoc(callRef, {
    answer,
    status: CALL_STATUS.ACCEPTED,
    answeredAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateCallStatus(chatId, callId, status, endedBy = null) {
  const callRef = doc(db, 'chats', chatId, 'calls', callId)
  const updateData = {
    status,
    updatedAt: serverTimestamp(),
  }
  if (status === CALL_STATUS.ENDED || status === CALL_STATUS.REJECTED || status === CALL_STATUS.MISSED) {
    updateData.endedAt = serverTimestamp()
    if (endedBy) {
      updateData.endedBy = endedBy
    }
  }
  await updateDoc(callRef, updateData)
}

export async function addIceCandidate(chatId, callId, candidate, isCaller, userId) {
  const collectionName = isCaller ? 'callerCandidates' : 'receiverCandidates'
  const candidatesRef = collection(db, 'chats', chatId, 'calls', callId, collectionName)
  await addDoc(candidatesRef, {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    usernameFragment: candidate.usernameFragment || null,
    createdAt: serverTimestamp(),
    createdBy: userId,
  })
}

export function subscribeToCall(chatId, callId, callback) {
  const callRef = doc(db, 'chats', chatId, 'calls', callId)
  return onSnapshot(callRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() })
    } else {
      callback(null)
    }
  })
}

export function subscribeToIceCandidates(chatId, callId, isCaller, callback) {
  const collectionName = isCaller ? 'receiverCandidates' : 'callerCandidates'
  const candidatesRef = collection(db, 'chats', chatId, 'calls', callId, collectionName)
  return onSnapshot(candidatesRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        callback(change.doc.data())
      }
    })
  })
}

export function subscribeToIncomingCalls(chatId, userId, callback) {
  const callsRef = collection(db, 'chats', chatId, 'calls')
  const q = query(
    callsRef,
    where('receiverId', '==', userId),
    where('status', '==', CALL_STATUS.RINGING),
    orderBy('createdAt', 'desc'),
    limit(1)
  )
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const doc = snapshot.docs[0]
      callback({ id: doc.id, ...doc.data() })
    } else {
      callback(null)
    }
  })
}

export async function checkForActiveCall(chatId) {
  const callsRef = collection(db, 'chats', chatId, 'calls')
  const q = query(
    callsRef,
    where('status', 'in', [CALL_STATUS.RINGING, CALL_STATUS.ACCEPTED]),
    limit(1)
  )
  const snapshot = await getDocs(q)
  if (!snapshot.empty) {
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  }
  return null
}

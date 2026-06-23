import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase/firebaseConfig'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'

export function useMessageReminders(chatId, userId) {
  const [reminders, setReminders] = useState([])
  const [remindersByMessageId, setRemindersByMessageId] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chatId || !userId) {
      setReminders([])
      setRemindersByMessageId({})
      setLoading(false)
      return
    }

    const remindersRef = collection(
      db,
      'chats',
      chatId,
      'messageReminders',
      userId,
      'items'
    )
    const q = query(
      remindersRef,
      where('status', '==', 'active'),
      orderBy('remindAt', 'asc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = []
        const byMessageId = {}
        snapshot.docs.forEach((d) => {
          const data = { id: d.id, ...d.data() }
          items.push(data)
          if (!byMessageId[data.messageId]) {
            byMessageId[data.messageId] = []
          }
          byMessageId[data.messageId].push(data)
        })
        setReminders(items)
        setRemindersByMessageId(byMessageId)
        setLoading(false)
      },
      (err) => {
        console.error('Error loading reminders:', err)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [chatId, userId])

  const hasReminder = useCallback(
    (messageId) => !!remindersByMessageId[messageId]?.length,
    [remindersByMessageId]
  )

  const getReminders = useCallback(
    (messageId) => remindersByMessageId[messageId] || [],
    [remindersByMessageId]
  )

  const createReminder = useCallback(
    async (messageId, remindAt, note = '') => {
      if (!chatId || !userId || !messageId || !remindAt) return null
      try {
        const remindersRef = collection(
          db,
          'chats',
          chatId,
          'messageReminders',
          userId,
          'items'
        )
        const remindAtTimestamp =
          remindAt instanceof Timestamp ? remindAt : Timestamp.fromDate(remindAt)
        const docRef = await addDoc(remindersRef, {
          reminderId: '',
          messageId,
          userId,
          remindAt: remindAtTimestamp,
          status: 'active',
          note: note || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        await updateDoc(docRef, { reminderId: docRef.id })
        return docRef.id
      } catch (err) {
        console.error('Error creating reminder:', err)
        return null
      }
    },
    [chatId, userId]
  )

  const completeReminder = useCallback(
    async (reminderId) => {
      if (!chatId || !userId || !reminderId) return false
      try {
        const docRef = doc(
          db,
          'chats',
          chatId,
          'messageReminders',
          userId,
          'items',
          reminderId
        )
        await updateDoc(docRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        return true
      } catch (err) {
        console.error('Error completing reminder:', err)
        return false
      }
    },
    [chatId, userId]
  )

  const cancelReminder = useCallback(
    async (reminderId) => {
      if (!chatId || !userId || !reminderId) return false
      try {
        const docRef = doc(
          db,
          'chats',
          chatId,
          'messageReminders',
          userId,
          'items',
          reminderId
        )
        await updateDoc(docRef, {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        })
        return true
      } catch (err) {
        console.error('Error cancelling reminder:', err)
        return false
      }
    },
    [chatId, userId]
  )

  const deleteReminder = useCallback(
    async (reminderId) => {
      if (!chatId || !userId || !reminderId) return false
      try {
        const docRef = doc(
          db,
          'chats',
          chatId,
          'messageReminders',
          userId,
          'items',
          reminderId
        )
        await deleteDoc(docRef)
        return true
      } catch (err) {
        console.error('Error deleting reminder:', err)
        return false
      }
    },
    [chatId, userId]
  )

  return {
    reminders,
    remindersByMessageId,
    loading,
    hasReminder,
    getReminders,
    createReminder,
    completeReminder,
    cancelReminder,
    deleteReminder,
  }
}

export function getReminderTime(option) {
  const now = new Date()
  switch (option) {
    case 'later_today': {
      const later = new Date(now)
      later.setHours(later.getHours() + 2)
      return later
    }
    case 'tonight': {
      const tonight = new Date(now)
      tonight.setHours(20, 0, 0, 0)
      if (tonight <= now) {
        tonight.setDate(tonight.getDate() + 1)
      }
      return tonight
    }
    case 'tomorrow': {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)
      return tomorrow
    }
    default:
      return null
  }
}

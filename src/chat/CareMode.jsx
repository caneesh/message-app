import { useState, useEffect } from 'react'
import { db } from '../firebase/firebaseConfig'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'

function CareMode({ currentUser, chatId }) {
  const [todayCheckIns, setTodayCheckIns] = useState([])
  const [urgentReminders, setUrgentReminders] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [emergencyVault, setEmergencyVault] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendingHelp, setSendingHelp] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const unsubscribes = []

    // Today's check-ins
    const checkInsRef = collection(db, 'chats', chatId, 'checkIns')
    const checkInQ = query(checkInsRef, where('dateKey', '==', today))
    unsubscribes.push(
      onSnapshot(checkInQ, (snap) => {
        setTodayCheckIns(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }, () => {})
    )

    // High priority incomplete reminders
    const remindersRef = collection(db, 'chats', chatId, 'reminders')
    const remindersQ = query(
      remindersRef,
      where('completed', '==', false),
      where('priority', '==', 'high'),
      limit(5)
    )
    unsubscribes.push(
      onSnapshot(remindersQ, (snap) => {
        setUrgentReminders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }, () => {})
    )

    // Upcoming events (next 7 days)
    const eventsRef = collection(db, 'chats', chatId, 'events')
    const now = new Date()
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const eventsQ = query(eventsRef, orderBy('startAt'), limit(5))
    unsubscribes.push(
      onSnapshot(eventsQ, (snap) => {
        const events = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((e) => {
            if (!e.startAt) return false
            const eventDate = e.startAt.toDate ? e.startAt.toDate() : new Date(e.startAt)
            return eventDate >= now && eventDate <= weekLater
          })
        setUpcomingEvents(events)
      }, () => {})
    )

    // Emergency vault items
    const vaultRef = collection(db, 'chats', chatId, 'vaultItems')
    const vaultQ = query(vaultRef, where('category', '==', 'emergency'), limit(5))
    unsubscribes.push(
      onSnapshot(vaultQ, (snap) => {
        setEmergencyVault(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }, () => {})
    )

    setLoading(false)

    return () => unsubscribes.forEach((unsub) => unsub())
  }, [chatId, today])

  const sendNeedHelp = async () => {
    if (sendingHelp) return
    setSendingHelp(true)
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        type: 'text',
        text: '🆘 I need help',
        senderId: currentUser.uid,
        senderPhone: currentUser.phoneNumber,
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Error sending help message:', err)
    } finally {
      setSendingHelp(false)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  const getMoodLabel = (mood) => {
    switch (mood) {
      case '😊': return 'Happy'
      case '😐': return 'Okay'
      case '😟': return 'Stressed'
      case '😴': return 'Tired'
      case '❤️': return 'Loving'
      default: return mood
    }
  }

  if (loading) {
    return <div className="care-mode-container loading">Loading...</div>
  }

  return (
    <div className="care-mode-container">
      <div className="care-mode-header">
        <h2>Care Mode</h2>
        <p className="care-mode-subtitle">A focused view for everyday care</p>
      </div>

      <div className="care-disclaimer">
        This is not a medical or emergency service. For emergencies, call 911.
      </div>

      <button
        className="care-help-btn"
        onClick={sendNeedHelp}
        disabled={sendingHelp}
      >
        {sendingHelp ? 'Sending...' : '🆘 I Need Help'}
      </button>

      <div className="care-section">
        <h3>Today's Check-in</h3>
        {todayCheckIns.length === 0 ? (
          <div className="care-empty">No check-ins today</div>
        ) : (
          <div className="care-checkins">
            {todayCheckIns.map((c) => (
              <div key={c.id} className={`care-checkin ${c.userId === currentUser.uid ? 'own' : ''}`}>
                <span className="checkin-mood">{c.mood}</span>
                <span className="checkin-label">
                  {c.userId === currentUser.uid ? 'You' : 'Friend'}: {getMoodLabel(c.mood)}
                </span>
                {c.note && <span className="checkin-note">{c.note}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="care-section">
        <h3>Urgent Reminders</h3>
        {urgentReminders.length === 0 ? (
          <div className="care-empty">No urgent reminders</div>
        ) : (
          <div className="care-list">
            {urgentReminders.map((r) => (
              <div key={r.id} className="care-item urgent">
                <span className="care-item-icon">⚠️</span>
                <span className="care-item-text">{r.title}</span>
                {r.dueAt && <span className="care-item-date">{formatDate(r.dueAt)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="care-section">
        <h3>Upcoming Events</h3>
        {upcomingEvents.length === 0 ? (
          <div className="care-empty">No events in the next 7 days</div>
        ) : (
          <div className="care-list">
            {upcomingEvents.map((e) => (
              <div key={e.id} className="care-item">
                <span className="care-item-icon">📅</span>
                <span className="care-item-text">{e.title}</span>
                <span className="care-item-date">{formatDate(e.startAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="care-section">
        <h3>Emergency Contacts & Info</h3>
        {emergencyVault.length === 0 ? (
          <div className="care-empty">No emergency items in vault</div>
        ) : (
          <div className="care-list">
            {emergencyVault.map((v) => (
              <div key={v.id} className="care-item emergency">
                <span className="care-item-icon">🚨</span>
                <div className="care-item-content">
                  <span className="care-item-text">{v.title}</span>
                  {v.body && <span className="care-item-body">{v.body}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CareMode

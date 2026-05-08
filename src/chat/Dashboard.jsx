import { useState, useEffect } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore'

function Dashboard({ currentUser, chatId, onNavigate }) {
  const [todayReminders, setTodayReminders] = useState([])
  const [overdueReminders, setOverdueReminders] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [todayCheckIns, setTodayCheckIns] = useState([])
  const [recentDecisions, setRecentDecisions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribes = []
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)
    const weekFromNow = new Date(todayStart)
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    const remindersRef = collection(db, 'chats', chatId, 'reminders')
    const remindersQuery = query(
      remindersRef,
      where('completed', '==', false),
      orderBy('dueAt', 'asc'),
      limit(20)
    )

    unsubscribes.push(
      onSnapshot(remindersQuery, (snapshot) => {
        const reminders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        const overdue = []
        const today = []

        reminders.forEach((r) => {
          if (!r.dueAt) return
          const dueDate = r.dueAt.toDate ? r.dueAt.toDate() : new Date(r.dueAt)
          if (dueDate < todayStart) {
            overdue.push(r)
          } else if (dueDate < todayEnd) {
            today.push(r)
          }
        })

        setOverdueReminders(overdue)
        setTodayReminders(today)
      }, () => {})
    )

    const eventsRef = collection(db, 'chats', chatId, 'events')
    const eventsQuery = query(
      eventsRef,
      where('startAt', '>=', Timestamp.fromDate(todayStart)),
      where('startAt', '<=', Timestamp.fromDate(weekFromNow)),
      orderBy('startAt', 'asc'),
      limit(5)
    )

    unsubscribes.push(
      onSnapshot(eventsQuery, (snapshot) => {
        const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setUpcomingEvents(events)
      }, () => {})
    )

    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const checkInsRef = collection(db, 'chats', chatId, 'checkIns')
    const checkInsQuery = query(checkInsRef, where('dateKey', '==', dateKey))

    unsubscribes.push(
      onSnapshot(checkInsQuery, (snapshot) => {
        const checkIns = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setTodayCheckIns(checkIns)
      }, () => {})
    )

    const decisionsRef = collection(db, 'chats', chatId, 'decisions')
    const decisionsQuery = query(
      decisionsRef,
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(3)
    )

    unsubscribes.push(
      onSnapshot(decisionsQuery, (snapshot) => {
        const decisions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setRecentDecisions(decisions)
        setLoading(false)
      }, () => {
        setLoading(false)
      })
    )

    return () => unsubscribes.forEach((unsub) => unsub())
  }, [chatId])

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  if (loading) {
    return <div className="dashboard-container loading">Loading dashboard...</div>
  }

  return (
    <div className="dashboard-container">
      <h2>Today</h2>

      {todayCheckIns.length > 0 && (
        <div className="dashboard-section">
          <h3>Check-ins Today</h3>
          <div className="dashboard-checkins">
            {todayCheckIns.map((ci) => (
              <div key={ci.id} className="dashboard-checkin">
                <span className="checkin-mood">{ci.mood}</span>
                <span className="checkin-user">
                  {ci.userId === currentUser.uid ? 'You' : 'Friend'}
                </span>
                {ci.note && <span className="checkin-note">{ci.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {overdueReminders.length > 0 && (
        <div className="dashboard-section overdue">
          <h3>Overdue</h3>
          <div className="dashboard-list">
            {overdueReminders.map((r) => (
              <div key={r.id} className="dashboard-item overdue" onClick={() => onNavigate?.('reminders')}>
                <span className="item-title">{r.title}</span>
                <span className="item-date">{formatDate(r.dueAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {todayReminders.length > 0 && (
        <div className="dashboard-section">
          <h3>Due Today</h3>
          <div className="dashboard-list">
            {todayReminders.map((r) => (
              <div key={r.id} className="dashboard-item" onClick={() => onNavigate?.('reminders')}>
                <span className="item-title">{r.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className="dashboard-section">
          <h3>Upcoming Events</h3>
          <div className="dashboard-list">
            {upcomingEvents.map((e) => (
              <div key={e.id} className="dashboard-item" onClick={() => onNavigate?.('events')}>
                <span className="item-title">{e.title}</span>
                <span className="item-date">
                  {formatDate(e.startAt)} {formatTime(e.startAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentDecisions.length > 0 && (
        <div className="dashboard-section">
          <h3>Recent Decisions</h3>
          <div className="dashboard-list">
            {recentDecisions.map((d) => (
              <div key={d.id} className="dashboard-item" onClick={() => onNavigate?.('decisions')}>
                <span className="item-title">{d.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {overdueReminders.length === 0 &&
        todayReminders.length === 0 &&
        upcomingEvents.length === 0 &&
        todayCheckIns.length === 0 &&
        recentDecisions.length === 0 && (
          <div className="dashboard-empty">
            <p>All caught up! Nothing urgent for today.</p>
          </div>
        )}
    </div>
  )
}

export default Dashboard

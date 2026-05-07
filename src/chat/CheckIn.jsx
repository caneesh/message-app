import { useState, useEffect } from 'react'
import { db } from '../firebase/firebaseConfig'
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'

const MOODS = [
  { emoji: '😊', label: 'Good' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😟', label: 'Stressed' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '❤️', label: 'Need support' },
]

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function CheckIn({ currentUser, chatId }) {
  const [checkIns, setCheckIns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMood, setSelectedMood] = useState(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const todayKey = getTodayKey()

  useEffect(() => {
    const checkInsRef = collection(db, 'chats', chatId, 'checkIns')
    const q = query(checkInsRef, orderBy('dateKey', 'desc'), limit(14))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setCheckIns(data)
      setLoading(false)

      const myTodayCheckIn = data.find(
        (c) => c.userId === currentUser.uid && c.dateKey === todayKey
      )
      if (myTodayCheckIn) {
        setSelectedMood(myTodayCheckIn.mood)
        setNote(myTodayCheckIn.note || '')
      }
    })

    return unsubscribe
  }, [chatId, currentUser.uid, todayKey])

  const handleSubmit = async () => {
    if (!selectedMood) return

    setSaving(true)
    try {
      const docId = `${todayKey}_${currentUser.uid}`
      await setDoc(doc(db, 'chats', chatId, 'checkIns', docId), {
        userId: currentUser.uid,
        dateKey: todayKey,
        mood: selectedMood,
        note: note.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Error saving check-in:', err)
    } finally {
      setSaving(false)
    }
  }

  const myTodayCheckIn = checkIns.find(
    (c) => c.userId === currentUser.uid && c.dateKey === todayKey
  )
  const friendTodayCheckIn = checkIns.find(
    (c) => c.userId !== currentUser.uid && c.dateKey === todayKey
  )

  const recentCheckIns = checkIns.filter((c) => c.dateKey !== todayKey).slice(0, 10)

  if (loading) {
    return <div className="checkin-container loading">Loading...</div>
  }

  return (
    <div className="checkin-container">
      <h2>Daily Check-In</h2>

      <div className="checkin-today">
        <h3>How are you feeling today?</h3>
        <div className="mood-picker">
          {MOODS.map((mood) => (
            <button
              key={mood.emoji}
              className={`mood-btn ${selectedMood === mood.emoji ? 'selected' : ''}`}
              onClick={() => setSelectedMood(mood.emoji)}
            >
              <span className="mood-emoji">{mood.emoji}</span>
              <span className="mood-label">{mood.label}</span>
            </button>
          ))}
        </div>
        <textarea
          placeholder="Add a note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          className="checkin-note"
        />
        <button
          className="checkin-submit"
          onClick={handleSubmit}
          disabled={!selectedMood || saving}
        >
          {saving ? 'Saving...' : myTodayCheckIn ? 'Update' : 'Submit'}
        </button>
      </div>

      {friendTodayCheckIn && (
        <div className="checkin-friend">
          <h3>Friend's Check-In Today</h3>
          <div className="checkin-card">
            <span className="checkin-mood">{friendTodayCheckIn.mood}</span>
            {friendTodayCheckIn.note && (
              <p className="checkin-friend-note">{friendTodayCheckIn.note}</p>
            )}
          </div>
        </div>
      )}

      {recentCheckIns.length > 0 && (
        <div className="checkin-history">
          <h3>Recent Check-Ins</h3>
          <div className="checkin-history-list">
            {recentCheckIns.map((c) => (
              <div key={c.id} className="checkin-history-item">
                <span className="checkin-date">{c.dateKey}</span>
                <span className="checkin-mood">{c.mood}</span>
                <span className="checkin-who">
                  {c.userId === currentUser.uid ? 'You' : 'Friend'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CheckIn

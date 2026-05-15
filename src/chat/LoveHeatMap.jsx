import { useState, useEffect, useMemo } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore'

const HEART_EMOJI_PATTERN = /[\u2764\u2765\u2763\u{1F493}-\u{1F49F}\u{1FA75}-\u{1FA77}\u{1F90D}\u{1F90E}\u{1F9E1}\u{2764}\u{1FAC0}]/u
const INTENSE_LOVE_EMOJI = '\u2764\uFE0F\u200D\u{1F525}'
const INTENSE_LOVE_PATTERN = /\u2764\uFE0F?\u200D\u{1F525}/u

const WARM_PHRASES = [
  /love you/i,
  /miss you/i,
  /thinking of you/i,
  /good morning/i,
  /good night/i,
  /sweet dreams/i,
  /wish you were here/i,
  /my heart/i,
  /i adore you/i,
  /you mean so much/i,
  /can't wait to see you/i,
  /hugs and kisses/i,
  /xoxo/i,
]

const GREETING_PHRASES = [
  /good morning/i,
  /good night/i,
  /sweet dreams/i,
]

function calculateWarmthScore(message, reactions = []) {
  let score = 0
  const text = message.text || ''

  if (INTENSE_LOVE_PATTERN.test(text)) {
    score += 4
  } else if (HEART_EMOJI_PATTERN.test(text)) {
    score += 2
  }

  if (message.style === 'love' || message.style === 'romantic') {
    score += 5
  }

  for (const phrase of WARM_PHRASES) {
    if (phrase.test(text)) {
      if (GREETING_PHRASES.some(g => g.test(text))) {
        score += 2
      } else {
        score += 3
      }
      break
    }
  }

  for (const reaction of reactions) {
    if (INTENSE_LOVE_PATTERN.test(reaction.emoji)) {
      score += 4
    } else if (HEART_EMOJI_PATTERN.test(reaction.emoji)) {
      score += 2
    }
  }

  return score
}

function getHeatLevel(score) {
  if (score === 0) return 0
  if (score <= 3) return 1
  if (score <= 8) return 2
  if (score <= 15) return 3
  return 4
}

function getHeatLabel(score) {
  if (score === 0) return 'Quiet day'
  if (score <= 3) return 'Soft moments'
  if (score <= 8) return 'Warm day'
  if (score <= 15) return 'Very warm day'
  return 'Glowing with love'
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days = []

  const startPadding = firstDay.getDay()
  for (let i = 0; i < startPadding; i++) {
    days.push(null)
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }

  return days
}

function LoveHeatMap({ currentUser, chatId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [messages, setMessages] = useState([])
  const [reactions, setReactions] = useState({})
  const [dateRange, setDateRange] = useState('30')
  const [selectedDay, setSelectedDay] = useState(null)
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const dateRangeStart = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    if (dateRange === '30') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else if (dateRange === '90') {
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    } else {
      return new Date(now.getFullYear(), 0, 1)
    }
  }, [dateRange])

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true)
      setError(null)

      try {
        const messagesRef = collection(db, 'chats', chatId, 'messages')
        const q = query(
          messagesRef,
          where('createdAt', '>=', Timestamp.fromDate(dateRangeStart)),
          orderBy('createdAt', 'asc')
        )

        const snapshot = await getDocs(q)
        const messageList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setMessages(messageList)

        const reactionsMap = {}
        for (const msg of messageList) {
          try {
            const reactionsRef = collection(db, 'chats', chatId, 'messages', msg.id, 'reactions')
            const reactionsSnap = await getDocs(reactionsRef)
            if (!reactionsSnap.empty) {
              reactionsMap[msg.id] = reactionsSnap.docs.map(d => d.data())
            }
          } catch {
            // Reactions may not exist for all messages
          }
        }
        setReactions(reactionsMap)

        setLoading(false)
      } catch (err) {
        console.error('Error fetching messages for heat map:', err)
        setError('Failed to load warmth data')
        setLoading(false)
      }
    }

    fetchMessages()
  }, [chatId, dateRangeStart])

  const dailyScores = useMemo(() => {
    const scores = {}

    for (const msg of messages) {
      if (!msg.createdAt) continue

      const date = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)
      const dateKey = formatDateKey(date)

      if (!scores[dateKey]) {
        scores[dateKey] = { score: 0, messages: [] }
      }

      const msgReactions = reactions[msg.id] || []
      const warmth = calculateWarmthScore(msg, msgReactions)

      if (warmth > 0) {
        scores[dateKey].score += warmth
        scores[dateKey].messages.push({
          ...msg,
          warmth,
          reactions: msgReactions
        })
      }
    }

    return scores
  }, [messages, reactions])

  const monthDays = useMemo(() => {
    return getMonthDays(viewMonth.year, viewMonth.month)
  }, [viewMonth])

  const navigateMonth = (delta) => {
    setViewMonth(prev => {
      let newMonth = prev.month + delta
      let newYear = prev.year

      if (newMonth < 0) {
        newMonth = 11
        newYear -= 1
      } else if (newMonth > 11) {
        newMonth = 0
        newYear += 1
      }

      return { year: newYear, month: newMonth }
    })
  }

  const handleDayClick = (date) => {
    if (!date) return
    const dateKey = formatDateKey(date)
    setSelectedDay(selectedDay === dateKey ? null : dateKey)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) {
    return <div className="love-heatmap-container loading">Loading warmth data...</div>
  }

  if (error) {
    return <div className="love-heatmap-container error">{error}</div>
  }

  const selectedDayData = selectedDay ? dailyScores[selectedDay] : null

  return (
    <div className="love-heatmap-container">
      <div className="love-heatmap-header">
        <h2>Love Map</h2>
        <p className="love-heatmap-subtitle">Your warm moments together</p>
      </div>

      <div className="love-heatmap-controls">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="love-heatmap-range-select"
        >
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="year">This year</option>
        </select>
      </div>

      <div className="love-heatmap-calendar">
        <div className="love-heatmap-month-nav">
          <button onClick={() => navigateMonth(-1)} aria-label="Previous month">&lt;</button>
          <span className="love-heatmap-month-label">
            {monthNames[viewMonth.month]} {viewMonth.year}
          </span>
          <button onClick={() => navigateMonth(1)} aria-label="Next month">&gt;</button>
        </div>

        <div className="love-heatmap-weekdays">
          {weekDays.map(day => (
            <div key={day} className="love-heatmap-weekday">{day}</div>
          ))}
        </div>

        <div className="love-heatmap-days">
          {monthDays.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="love-heatmap-day empty" />
            }

            const dateKey = formatDateKey(date)
            const dayData = dailyScores[dateKey]
            const score = dayData?.score || 0
            const heatLevel = getHeatLevel(score)
            const isSelected = selectedDay === dateKey
            const isToday = formatDateKey(new Date()) === dateKey
            const isInRange = date >= dateRangeStart

            return (
              <button
                key={dateKey}
                className={`love-heatmap-day heat-${heatLevel} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${!isInRange ? 'out-of-range' : ''}`}
                onClick={() => handleDayClick(date)}
                title={`${date.toLocaleDateString()}: ${getHeatLabel(score)}${score > 0 ? ` (${score} warmth)` : ''}`}
                disabled={!isInRange}
              >
                <span className="day-number">{date.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="love-heatmap-legend">
        <span className="legend-label">Less</span>
        <div className="legend-item heat-0" title="Quiet day" />
        <div className="legend-item heat-1" title="Soft moments" />
        <div className="legend-item heat-2" title="Warm day" />
        <div className="legend-item heat-3" title="Very warm day" />
        <div className="legend-item heat-4" title="Glowing with love" />
        <span className="legend-label">More</span>
      </div>

      {selectedDay && (
        <div className="love-heatmap-detail">
          <div className="detail-header">
            <h3>{parseDateKey(selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
            <span className="detail-label">{getHeatLabel(selectedDayData?.score || 0)}</span>
          </div>

          {selectedDayData && selectedDayData.messages.length > 0 ? (
            <div className="detail-messages">
              {selectedDayData.messages.map(msg => (
                <div key={msg.id} className="detail-message">
                  <div className="detail-message-meta">
                    <span className="detail-sender">
                      {msg.senderId === currentUser.uid ? 'You' : 'Friend'}
                    </span>
                    <span className="detail-time">{formatTime(msg.createdAt)}</span>
                  </div>
                  <div className="detail-message-text">
                    {msg.type === 'voice' ? '🎤 Voice note' : msg.text || '(no text)'}
                  </div>
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="detail-reactions">
                      {msg.reactions.map((r, i) => (
                        <span key={i} className="detail-reaction">{r.emoji}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="detail-empty">No warm moments this day</p>
          )}

          <button
            className="detail-close"
            onClick={() => setSelectedDay(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}

export default LoveHeatMap

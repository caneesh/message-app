import { useState, useEffect, useMemo } from 'react'
import { db } from '../firebase/firebaseConfig'
import { collection, query, orderBy, where, getDocs, Timestamp } from 'firebase/firestore'

function MessageCalendar({ currentUser, chatId, onSelectDate, onClose }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [isRangeMode, setIsRangeMode] = useState(false)
  const [messageDates, setMessageDates] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  useEffect(() => {
    const fetchMessageDates = async () => {
      setLoading(true)
      try {
        const messagesRef = collection(db, 'chats', chatId, 'messages')
        const q = query(messagesRef, orderBy('createdAt', 'asc'))
        const snapshot = await getDocs(q)

        const dates = new Set()
        snapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.createdAt) {
            const date = data.createdAt.toDate()
            dates.add(date.toDateString())
          }
        })
        setMessageDates(dates)
      } catch (err) {
        console.error('Error fetching message dates:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchMessageDates()
  }, [chatId])

  const fetchMessagesForRange = async (start, end) => {
    setLoadingMessages(true)
    try {
      const startOfDay = new Date(start)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(end || start)
      endOfDay.setHours(23, 59, 59, 999)

      const messagesRef = collection(db, 'chats', chatId, 'messages')
      const q = query(
        messagesRef,
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('createdAt', 'asc')
      )

      const snapshot = await getDocs(q)
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setMessages(msgs)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleDateClick = (date) => {
    if (isRangeMode) {
      if (!selectedDate || (selectedDate && endDate)) {
        setSelectedDate(date)
        setEndDate(null)
        setMessages([])
      } else {
        if (date < selectedDate) {
          setEndDate(selectedDate)
          setSelectedDate(date)
          fetchMessagesForRange(date, selectedDate)
        } else {
          setEndDate(date)
          fetchMessagesForRange(selectedDate, date)
        }
      }
    } else {
      setSelectedDate(date)
      setEndDate(null)
      fetchMessagesForRange(date, null)
    }
  }

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    const startPadding = firstDay.getDay()
    for (let i = 0; i < startPadding; i++) {
      days.push(null)
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }, [currentMonth])

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const isDateInRange = (date) => {
    if (!selectedDate || !endDate || !date) return false
    return date >= selectedDate && date <= endDate
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp.toDate()
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const formatDateHeader = () => {
    if (!selectedDate) return 'Select a date'
    if (endDate) {
      return `${selectedDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
    }
    return selectedDate.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleViewInChat = () => {
    if (selectedDate && onSelectDate) {
      onSelectDate({
        startDate: selectedDate,
        endDate: endDate || selectedDate
      })
    }
  }

  return (
    <div className="calendar-overlay" onClick={onClose}>
      <div className="calendar-modal" onClick={e => e.stopPropagation()}>
        <div className="calendar-header">
          <h3>Message History</h3>
          <button className="calendar-close" onClick={onClose}>×</button>
        </div>

        <div className="calendar-controls">
          <div className="calendar-mode-toggle">
            <button
              className={`mode-btn ${!isRangeMode ? 'active' : ''}`}
              onClick={() => { setIsRangeMode(false); setEndDate(null); setMessages([]) }}
            >
              Single Date
            </button>
            <button
              className={`mode-btn ${isRangeMode ? 'active' : ''}`}
              onClick={() => setIsRangeMode(true)}
            >
              Date Range
            </button>
          </div>
        </div>

        <div className="calendar-nav">
          <button className="nav-btn" onClick={prevMonth}>&lt;</button>
          <span className="calendar-month-label">
            {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
          <button className="nav-btn" onClick={nextMonth}>&gt;</button>
          <button className="nav-btn today-btn" onClick={goToToday}>Today</button>
        </div>

        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>
          <div className="calendar-days">
            {daysInMonth.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="calendar-day empty" />
              }

              const hasMessages = messageDates.has(date.toDateString())
              const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()
              const isEnd = endDate && date.toDateString() === endDate.toDateString()
              const isInRange = isDateInRange(date)
              const isToday = date.toDateString() === new Date().toDateString()

              return (
                <button
                  key={date.toISOString()}
                  className={`calendar-day ${hasMessages ? 'has-messages' : ''} ${isSelected ? 'selected' : ''} ${isEnd ? 'selected end' : ''} ${isInRange ? 'in-range' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => handleDateClick(date)}
                >
                  {date.getDate()}
                  {hasMessages && <span className="message-dot" />}
                </button>
              )
            })}
          </div>
        </div>

        {loading && <div className="calendar-loading">Loading dates...</div>}

        <div className="calendar-selection">
          <div className="selection-header">{formatDateHeader()}</div>
          {isRangeMode && selectedDate && !endDate && (
            <div className="selection-hint">Click another date to complete range</div>
          )}
        </div>

        {loadingMessages ? (
          <div className="calendar-messages-loading">Loading messages...</div>
        ) : messages.length > 0 ? (
          <div className="calendar-messages">
            <div className="messages-count">{messages.length} message{messages.length !== 1 ? 's' : ''}</div>
            <div className="messages-preview">
              {messages.slice(0, 20).map(msg => (
                <div
                  key={msg.id}
                  className={`preview-message ${msg.senderId === currentUser.uid ? 'own' : 'other'}`}
                >
                  <span className="preview-time">{formatTime(msg.createdAt)}</span>
                  <span className="preview-text">
                    {msg.type === 'file' ? `📎 ${msg.file?.fileName || 'File'}` :
                     msg.type === 'voice' ? '🎤 Voice note' :
                     msg.text?.substring(0, 100) || '...'}
                    {msg.text?.length > 100 ? '...' : ''}
                  </span>
                </div>
              ))}
              {messages.length > 20 && (
                <div className="preview-more">+ {messages.length - 20} more messages</div>
              )}
            </div>
            <button className="view-in-chat-btn" onClick={handleViewInChat}>
              View in Chat
            </button>
          </div>
        ) : selectedDate ? (
          <div className="calendar-no-messages">No messages for this {isRangeMode && endDate ? 'period' : 'date'}</div>
        ) : null}
      </div>
    </div>
  )
}

export default MessageCalendar

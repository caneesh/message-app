import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  senderId: string
  text: string
  timestamp: Date
  status: 'sending' | 'sent' | 'delivered' | 'read'
  type?: 'text' | 'decision' | 'promise'
}

interface PremiumChatProps {
  messages: Message[]
  currentUserId: string
  partnerName: string
  partnerAvatar?: string
  onSendMessage: (text: string) => void
}

export function PremiumChat({
  messages,
  currentUserId,
  partnerName,
  partnerAvatar,
  onSendMessage,
}: PremiumChatProps) {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  const handleSend = () => {
    if (!inputValue.trim()) return
    onSendMessage(inputValue.trim())
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const groupedMessages = groupMessagesByDate(messages)

  return (
    <div className="flex flex-col h-full bg-[var(--bg-canvas)]">
      {/* Minimal header */}
      <header className={cn(
        'flex-shrink-0 flex items-center justify-between',
        'h-14 px-6',
        'bg-[var(--bg-glass)] backdrop-blur-xl',
        'border-b border-[var(--border-subtle)]'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-full',
            'bg-gradient-to-br from-emerald-400 to-teal-500',
            'flex items-center justify-center',
            'text-white text-sm font-medium'
          )}>
            {partnerAvatar ? (
              <img src={partnerAvatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              partnerName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-[15px] font-medium text-[var(--text-primary)]">
              {partnerName}
            </h1>
          </div>
        </div>

        <button className={cn(
          'p-2 rounded-lg',
          'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
          'hover:bg-[var(--bg-tertiary)]',
          'transition-colors'
        )}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </header>

      {/* Messages area - centered column */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-6 py-6">
          <AnimatePresence initial={false}>
            {groupedMessages.map((group) => (
              <div key={group.date} className="mb-8">
                {/* Date separator */}
                <div className="flex items-center justify-center mb-6">
                  <span className={cn(
                    'px-3 py-1 rounded-full',
                    'text-[11px] font-medium text-[var(--text-muted)]',
                    'bg-[var(--bg-tertiary)]'
                  )}>
                    {formatDateLabel(group.date)}
                  </span>
                </div>

                {/* Messages */}
                <div className="space-y-4">
                  {group.messages.map((message, index) => {
                    const isOwn = message.senderId === currentUserId
                    const showAvatar = !isOwn && (index === 0 || group.messages[index - 1].senderId !== message.senderId)
                    const isLastInGroup = index === group.messages.length - 1 || group.messages[index + 1].senderId !== message.senderId

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className={cn(
                          'flex gap-2',
                          isOwn ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {/* Partner avatar */}
                        {!isOwn && (
                          <div className="w-6 flex-shrink-0 mt-auto">
                            {showAvatar && (
                              <div className={cn(
                                'w-6 h-6 rounded-full',
                                'bg-gradient-to-br from-emerald-400 to-teal-500',
                                'flex items-center justify-center',
                                'text-white text-[10px] font-medium'
                              )}>
                                {partnerAvatar ? (
                                  <img src={partnerAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  partnerName.charAt(0).toUpperCase()
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message bubble - minimal */}
                        <div className={cn(
                          'max-w-[75%] group'
                        )}>
                          <div
                            className={cn(
                              'px-3.5 py-2 rounded-2xl',
                              'text-[14px] leading-relaxed',
                              isOwn
                                ? 'bg-[var(--bubble-own)] text-[var(--bubble-own-text)] rounded-br-md'
                                : 'text-[var(--bubble-other-text)]',
                              !isOwn && 'bg-transparent'
                            )}
                          >
                            <p className="whitespace-pre-wrap">{message.text}</p>
                          </div>

                          {/* Timestamp - only show on last message in group */}
                          {isLastInGroup && (
                            <div className={cn(
                              'flex items-center gap-1.5 mt-1 px-1',
                              isOwn && 'justify-end'
                            )}>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {formatTime(message.timestamp)}
                              </span>
                              {isOwn && <MessageStatus status={message.status} />}
                            </div>
                          )}
                        </div>

                        {/* Spacer for own messages */}
                        {isOwn && <div className="w-6 flex-shrink-0" />}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Floating composer */}
      <footer className="flex-shrink-0 px-6 py-4">
        <div className="max-w-[640px] mx-auto">
          <div
            className={cn(
              'flex items-end gap-3 p-2',
              'bg-[var(--bg-primary)] rounded-2xl',
              'border border-[var(--border-light)]',
              'shadow-[var(--shadow-float)]',
              'transition-all duration-200',
              isFocused && 'border-[var(--accent)] ring-4 ring-[var(--accent-subtle)]'
            )}
          >
            {/* Attachment button */}
            <button className={cn(
              'flex-shrink-0 p-2 rounded-xl',
              'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
              'hover:bg-[var(--bg-tertiary)]',
              'transition-colors'
            )}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Input */}
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Write a message..."
              rows={1}
              className={cn(
                'flex-1 py-2 px-1',
                'text-[14px] text-[var(--text-primary)]',
                'placeholder:text-[var(--text-muted)]',
                'bg-transparent resize-none',
                'focus:outline-none',
                'max-h-[120px]'
              )}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className={cn(
                'flex-shrink-0 p-2.5 rounded-xl',
                'transition-all duration-200',
                inputValue.trim()
                  ? 'bg-[var(--accent)] text-white hover:opacity-90'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <QuickAction icon="decision" label="New Decision" />
            <QuickAction icon="promise" label="Make Promise" />
            <QuickAction icon="reminder" label="Set Reminder" />
          </div>
        </div>
      </footer>
    </div>
  )
}

function QuickAction({ icon, label }: { icon: string; label: string }) {
  const icons: Record<string, JSX.Element> = {
    decision: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    promise: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    reminder: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  }

  return (
    <button className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5',
      'text-[11px] font-medium text-[var(--text-tertiary)]',
      'bg-[var(--bg-secondary)] rounded-full',
      'border border-[var(--border-subtle)]',
      'hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)]',
      'transition-colors'
    )}>
      {icons[icon]}
      {label}
    </button>
  )
}

function MessageStatus({ status }: { status: Message['status'] }) {
  if (status === 'sending') {
    return (
      <div className="w-3 h-3 rounded-full border border-[var(--text-muted)] border-t-transparent animate-spin" />
    )
  }
  if (status === 'read') {
    return (
      <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
      </svg>
    )
  }
  return (
    <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = []

  messages.forEach((message) => {
    const date = message.timestamp.toDateString()
    const lastGroup = groups[groups.length - 1]

    if (lastGroup && lastGroup.date === date) {
      lastGroup.messages.push(message)
    } else {
      groups.push({ date, messages: [message] })
    }
  })

  return groups
}

function formatDateLabel(dateString: string) {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default PremiumChat

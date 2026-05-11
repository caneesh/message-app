import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { formatRelativeTime, formatTime } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { messageItem } from '@/animations/variants/list'

interface Message {
  id: string
  senderId: string
  text: string
  timestamp: Date
  status: 'sending' | 'sent' | 'delivered' | 'read'
  reactions?: { emoji: string; userId: string }[]
  replyTo?: { id: string; text: string; senderId: string }
}

interface ChatPageProps {
  chatId: string
  currentUserId: string
  partnerName: string
  partnerAvatarUrl?: string
}

export function ChatPage({ chatId, currentUserId, partnerName, partnerAvatarUrl }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`
    }
  }, [inputValue])

  const handleSend = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUserId,
      text: inputValue,
      timestamp: new Date(),
      status: 'sending',
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, senderId: replyingTo.senderId } : undefined,
    }

    setMessages((prev) => [...prev, newMessage])
    setInputValue('')
    setReplyingTo(null)

    // Simulate send
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMessage.id ? { ...m, status: 'sent' } : m))
      )
    }, 500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-surface-primary">
      {/* Header */}
      <header className="flex-shrink-0 bg-surface-secondary/80 backdrop-blur-xl border-b border-border-light safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="p-2 -ml-2 rounded-lg hover:bg-surface-tertiary transition-colors lg:hidden">
              <svg className="w-5 h-5 text-content-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
              {partnerName.charAt(0)}
            </div>
            <div>
              <h1 className="font-semibold text-content-primary">{partnerName}</h1>
              <p className="text-xs text-content-tertiary">
                {isTyping ? 'typing...' : 'Active now'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-surface-tertiary transition-colors">
              <svg className="w-5 h-5 text-content-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button className="p-2 rounded-lg hover:bg-surface-tertiary transition-colors">
              <svg className="w-5 h-5 text-content-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const isOwn = message.senderId === currentUserId
              const showAvatar = !isOwn && (index === 0 || messages[index - 1].senderId !== message.senderId)

              return (
                <motion.div
                  key={message.id}
                  variants={messageItem}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={cn('flex gap-2', isOwn && 'flex-row-reverse')}
                >
                  {/* Avatar */}
                  <div className="w-8 flex-shrink-0">
                    {showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-semibold">
                        {partnerName.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Message bubble */}
                  <div className={cn('max-w-[70%] group', isOwn && 'items-end')}>
                    {/* Reply preview */}
                    {message.replyTo && (
                      <div className={cn(
                        'text-xs px-3 py-1.5 mb-1 rounded-lg',
                        'bg-surface-tertiary border-l-2 border-primary-400',
                        'text-content-secondary line-clamp-1'
                      )}>
                        {message.replyTo.text}
                      </div>
                    )}

                    <div
                      className={cn(
                        'px-4 py-2.5 rounded-2xl',
                        isOwn
                          ? 'bg-primary-500 text-white rounded-br-md'
                          : 'bg-surface-tertiary text-content-primary rounded-bl-md'
                      )}
                    >
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.text}</p>
                    </div>

                    {/* Timestamp & status */}
                    <div className={cn(
                      'flex items-center gap-1 mt-1 px-1',
                      isOwn && 'flex-row-reverse'
                    )}>
                      <span className="text-xs text-content-tertiary">
                        {formatTime({ toDate: () => message.timestamp } as any)}
                      </span>
                      {isOwn && (
                        <MessageStatus status={message.status} />
                      )}
                    </div>

                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className={cn('flex gap-1 mt-1', isOwn && 'justify-end')}>
                        {message.reactions.map((reaction, i) => (
                          <span key={i} className="text-sm bg-surface-tertiary rounded-full px-1.5 py-0.5">
                            {reaction.emoji}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={cn(
                    'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                    isOwn && 'flex-row-reverse'
                  )}>
                    <button
                      onClick={() => setReplyingTo(message)}
                      className="p-1.5 rounded-lg hover:bg-surface-tertiary"
                    >
                      <svg className="w-4 h-4 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Composer */}
      <footer className="flex-shrink-0 bg-surface-secondary border-t border-border-light safe-area-bottom">
        {/* Reply preview */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pt-3 overflow-hidden"
            >
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-tertiary">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-8 bg-primary-500 rounded-full" />
                  <div>
                    <p className="text-xs text-primary-600 font-medium">
                      Replying to {replyingTo.senderId === currentUserId ? 'yourself' : partnerName}
                    </p>
                    <p className="text-sm text-content-secondary line-clamp-1">{replyingTo.text}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 rounded hover:bg-surface-sunken"
                >
                  <svg className="w-4 h-4 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2 px-4 py-3">
          <button className="flex-shrink-0 p-2 rounded-xl hover:bg-surface-tertiary transition-colors">
            <svg className="w-6 h-6 text-content-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              rows={1}
              className={cn(
                'w-full px-4 py-2.5 rounded-2xl resize-none',
                'bg-surface-tertiary border border-transparent',
                'text-content-primary placeholder:text-content-tertiary',
                'focus:outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100',
                'transition-all'
              )}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={cn(
              'flex-shrink-0 p-2.5 rounded-xl transition-all',
              inputValue.trim()
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-surface-tertiary text-content-tertiary'
            )}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  )
}

function MessageStatus({ status }: { status: Message['status'] }) {
  if (status === 'sending') {
    return (
      <svg className="w-3.5 h-3.5 text-content-tertiary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (status === 'read') {
    return (
      <svg className="w-3.5 h-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  return (
    <svg className="w-3.5 h-3.5 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

// Mock data
const mockMessages: Message[] = [
  { id: '1', senderId: 'partner', text: "Hey! How was your day?", timestamp: new Date(Date.now() - 1000 * 60 * 60), status: 'read' },
  { id: '2', senderId: 'user', text: "Pretty good! Had a productive meeting this morning. How about you?", timestamp: new Date(Date.now() - 1000 * 60 * 55), status: 'read' },
  { id: '3', senderId: 'partner', text: "Same here! Actually, I wanted to talk about our dinner plans for Friday. I was thinking we could try that new Italian place downtown?", timestamp: new Date(Date.now() - 1000 * 60 * 50), status: 'read' },
  { id: '4', senderId: 'user', text: "That sounds great! I've heard really good things about it. Should we make a reservation?", timestamp: new Date(Date.now() - 1000 * 60 * 45), status: 'read', reactions: [{ emoji: '❤️', userId: 'partner' }] },
  { id: '5', senderId: 'partner', text: "Yes! I'll book for 7pm. Can't wait 😊", timestamp: new Date(Date.now() - 1000 * 60 * 40), status: 'read' },
]

export default ChatPage

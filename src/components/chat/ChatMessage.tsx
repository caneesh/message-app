import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { formatTime, truncateText, isImageType, formatFileSize } from '@/lib/utils'
import { IconButton } from '@/components/ui'
import type { Message, Reaction, EmotionalReceipt } from '@/types'

interface ChatMessageProps {
  message: Message
  isOwn: boolean
  reactions?: Reaction[]
  emotionalReceipts?: EmotionalReceipt[]
  currentUserId: string
  friendLastReadAt?: any
  isPinned?: boolean
  onReply?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onPin?: () => void
  onReact?: (emoji: string) => void
  onMore?: () => void
  showActions?: boolean
  children?: ReactNode
}

export function ChatMessage({
  message,
  isOwn,
  reactions = [],
  emotionalReceipts = [],
  currentUserId,
  friendLastReadAt,
  isPinned,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onReact,
  onMore,
  showActions = true,
  children,
}: ChatMessageProps) {
  const [showActionBar, setShowActionBar] = useState(false)
  const isFileMessage = message.type === 'file'
  const isUrgent = message.text?.toLowerCase().includes('sos') || message.text?.toLowerCase().includes('urgent')

  const isRead =
    isOwn &&
    message.createdAt &&
    friendLastReadAt &&
    friendLastReadAt.toMillis?.() >= message.createdAt.toMillis?.()

  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = []
    acc[r.emoji].push(r.uid)
    return acc
  }, {} as Record<string, string[]>)

  return (
    <div
      className={cn(
        'group relative max-w-[80%] sm:max-w-[75%]',
        'animate-slide-up',
        isOwn ? 'ml-auto' : 'mr-auto'
      )}
      onMouseEnter={() => setShowActionBar(true)}
      onMouseLeave={() => setShowActionBar(false)}
    >
      {message.replyTo && (
        <div
          className={cn(
            'mb-1 px-3 py-1.5 rounded-lg text-sm',
            'border-l-2',
            isOwn
              ? 'bg-white/20 border-white/50'
              : 'bg-black/5 border-accent'
          )}
        >
          <span className="block text-xs font-semibold opacity-70">
            {message.replyTo.senderId === currentUserId ? 'You' : 'Friend'}
          </span>
          <span className="opacity-80">{message.replyTo.textPreview}</span>
        </div>
      )}

      <div
        className={cn(
          'relative px-4 py-3 rounded-2xl',
          'transition-shadow duration-200',
          isOwn
            ? cn(
                'bg-gradient-to-br from-accent to-purple-500 text-white',
                'rounded-br-md shadow-sm',
                isUrgent && 'from-danger to-red-600'
              )
            : cn(
                'bg-surface-tertiary text-content-primary',
                'rounded-bl-md',
                isUrgent && 'bg-danger-light border border-danger/20'
              )
        )}
      >
        {!isOwn && (
          <div className="text-xs font-medium opacity-60 mb-1">
            {message.senderPhone}
          </div>
        )}

        {isFileMessage && message.file ? (
          <FileContent file={message.file} isOwn={isOwn} />
        ) : (
          <div className="text-base leading-relaxed break-words">
            {message.text}
          </div>
        )}

        {message.edited && (
          <span className="text-xs opacity-50 italic ml-1">(edited)</span>
        )}

        <div className="flex items-center justify-end gap-1 mt-1 text-xs opacity-60">
          {formatTime(message.createdAt)}
          {isRead && <span className="ml-1">✓✓</span>}
        </div>

        {showActions && showActionBar && (
          <QuickActionBar
            isOwn={isOwn}
            isFile={isFileMessage}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onPin={onPin}
            isPinned={isPinned}
            onMore={onMore}
          />
        )}
      </div>

      {Object.keys(groupedReactions).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {Object.entries(groupedReactions).map(([emoji, uids]) => (
            <button
              key={emoji}
              onClick={() => onReact?.(emoji)}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm',
                'transition-all duration-200 hover:scale-105',
                uids.includes(currentUserId)
                  ? 'bg-accent/20 text-accent'
                  : isOwn
                    ? 'bg-white/20'
                    : 'bg-black/5'
              )}
            >
              {emoji}
              {uids.length > 1 && <span className="text-xs">{uids.length}</span>}
            </button>
          ))}
        </div>
      )}

      {emotionalReceipts.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {emotionalReceipts.map((r) => (
            <span
              key={r.uid}
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                r.uid === currentUserId
                  ? 'bg-accent-secondary-light text-accent-secondary'
                  : 'bg-info-light text-info'
              )}
            >
              {r.receipt}
              {r.uid !== currentUserId && <span className="opacity-60"> (friend)</span>}
            </span>
          ))}
        </div>
      )}

      {children}
    </div>
  )
}

interface FileContentProps {
  file: Message['file']
  isOwn: boolean
}

function FileContent({ file, isOwn }: FileContentProps) {
  if (!file?.url) {
    return <div className="text-sm opacity-70">Loading file...</div>
  }

  if (isImageType(file.contentType)) {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={file.url}
          alt={file.fileName}
          className="max-w-full max-h-64 rounded-lg object-contain"
        />
      </a>
    )
  }

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'transition-colors duration-200',
        isOwn
          ? 'bg-white/15 hover:bg-white/25'
          : 'bg-black/5 hover:bg-black/10'
      )}
    >
      <span className="text-2xl">
        {file.contentType === 'application/pdf' ? '📄' : '📝'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{file.fileName}</div>
        <div className="text-sm opacity-70">{formatFileSize(file.size)}</div>
      </div>
    </a>
  )
}

interface QuickActionBarProps {
  isOwn: boolean
  isFile?: boolean
  onReply?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onPin?: () => void
  isPinned?: boolean
  onMore?: () => void
}

function QuickActionBar({
  isOwn,
  isFile,
  onReply,
  onEdit,
  onDelete,
  onPin,
  isPinned,
  onMore,
}: QuickActionBarProps) {
  return (
    <div
      className={cn(
        'absolute top-0 flex items-center gap-0.5',
        'bg-surface-elevated rounded-lg shadow-lg',
        'border border-border-light',
        'p-0.5',
        'animate-fade-in',
        isOwn ? 'right-full mr-2' : 'left-full ml-2'
      )}
    >
      {onReply && (
        <IconButton variant="ghost" size="sm" label="Reply" onClick={onReply}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </IconButton>
      )}
      {onPin && (
        <IconButton variant="ghost" size="sm" label={isPinned ? 'Unpin' : 'Pin'} onClick={onPin}>
          <svg className="w-4 h-4" fill={isPinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </IconButton>
      )}
      {isOwn && !isFile && onEdit && (
        <IconButton variant="ghost" size="sm" label="Edit" onClick={onEdit}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </IconButton>
      )}
      {isOwn && onDelete && (
        <IconButton variant="danger" size="sm" label="Delete" onClick={onDelete}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </IconButton>
      )}
      {onMore && (
        <IconButton variant="ghost" size="sm" label="More" onClick={onMore}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        </IconButton>
      )}
    </div>
  )
}

export default ChatMessage

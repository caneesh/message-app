import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { Avatar } from '@/components/ui'
import { ChatMessage } from './ChatMessage'
import type { Message, Reaction, EmotionalReceipt } from '@/types'

interface MessageGroupProps {
  messages: Message[]
  senderId: string
  senderName?: string
  isOwn: boolean
  currentUserId: string
  friendLastReadAt?: any
  reactions?: Record<string, Reaction[]>
  emotionalReceipts?: Record<string, EmotionalReceipt[]>
  pinnedMessageIds?: string[]
  onReply?: (messageId: string) => void
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onPin?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  className?: string
}

export function MessageGroup({
  messages,
  senderId,
  senderName,
  isOwn,
  currentUserId,
  friendLastReadAt,
  reactions = {},
  emotionalReceipts = {},
  pinnedMessageIds = [],
  onReply,
  onEdit,
  onDelete,
  onPin,
  onReact,
  className,
}: MessageGroupProps) {
  if (messages.length === 0) return null

  const firstMessage = messages[0]
  const showAvatar = !isOwn

  return (
    <div
      className={cn(
        'flex gap-2',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {showAvatar && (
        <div className="flex-shrink-0 self-end mb-1">
          <Avatar
            fallback={senderName || senderId.slice(0, 2)}
            size="sm"
          />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col gap-0.5',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        {!isOwn && senderName && (
          <span className="text-xs font-medium text-content-tertiary ml-3 mb-1">
            {senderName}
          </span>
        )}

        {messages.map((message, index) => {
          const isFirst = index === 0
          const isLast = index === messages.length - 1
          const isPinned = pinnedMessageIds.includes(message.id)
          const messageReactions = reactions[message.id] || []
          const messageReceipts = emotionalReceipts[message.id] || []

          return (
            <div
              key={message.id}
              className={cn(
                'transition-all duration-150',
                !isFirst && !isLast && 'my-px'
              )}
            >
              <ChatMessage
                message={message}
                isOwn={isOwn}
                reactions={messageReactions}
                emotionalReceipts={messageReceipts}
                currentUserId={currentUserId}
                friendLastReadAt={isLast ? friendLastReadAt : undefined}
                isPinned={isPinned}
                onReply={onReply ? () => onReply(message.id) : undefined}
                onEdit={onEdit ? () => onEdit(message.id) : undefined}
                onDelete={onDelete ? () => onDelete(message.id) : undefined}
                onPin={onPin ? () => onPin(message.id) : undefined}
                onReact={onReact ? (emoji) => onReact(message.id, emoji) : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface DateSeparatorProps {
  date: any
  className?: string
}

export function DateSeparator({ date, className }: DateSeparatorProps) {
  return (
    <div className={cn('flex items-center justify-center my-4', className)}>
      <div className="flex-1 h-px bg-border-light" />
      <span className="px-4 text-xs font-medium text-content-tertiary bg-surface-primary">
        {formatDate(date)}
      </span>
      <div className="flex-1 h-px bg-border-light" />
    </div>
  )
}

interface UnreadSeparatorProps {
  count: number
  className?: string
}

export function UnreadSeparator({ count, className }: UnreadSeparatorProps) {
  return (
    <div className={cn('flex items-center justify-center my-3', className)}>
      <div className="flex-1 h-px bg-accent/30" />
      <span className="px-3 py-1 text-xs font-semibold text-accent bg-accent/10 rounded-full">
        {count} new message{count !== 1 ? 's' : ''}
      </span>
      <div className="flex-1 h-px bg-accent/30" />
    </div>
  )
}

export default MessageGroup

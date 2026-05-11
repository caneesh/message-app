import { useState, useRef, type FormEvent, type ChangeEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui'

interface FloatingComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  placeholder?: string
  disabled?: boolean
  sending?: boolean
  maxLength?: number
  showQuickActions?: boolean
  onToggleQuickActions?: () => void
  onAttachClick?: () => void
  showToneButton?: boolean
  onToneClick?: () => void
  leftActions?: ReactNode
  rightActions?: ReactNode
  replyPreview?: {
    label: string
    text: string
    onCancel: () => void
  }
  error?: string
}

export function FloatingComposer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type a message...',
  disabled = false,
  sending = false,
  maxLength = 2000,
  showQuickActions,
  onToggleQuickActions,
  onAttachClick,
  showToneButton,
  onToneClick,
  leftActions,
  rightActions,
  replyPreview,
  error,
}: FloatingComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const trimmedValue = value.trim()
  const isOverLimit = trimmedValue.length > maxLength

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div
      className={cn(
        'px-4 py-3',
        'bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl',
        'border-t border-border-light'
      )}
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
      }}
    >
      {error && (
        <div className="mb-2 px-3 py-2 bg-danger-light text-danger text-sm rounded-lg">
          {error}
        </div>
      )}

      {isOverLimit && (
        <div className="mb-2 px-3 py-2 bg-danger-light text-danger text-sm rounded-lg">
          Message too long ({trimmedValue.length}/{maxLength})
        </div>
      )}

      {replyPreview && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-accent/10 border-l-3 border-accent rounded-lg">
          <div className="flex-1 min-w-0">
            <span className="block text-xs font-semibold text-accent">{replyPreview.label}</span>
            <span className="block text-sm text-content-secondary truncate">{replyPreview.text}</span>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            label="Cancel reply"
            onClick={replyPreview.onCancel}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconButton>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className={cn(
          'flex items-center gap-2',
          'px-3 py-2',
          'bg-surface-tertiary',
          'border border-border rounded-2xl',
          'transition-all duration-200',
          'focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20',
          'shadow-sm'
        )}
      >
        {onToggleQuickActions && (
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            label="Quick actions"
            onClick={onToggleQuickActions}
            disabled={disabled}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </IconButton>
        )}

        {onAttachClick && (
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            label="Attach file"
            onClick={onAttachClick}
            disabled={disabled}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </IconButton>
        )}

        {leftActions}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex-1 min-w-0',
            'bg-transparent',
            'text-base text-content-primary',
            'placeholder:text-content-tertiary',
            'focus:outline-none',
            'h-10'
          )}
          aria-label="Message input"
        />

        {showToneButton && trimmedValue.length > 5 && onToneClick && (
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            label="Soften tone"
            onClick={onToneClick}
            disabled={disabled}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </IconButton>
        )}

        {rightActions}

        <button
          type="submit"
          disabled={disabled || sending || !trimmedValue || isOverLimit}
          className={cn(
            'flex items-center justify-center',
            'h-10 px-5',
            'bg-accent text-white',
            'rounded-full',
            'text-sm font-semibold',
            'transition-all duration-200',
            'hover:bg-accent-hover hover:shadow-md',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
            'active:scale-95',
            'flex-shrink-0'
          )}
          aria-label={sending ? 'Sending' : 'Send message'}
        >
          {sending ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <span>Send</span>
          )}
        </button>
      </form>
    </div>
  )
}

export default FloatingComposer

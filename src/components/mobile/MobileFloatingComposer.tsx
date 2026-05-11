import { useState, useRef, useEffect, type FormEvent, type ChangeEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui'

interface MobileFloatingComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  placeholder?: string
  disabled?: boolean
  sending?: boolean
  maxLength?: number
  onAttachClick?: () => void
  onVoiceClick?: () => void
  onExpandTools?: () => void
  replyPreview?: {
    label: string
    text: string
    onCancel: () => void
  }
  className?: string
}

export function MobileFloatingComposer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Message...',
  disabled = false,
  sending = false,
  maxLength = 2000,
  onAttachClick,
  onVoiceClick,
  onExpandTools,
  replyPreview,
  className,
}: MobileFloatingComposerProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const trimmedValue = value.trim()
  const hasContent = trimmedValue.length > 0
  const isOverLimit = trimmedValue.length > maxLength

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      const scrollHeight = inputRef.current.scrollHeight
      inputRef.current.style.height = `${Math.min(scrollHeight, 120)}px`
    }
  }, [value])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!hasContent || isOverLimit || disabled || sending) return
    onSubmit(e)
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed left-0 right-0 z-40',
        'px-3 pb-safe',
        className
      )}
      style={{
        bottom: 'max(12px, env(safe-area-inset-bottom))',
      }}
    >
      {replyPreview && (
        <div
          className={cn(
            'mx-1 mb-2 flex items-center gap-3',
            'px-4 py-3 rounded-2xl',
            'bg-white/95 dark:bg-gray-800/95',
            'backdrop-blur-xl',
            'border border-accent/20',
            'shadow-lg',
            'animate-slide-up'
          )}
        >
          <div className="w-1 h-8 bg-accent rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="block text-xs font-semibold text-accent">
              {replyPreview.label}
            </span>
            <span className="block text-sm text-content-secondary truncate">
              {replyPreview.text}
            </span>
          </div>
          <button
            onClick={replyPreview.onCancel}
            className="p-2 -m-2 text-content-tertiary active:text-content-primary"
            aria-label="Cancel reply"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={cn(
          'relative flex items-end gap-2',
          'p-2 rounded-[28px]',
          'bg-white/95 dark:bg-gray-800/95',
          'backdrop-blur-xl',
          'border border-border/50',
          'shadow-xl shadow-black/5',
          'transition-all duration-300',
          isFocused && 'border-accent/30 shadow-2xl shadow-accent/10'
        )}
      >
        <div className="flex items-center gap-1 flex-shrink-0">
          {onExpandTools && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={disabled}
              className={cn(
                'flex items-center justify-center',
                'w-11 h-11 rounded-full',
                'text-content-tertiary',
                'transition-all duration-200',
                'active:scale-90 active:bg-surface-tertiary',
                isExpanded && 'bg-accent/10 text-accent rotate-45'
              )}
              aria-label="More options"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}

          {onAttachClick && (
            <button
              type="button"
              onClick={onAttachClick}
              disabled={disabled}
              className={cn(
                'flex items-center justify-center',
                'w-11 h-11 rounded-full',
                'text-content-tertiary',
                'transition-all duration-200',
                'active:scale-90 active:bg-surface-tertiary'
              )}
              aria-label="Attach file"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex-1 min-w-0 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none',
              'py-3 px-1',
              'bg-transparent',
              'text-base text-content-primary leading-snug',
              'placeholder:text-content-tertiary',
              'focus:outline-none',
              'max-h-[120px]'
            )}
            style={{ fontSize: '16px' }}
            aria-label="Message input"
          />
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!hasContent && onVoiceClick && (
            <button
              type="button"
              onClick={onVoiceClick}
              disabled={disabled}
              className={cn(
                'flex items-center justify-center',
                'w-11 h-11 rounded-full',
                'text-content-tertiary',
                'transition-all duration-200',
                'active:scale-90 active:bg-surface-tertiary'
              )}
              aria-label="Voice message"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}

          <button
            type="submit"
            disabled={disabled || sending || !hasContent || isOverLimit}
            className={cn(
              'flex items-center justify-center',
              'w-11 h-11 rounded-full',
              'transition-all duration-200',
              hasContent
                ? 'bg-accent text-white shadow-md shadow-accent/30 active:scale-90'
                : 'bg-surface-tertiary text-content-tertiary',
              'disabled:opacity-50 disabled:shadow-none'
            )}
            aria-label={sending ? 'Sending' : 'Send message'}
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {isExpanded && (
        <div
          className={cn(
            'mt-2 mx-1 p-3',
            'bg-white/95 dark:bg-gray-800/95',
            'backdrop-blur-xl rounded-2xl',
            'border border-border/50',
            'shadow-lg',
            'animate-slide-up'
          )}
        >
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: '📷', label: 'Camera' },
              { icon: '🖼️', label: 'Gallery' },
              { icon: '📍', label: 'Location' },
              { icon: '📎', label: 'Document' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className={cn(
                  'flex flex-col items-center gap-2 p-3',
                  'rounded-xl',
                  'active:bg-surface-tertiary',
                  'transition-colors'
                )}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs text-content-secondary">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileFloatingComposer

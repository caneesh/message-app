import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/utils'
import type { Message } from '@/types'

interface UrgentMessageVariantProps {
  message: Message
  isOwn: boolean
  currentUserId: string
  onAcknowledge?: () => void
  onRespond?: () => void
  className?: string
}

export function UrgentMessageVariant({
  message,
  isOwn,
  currentUserId,
  onAcknowledge,
  onRespond,
  className,
}: UrgentMessageVariantProps) {
  return (
    <div
      className={cn(
        'relative max-w-[85%] sm:max-w-[80%]',
        isOwn ? 'ml-auto' : 'mr-auto',
        className
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl',
          'border-2 border-danger',
          'animate-pulse-slow',
          isOwn
            ? 'bg-gradient-to-br from-danger to-red-600 text-white rounded-br-md'
            : 'bg-danger-light text-danger rounded-bl-md'
        )}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-danger via-red-400 to-danger animate-shimmer" />

        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">
              Urgent Message
            </span>
          </div>

          <p className="text-base font-medium leading-relaxed">
            {message.text}
          </p>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/20">
            <span className="text-xs opacity-70">
              {formatTime(message.createdAt)}
            </span>

            {!isOwn && (
              <div className="flex items-center gap-2">
                {onAcknowledge && (
                  <button
                    onClick={onAcknowledge}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-medium',
                      'bg-white/20 hover:bg-white/30',
                      'transition-colors duration-200'
                    )}
                  >
                    Acknowledge
                  </button>
                )}
                {onRespond && (
                  <button
                    onClick={onRespond}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-medium',
                      'bg-white text-danger',
                      'hover:bg-white/90',
                      'transition-colors duration-200'
                    )}
                  >
                    Respond
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full bg-danger animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

interface SOSAlertBannerProps {
  senderName?: string
  onViewMessage?: () => void
  onDismiss?: () => void
  className?: string
}

export function SOSAlertBanner({
  senderName = 'Your partner',
  onViewMessage,
  onDismiss,
  className,
}: SOSAlertBannerProps) {
  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-gradient-to-r from-danger via-red-500 to-danger',
        'text-white shadow-lg',
        'animate-slide-down',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 animate-pulse">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">{senderName} sent an SOS</p>
            <p className="text-xs opacity-80">They may need your immediate attention</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onViewMessage && (
            <button
              onClick={onViewMessage}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium',
                'bg-white text-danger',
                'hover:bg-white/90',
                'transition-colors duration-200'
              )}
            >
              View Message
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default UrgentMessageVariant

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'
import type { AgreementMatch } from '@/types/ai-insights'

interface AgreementReminderCardProps {
  insight: AgreementMatch
  onGotIt?: () => void
  onViewDecision?: () => void
  onDismiss?: () => void
  autoHideDelay?: number
  className?: string
}

export function AgreementReminderCard({
  insight,
  onGotIt,
  onViewDecision,
  onDismiss,
  autoHideDelay = 8000,
  className,
}: AgreementReminderCardProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (autoHideDelay <= 0) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (100 / (autoHideDelay / 100))
        if (next <= 0) {
          clearInterval(interval)
          handleDismiss()
          return 0
        }
        return next
      })
    }, 100)

    return () => clearInterval(interval)
  }, [autoHideDelay])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss?.(), 200)
  }

  const handleGotIt = () => {
    setIsVisible(false)
    setTimeout(() => onGotIt?.(), 200)
  }

  if (!isVisible) return null

  const { decisionTitle, decisionText, decidedAt } = insight.metadata

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'rounded-2xl',
        'bg-gradient-to-r from-primary-50 to-primary-100/50',
        'border border-primary-200',
        'shadow-lg shadow-primary-100/50',
        'transition-all duration-200',
        !isVisible && 'opacity-0 translate-y-2',
        className
      )}
    >
      {/* Progress bar for auto-hide */}
      {autoHideDelay > 0 && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary-100">
          <div
            className="h-full bg-primary-400 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                You both agreed
              </span>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-primary-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="pl-10">
          <p className="text-sm font-medium text-primary-800 mb-1">
            {decisionTitle}
          </p>
          <div className="p-3 rounded-xl bg-white/60 border border-primary-100">
            <p className="text-sm text-primary-900 font-medium">
              "{decisionText}"
            </p>
          </div>
          <p className="text-xs text-primary-500 mt-2">
            Decided {formatRelativeTime(decidedAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pl-10">
          <button
            onClick={handleGotIt}
            className={cn(
              'px-4 py-2 rounded-lg',
              'bg-primary-500 text-white',
              'text-sm font-medium',
              'hover:bg-primary-600 active:bg-primary-700',
              'transition-colors'
            )}
          >
            Got it
          </button>
          <button
            onClick={onViewDecision}
            className={cn(
              'px-4 py-2 rounded-lg',
              'text-sm font-medium text-primary-600',
              'hover:bg-primary-100',
              'transition-colors'
            )}
          >
            View decision
          </button>
        </div>
      </div>
    </div>
  )
}

export default AgreementReminderCard

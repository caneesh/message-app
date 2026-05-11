import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import type { MemoryTrigger } from '@/types/ai-insights'

interface MemoryResurfaceCardProps {
  insight: MemoryTrigger
  onView?: () => void
  onDismiss?: () => void
  className?: string
}

export function MemoryResurfaceCard({
  insight,
  onView,
  onDismiss,
  className,
}: MemoryResurfaceCardProps) {
  const { memoryTitle, memoryDate, thumbnailUrl, triggerReason } = insight.metadata

  const triggerLabels: Record<typeof triggerReason, string> = {
    anniversary: 'On this day',
    keyword: 'Related memory',
    on_this_day: 'From your memories',
    contextual: 'You might enjoy',
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'rounded-2xl',
        'bg-gradient-to-br from-amber-50 to-orange-50',
        'border border-amber-200',
        'shadow-lg shadow-amber-100/50',
        className
      )}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              {triggerLabels[triggerReason]}
            </span>
          </div>

          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex gap-4">
          {/* Thumbnail */}
          {thumbnailUrl && (
            <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-amber-100">
              <img
                src={thumbnailUrl}
                alt={memoryTitle}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-amber-900 mb-1 line-clamp-2">
              {memoryTitle}
            </h4>
            <p className="text-sm text-amber-600">
              {formatDate(memoryDate, 'long')}
            </p>

            {/* Action */}
            <button
              onClick={onView}
              className={cn(
                'mt-3 inline-flex items-center gap-1.5',
                'px-4 py-2 rounded-lg',
                'bg-amber-500 text-white',
                'text-sm font-medium',
                'hover:bg-amber-600 active:bg-amber-700',
                'transition-colors'
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View memory
            </button>
          </div>
        </div>
      </div>

      {/* Decorative sparkles */}
      <div className="absolute top-3 right-12 w-2 h-2 rounded-full bg-amber-300 opacity-60" />
      <div className="absolute bottom-4 right-6 w-1.5 h-1.5 rounded-full bg-orange-300 opacity-60" />
    </div>
  )
}

export default MemoryResurfaceCard

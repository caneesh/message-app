import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DecisionWithMeta } from '@/types/decisions'

interface DecisionEditModalProps {
  decision: DecisionWithMeta
  isOpen: boolean
  onClose: () => void
  onSave: (updates: { decision: string; reason?: string; note?: string }) => void
}

export function DecisionEditModal({
  decision,
  isOpen,
  onClose,
  onSave,
}: DecisionEditModalProps) {
  const [decisionText, setDecisionText] = useState(decision.decision)
  const [reason, setReason] = useState(decision.reason || '')
  const [changeNote, setChangeNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const hasChanges = decisionText !== decision.decision || reason !== (decision.reason || '')

  const handleSubmit = async () => {
    if (!hasChanges) return

    setIsSubmitting(true)
    try {
      await onSave({
        decision: decisionText,
        reason: reason || undefined,
        note: changeNote || undefined,
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        'relative w-full sm:max-w-lg',
        'bg-surface-secondary rounded-t-3xl sm:rounded-2xl',
        'shadow-2xl',
        'max-h-[90vh] overflow-hidden',
        'flex flex-col',
        'safe-area-bottom'
      )}>
        {/* Handle for mobile */}
        <div className="sm:hidden flex justify-center py-3">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-lg font-semibold text-content-primary">
            Edit Decision
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-surface-tertiary transition-colors"
          >
            <svg className="w-5 h-5 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title (read-only) */}
          <div>
            <label className="block text-xs font-medium text-content-tertiary uppercase tracking-wider mb-2">
              Topic
            </label>
            <p className="text-base font-medium text-content-primary">
              {decision.title}
            </p>
          </div>

          {/* Decision text */}
          <div>
            <label className="block text-xs font-medium text-content-tertiary uppercase tracking-wider mb-2">
              The Decision
            </label>
            <textarea
              value={decisionText}
              onChange={(e) => setDecisionText(e.target.value)}
              rows={3}
              className={cn(
                'w-full px-4 py-3 rounded-xl',
                'bg-surface-tertiary border border-border-light',
                'text-base text-content-primary',
                'placeholder:text-content-tertiary',
                'focus:outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100',
                'transition-all'
              )}
              placeholder="What have you decided together?"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-content-tertiary uppercase tracking-wider mb-2">
              Why this decision?
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className={cn(
                'w-full px-4 py-3 rounded-xl',
                'bg-surface-tertiary border border-border-light',
                'text-base text-content-primary',
                'placeholder:text-content-tertiary',
                'focus:outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100',
                'transition-all'
              )}
              placeholder="Optional: Why did you make this decision?"
            />
          </div>

          {/* Change note */}
          {hasChanges && (
            <div>
              <label className="block text-xs font-medium text-content-tertiary uppercase tracking-wider mb-2">
                Change note
              </label>
              <input
                type="text"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                className={cn(
                  'w-full px-4 py-3 rounded-xl',
                  'bg-surface-tertiary border border-border-light',
                  'text-base text-content-primary',
                  'placeholder:text-content-tertiary',
                  'focus:outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100',
                  'transition-all'
                )}
                placeholder="Why are you making this change?"
              />
              <p className="text-xs text-content-tertiary mt-2">
                This note will be visible in the decision history
              </p>
            </div>
          )}

          {/* Warning */}
          <div className={cn(
            'flex items-start gap-3 p-4 rounded-xl',
            'bg-warning-50 border border-warning-100'
          )}>
            <svg className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-warning-800">
                Changes require re-confirmation
              </p>
              <p className="text-sm text-warning-700 mt-1">
                When you save changes, your partner will need to confirm the updated decision again.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border-light">
          <button
            onClick={onClose}
            className={cn(
              'flex-1 py-3 rounded-xl',
              'bg-surface-tertiary text-content-secondary',
              'font-semibold text-sm',
              'hover:bg-surface-sunken',
              'transition-colors'
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!hasChanges || isSubmitting}
            className={cn(
              'flex-1 py-3 rounded-xl',
              'font-semibold text-sm',
              'transition-all',
              hasChanges
                ? 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-lg shadow-primary-500/25'
                : 'bg-surface-tertiary text-content-tertiary cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DecisionEditModal

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DecisionWithMeta } from '@/types/decisions'

interface DecisionConfirmationFlowProps {
  decision: DecisionWithMeta
  isOpen: boolean
  onClose: () => void
  onConfirm: (note?: string) => void
  onDispute: (reason: string) => void
}

export function DecisionConfirmationFlow({
  decision,
  isOpen,
  onClose,
  onConfirm,
  onDispute,
}: DecisionConfirmationFlowProps) {
  const [mode, setMode] = useState<'review' | 'confirm' | 'dispute'>('review')
  const [confirmNote, setConfirmNote] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(confirmNote || undefined)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDispute = async () => {
    if (!disputeReason.trim()) return

    setIsSubmitting(true)
    try {
      await onDispute(disputeReason)
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

        {mode === 'review' && (
          <ReviewStep
            decision={decision}
            onConfirm={() => setMode('confirm')}
            onDispute={() => setMode('dispute')}
            onClose={onClose}
          />
        )}

        {mode === 'confirm' && (
          <ConfirmStep
            decision={decision}
            note={confirmNote}
            onNoteChange={setConfirmNote}
            onBack={() => setMode('review')}
            onConfirm={handleConfirm}
            isSubmitting={isSubmitting}
          />
        )}

        {mode === 'dispute' && (
          <DisputeStep
            decision={decision}
            reason={disputeReason}
            onReasonChange={setDisputeReason}
            onBack={() => setMode('review')}
            onDispute={handleDispute}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  )
}

function ReviewStep({
  decision,
  onConfirm,
  onDispute,
  onClose,
}: {
  decision: DecisionWithMeta
  onConfirm: () => void
  onDispute: () => void
  onClose: () => void
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
        <h2 className="text-lg font-semibold text-content-primary">
          Review Decision
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
        <p className="text-sm text-content-secondary">
          Your partner proposed this decision. Please review it carefully before confirming or disputing.
        </p>

        {/* The decision */}
        <div className={cn(
          'p-5 rounded-2xl',
          'bg-gradient-to-br from-primary-50 to-primary-100/50',
          'border border-primary-100'
        )}>
          <p className="text-xs font-medium text-primary-600 uppercase tracking-wider mb-2">
            {decision.title}
          </p>
          <p className="text-lg font-medium text-content-primary leading-relaxed">
            "{decision.decision}"
          </p>
        </div>

        {/* Reason */}
        {decision.reason && (
          <div className="p-4 rounded-xl bg-surface-tertiary">
            <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-2">
              Their reasoning
            </p>
            <p className="text-sm text-content-secondary">
              {decision.reason}
            </p>
          </div>
        )}

        {/* Info box */}
        <div className={cn(
          'flex items-start gap-3 p-4 rounded-xl',
          'bg-info-50 border border-info-100'
        )}>
          <svg className="w-5 h-5 text-info-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-info-800">
              What does this mean?
            </p>
            <p className="text-sm text-info-700 mt-1">
              By confirming, you agree to this decision and commit to honoring it.
              If you disagree, you can dispute it and explain why.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 px-6 py-4 border-t border-border-light">
        <button
          onClick={onDispute}
          className={cn(
            'flex-1 py-3 rounded-xl',
            'bg-surface-tertiary text-content-secondary',
            'font-semibold text-sm',
            'hover:bg-surface-sunken',
            'transition-colors'
          )}
        >
          I Disagree
        </button>
        <button
          onClick={onConfirm}
          className={cn(
            'flex-1 py-3 rounded-xl',
            'bg-primary-500 text-white',
            'font-semibold text-sm',
            'hover:bg-primary-600 active:bg-primary-700',
            'shadow-lg shadow-primary-500/25',
            'transition-colors'
          )}
        >
          I Agree
        </button>
      </div>
    </>
  )
}

function ConfirmStep({
  decision,
  note,
  onNoteChange,
  onBack,
  onConfirm,
  isSubmitting,
}: {
  decision: DecisionWithMeta
  note: string
  onNoteChange: (note: string) => void
  onBack: () => void
  onConfirm: () => void
  isSubmitting: boolean
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border-light">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-surface-tertiary transition-colors"
        >
          <svg className="w-5 h-5 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-content-primary">
          Confirm Agreement
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Success preview */}
        <div className="flex flex-col items-center text-center py-4">
          <div className={cn(
            'w-16 h-16 rounded-full mb-4',
            'bg-success-100 flex items-center justify-center'
          )}>
            <svg className="w-8 h-8 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-content-primary mb-1">
            Ready to confirm
          </h3>
          <p className="text-sm text-content-secondary max-w-xs">
            You're about to confirm that you agree with this decision
          </p>
        </div>

        {/* Optional note */}
        <div>
          <label className="block text-xs font-medium text-content-tertiary uppercase tracking-wider mb-2">
            Add a note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={2}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-surface-tertiary border border-border-light',
              'text-base text-content-primary',
              'placeholder:text-content-tertiary',
              'focus:outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100',
              'transition-all'
            )}
            placeholder="Any thoughts or comments?"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border-light">
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className={cn(
            'w-full py-3 rounded-xl',
            'bg-success-500 text-white',
            'font-semibold text-sm',
            'hover:bg-success-600 active:bg-success-700',
            'shadow-lg shadow-success-500/25',
            'transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSubmitting ? 'Confirming...' : 'Confirm Decision'}
        </button>
      </div>
    </>
  )
}

function DisputeStep({
  decision,
  reason,
  onReasonChange,
  onBack,
  onDispute,
  isSubmitting,
}: {
  decision: DecisionWithMeta
  reason: string
  onReasonChange: (reason: string) => void
  onBack: () => void
  onDispute: () => void
  isSubmitting: boolean
}) {
  const canSubmit = reason.trim().length > 0

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border-light">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-surface-tertiary transition-colors"
        >
          <svg className="w-5 h-5 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-content-primary">
          Explain Your Concerns
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <p className="text-sm text-content-secondary">
          Help your partner understand why you disagree. This opens a conversation, not a conflict.
        </p>

        {/* Reason input */}
        <div>
          <label className="block text-xs font-medium text-content-tertiary uppercase tracking-wider mb-2">
            What's your concern?
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={4}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-surface-tertiary border border-border-light',
              'text-base text-content-primary',
              'placeholder:text-content-tertiary',
              'focus:outline-none focus:border-primary-300 focus:ring-4 focus:ring-primary-100',
              'transition-all'
            )}
            placeholder="I have concerns about this because..."
          />
        </div>

        {/* Helpful tips */}
        <div className={cn(
          'p-4 rounded-xl',
          'bg-surface-tertiary border border-border-light'
        )}>
          <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-3">
            Tips for constructive feedback
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-content-secondary">
              <span className="text-success-500 mt-0.5">✓</span>
              Focus on the decision, not the person
            </li>
            <li className="flex items-start gap-2 text-sm text-content-secondary">
              <span className="text-success-500 mt-0.5">✓</span>
              Suggest an alternative if you have one
            </li>
            <li className="flex items-start gap-2 text-sm text-content-secondary">
              <span className="text-success-500 mt-0.5">✓</span>
              Be open to discussing further
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border-light">
        <button
          onClick={onDispute}
          disabled={!canSubmit || isSubmitting}
          className={cn(
            'w-full py-3 rounded-xl',
            'font-semibold text-sm',
            'transition-all',
            canSubmit
              ? 'bg-warning-500 text-white hover:bg-warning-600 active:bg-warning-700 shadow-lg shadow-warning-500/25'
              : 'bg-surface-tertiary text-content-tertiary cursor-not-allowed'
          )}
        >
          {isSubmitting ? 'Submitting...' : 'Share My Concerns'}
        </button>
      </div>
    </>
  )
}

export default DecisionConfirmationFlow

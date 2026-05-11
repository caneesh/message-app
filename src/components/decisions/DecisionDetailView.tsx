import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { DecisionWithMeta, DecisionChange, DecisionStatus } from '@/types/decisions'

interface DecisionDetailViewProps {
  decision: DecisionWithMeta
  currentUserId: string
  onBack: () => void
  onEdit: () => void
  onConfirm: () => void
  onDispute: () => void
  onComplete: () => void
  onCancel: () => void
}

export function DecisionDetailView({
  decision,
  currentUserId,
  onBack,
  onEdit,
  onConfirm,
  onDispute,
  onComplete,
  onCancel,
}: DecisionDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'conversations'>('details')

  const isOwn = decision.createdBy === currentUserId
  const needsMyConfirmation =
    decision.status === 'proposed' &&
    decision.myConfirmation?.status !== 'confirmed'
  const canEdit = decision.status === 'active' && isOwn
  const canComplete = decision.status === 'active' && decision.isFullyConfirmed

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Header */}
      <header className={cn(
        'sticky top-0 z-20',
        'bg-surface-secondary/80 backdrop-blur-xl',
        'border-b border-border-light',
        'safe-area-top'
      )}>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary-600 font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={onEdit}
                className={cn(
                  'px-3 py-1.5 rounded-lg',
                  'text-sm font-medium text-content-secondary',
                  'hover:bg-surface-tertiary',
                  'transition-colors'
                )}
              >
                Edit
              </button>
            )}
            <button className="p-2 rounded-lg hover:bg-surface-tertiary transition-colors">
              <svg className="w-5 h-5 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pb-32">
        {/* Status banner */}
        <StatusBanner status={decision.status} />

        {/* Decision header */}
        <div className="px-6 py-6">
          <div className="flex items-start gap-4 mb-4">
            <div className={cn(
              'flex-shrink-0 w-12 h-12 rounded-xl',
              'flex items-center justify-center',
              statusIconBg[decision.status]
            )}>
              {statusIcons[decision.status]}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-content-primary mb-1">
                {decision.title}
              </h1>
              <div className="flex items-center gap-2 text-sm text-content-tertiary">
                <span>{isOwn ? 'You proposed' : 'Partner proposed'}</span>
                <span>·</span>
                <span>{formatRelativeTime(decision.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Confirmation status */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-tertiary mb-6">
            <ConfirmationBadge
              label="You"
              status={decision.myConfirmation?.status}
            />
            <div className="flex-1 h-px bg-border-light" />
            <ConfirmationBadge
              label="Partner"
              status={decision.partnerConfirmation?.status}
            />
          </div>

          {/* The decision itself */}
          <div className={cn(
            'p-5 rounded-2xl',
            'bg-gradient-to-br from-primary-50 to-primary-100/50',
            'border border-primary-100'
          )}>
            <p className="text-lg font-medium text-content-primary leading-relaxed">
              "{decision.decision}"
            </p>
          </div>

          {/* Reason */}
          {decision.reason && (
            <div className="mt-4 p-4 rounded-xl bg-surface-tertiary">
              <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-2">
                Reasoning
              </p>
              <p className="text-sm text-content-secondary">
                {decision.reason}
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-6 mb-4">
          <div className="flex gap-1 p-1 rounded-xl bg-surface-tertiary">
            {(['details', 'history', 'conversations'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg',
                  'text-sm font-medium',
                  'transition-colors',
                  activeTab === tab
                    ? 'bg-surface-secondary text-content-primary shadow-sm'
                    : 'text-content-tertiary hover:text-content-secondary'
                )}
              >
                {tab === 'details' && 'Details'}
                {tab === 'history' && `History (${decision.changeCount})`}
                {tab === 'conversations' && `Links (${decision.linkedConversations.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-6">
          {activeTab === 'details' && (
            <DetailsTab decision={decision} />
          )}
          {activeTab === 'history' && (
            <HistoryTab changes={decision.history} currentUserId={currentUserId} />
          )}
          {activeTab === 'conversations' && (
            <ConversationsTab conversations={decision.linkedConversations} />
          )}
        </div>
      </main>

      {/* Bottom action bar */}
      {(needsMyConfirmation || canComplete) && (
        <div className={cn(
          'fixed bottom-0 left-0 right-0',
          'bg-surface-secondary/90 backdrop-blur-xl',
          'border-t border-border-light',
          'px-6 py-4 safe-area-bottom'
        )}>
          {needsMyConfirmation ? (
            <div className="flex gap-3">
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
                Dispute
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
                Confirm Decision
              </button>
            </div>
          ) : canComplete ? (
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className={cn(
                  'py-3 px-6 rounded-xl',
                  'bg-surface-tertiary text-content-secondary',
                  'font-semibold text-sm',
                  'hover:bg-surface-sunken',
                  'transition-colors'
                )}
              >
                Cancel
              </button>
              <button
                onClick={onComplete}
                className={cn(
                  'flex-1 py-3 rounded-xl',
                  'bg-success-500 text-white',
                  'font-semibold text-sm',
                  'hover:bg-success-600 active:bg-success-700',
                  'shadow-lg shadow-success-500/25',
                  'transition-colors'
                )}
              >
                Mark as Completed
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function StatusBanner({ status }: { status: DecisionStatus }) {
  if (status === 'active') return null

  const config: Record<DecisionStatus, { bg: string; text: string; message: string } | null> = {
    draft: { bg: 'bg-neutral-100', text: 'text-neutral-700', message: 'This decision is still a draft' },
    proposed: { bg: 'bg-warning-50', text: 'text-warning-700', message: 'Waiting for both partners to confirm' },
    active: null,
    changed: { bg: 'bg-info-50', text: 'text-info-700', message: 'This decision was recently changed' },
    completed: { bg: 'bg-success-50', text: 'text-success-700', message: 'This decision has been completed' },
    cancelled: { bg: 'bg-neutral-100', text: 'text-neutral-600', message: 'This decision was cancelled' },
  }

  const c = config[status]
  if (!c) return null

  return (
    <div className={cn('px-4 py-3 text-center text-sm font-medium', c.bg, c.text)}>
      {c.message}
    </div>
  )
}

function ConfirmationBadge({ label, status }: { label: string; status?: string }) {
  const isConfirmed = status === 'confirmed'
  const isDisputed = status === 'disputed'

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          isConfirmed
            ? 'bg-success-100 text-success-600'
            : isDisputed
            ? 'bg-danger-100 text-danger-600'
            : 'bg-neutral-100 text-neutral-400'
        )}
      >
        {isConfirmed ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : isDisputed ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <span className={cn(
        'text-xs font-medium',
        isConfirmed ? 'text-success-600' : isDisputed ? 'text-danger-600' : 'text-content-tertiary'
      )}>
        {label}
      </span>
    </div>
  )
}

function DetailsTab({ decision }: { decision: DecisionWithMeta }) {
  return (
    <div className="space-y-4">
      <DetailRow
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
        label="Created"
        value={formatDate(decision.createdAt, 'long')}
      />
      <DetailRow
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        label="Last updated"
        value={formatRelativeTime(decision.updatedAt)}
      />
      <DetailRow
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        }
        label="Revisions"
        value={decision.changeCount.toString()}
      />
      <DetailRow
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        }
        label="Linked conversations"
        value={decision.linkedConversations.length.toString()}
      />
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-tertiary">
      <div className="text-content-tertiary">{icon}</div>
      <span className="flex-1 text-sm text-content-secondary">{label}</span>
      <span className="text-sm font-medium text-content-primary">{value}</span>
    </div>
  )
}

function HistoryTab({
  changes,
  currentUserId,
}: {
  changes: DecisionChange[]
  currentUserId: string
}) {
  if (changes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-content-tertiary">No changes yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {changes.map((change, index) => (
        <div
          key={index}
          className={cn(
            'p-4 rounded-xl',
            'bg-surface-tertiary border border-border-light'
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              change.type === 'created' && 'bg-success-50 text-success-700',
              change.type === 'modified' && 'bg-info-50 text-info-700',
              change.type === 'confirmed' && 'bg-primary-50 text-primary-700',
              change.type === 'disputed' && 'bg-danger-50 text-danger-700',
              change.type === 'cancelled' && 'bg-neutral-100 text-neutral-600',
              change.type === 'completed' && 'bg-success-50 text-success-700'
            )}>
              {change.type.charAt(0).toUpperCase() + change.type.slice(1)}
            </span>
            <span className="text-xs text-content-tertiary">
              {change.changedBy === currentUserId ? 'You' : 'Partner'}
            </span>
            <span className="text-xs text-content-tertiary">·</span>
            <span className="text-xs text-content-tertiary">
              {formatRelativeTime(change.changedAt)}
            </span>
          </div>
          {change.previousValue && change.newValue && (
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-danger-500 font-mono">-</span>
                <span className="text-content-secondary line-through">{change.previousValue}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-success-500 font-mono">+</span>
                <span className="text-content-primary">{change.newValue}</span>
              </div>
            </div>
          )}
          {change.note && (
            <p className="text-sm text-content-secondary mt-2 italic">
              "{change.note}"
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function ConversationsTab({
  conversations,
}: {
  conversations: Array<{ messageId: string; excerpt: string; linkedAt: any }>
}) {
  if (conversations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-content-tertiary">No linked conversations</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {conversations.map((conv, index) => (
        <div
          key={index}
          className={cn(
            'p-4 rounded-xl cursor-pointer',
            'bg-surface-tertiary border border-border-light',
            'hover:border-border hover:shadow-sm',
            'transition-all'
          )}
        >
          <p className="text-sm text-content-primary line-clamp-2 mb-2">
            "{conv.excerpt}"
          </p>
          <p className="text-xs text-content-tertiary">
            Linked {formatRelativeTime(conv.linkedAt)}
          </p>
        </div>
      ))}
    </div>
  )
}

const statusIconBg: Record<DecisionStatus, string> = {
  draft: 'bg-neutral-100',
  proposed: 'bg-warning-50',
  active: 'bg-primary-50',
  changed: 'bg-info-50',
  completed: 'bg-success-50',
  cancelled: 'bg-neutral-100',
}

const statusIcons: Record<DecisionStatus, JSX.Element> = {
  draft: (
    <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  proposed: (
    <svg className="w-6 h-6 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  active: (
    <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  changed: (
    <svg className="w-6 h-6 text-info-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  completed: (
    <svg className="w-6 h-6 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  cancelled: (
    <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
}

export default DecisionDetailView

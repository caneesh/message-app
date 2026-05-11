import { cn } from '@/lib/utils'

interface DecisionEmptyStateProps {
  hasFilters: boolean
  onCreateDecision: () => void
  onClearFilters: () => void
}

export function DecisionEmptyState({
  hasFilters,
  onCreateDecision,
  onClearFilters,
}: DecisionEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className={cn(
          'w-16 h-16 rounded-2xl mb-6',
          'bg-neutral-100 flex items-center justify-center'
        )}>
          <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-content-primary mb-2">
          No matching decisions
        </h3>
        <p className="text-sm text-content-secondary max-w-sm mb-6">
          Try adjusting your search or filters to find what you're looking for.
        </p>
        <button
          onClick={onClearFilters}
          className={cn(
            'px-4 py-2 rounded-lg',
            'bg-surface-tertiary text-content-primary',
            'font-medium text-sm',
            'hover:bg-surface-sunken',
            'transition-colors'
          )}
        >
          Clear filters
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className={cn(
          'w-24 h-24 rounded-3xl',
          'bg-gradient-to-br from-primary-100 to-primary-50',
          'flex items-center justify-center',
          'shadow-lg shadow-primary-100/50'
        )}>
          <svg className="w-12 h-12 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-success-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="absolute -bottom-1 -left-3 w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-content-primary mb-2">
        No decisions yet
      </h3>
      <p className="text-sm text-content-secondary max-w-md mb-2">
        Decisions are shared agreements between you and your partner.
        They help you remember what you've decided together and hold each other accountable.
      </p>

      {/* Examples */}
      <div className="w-full max-w-sm mt-6 mb-8 space-y-2">
        <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-3">
          Example decisions
        </p>
        <ExampleDecision
          title="Budget for dining out"
          decision="$200/month limit"
        />
        <ExampleDecision
          title="Whose family for holidays"
          decision="Alternate years starting 2026"
        />
        <ExampleDecision
          title="Weekly date night"
          decision="Fridays at 7pm, alternate who plans"
        />
      </div>

      <button
        onClick={onCreateDecision}
        className={cn(
          'inline-flex items-center gap-2 px-6 py-3',
          'bg-primary-500 text-white rounded-xl',
          'font-semibold text-sm',
          'hover:bg-primary-600 active:bg-primary-700',
          'shadow-lg shadow-primary-500/25',
          'transition-all duration-200'
        )}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create your first decision
      </button>
    </div>
  )
}

function ExampleDecision({ title, decision }: { title: string; decision: string }) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3',
      'bg-surface-tertiary rounded-lg',
      'text-left'
    )}>
      <div className="w-2 h-2 rounded-full bg-primary-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-content-primary truncate">{title}</p>
        <p className="text-xs text-content-tertiary truncate">"{decision}"</p>
      </div>
    </div>
  )
}

export default DecisionEmptyState

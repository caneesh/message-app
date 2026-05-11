import { cn } from '@/lib/utils'

type DecisionStatus = 'all' | 'active' | 'changed' | 'cancelled'

interface DecisionFiltersProps {
  activeFilter: DecisionStatus
  onFilterChange: (filter: DecisionStatus) => void
  counts: {
    all: number
    active: number
    changed: number
    cancelled: number
  }
  className?: string
}

export function DecisionFilters({
  activeFilter,
  onFilterChange,
  counts,
  className,
}: DecisionFiltersProps) {
  const filters: { key: DecisionStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'changed', label: 'Changed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className={cn('flex items-center gap-1 p-1 bg-surface-tertiary rounded-xl', className)}>
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onFilterChange(filter.key)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            'text-sm font-medium',
            'transition-all duration-200',
            activeFilter === filter.key
              ? 'bg-surface-secondary text-content-primary shadow-sm'
              : 'text-content-secondary hover:text-content-primary'
          )}
        >
          <span>{filter.label}</span>
          <span
            className={cn(
              'px-1.5 py-0.5 text-xs rounded-full',
              activeFilter === filter.key
                ? 'bg-accent/10 text-accent'
                : 'bg-surface-tertiary text-content-tertiary'
            )}
          >
            {counts[filter.key]}
          </span>
        </button>
      ))}
    </div>
  )
}

export default DecisionFilters

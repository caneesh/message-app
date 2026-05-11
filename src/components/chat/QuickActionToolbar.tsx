import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'

interface QuickAction {
  key: string
  label: string
  icon?: React.ReactNode
  priority?: boolean
}

interface QuickActionToolbarProps {
  actions: QuickAction[]
  onAction: (key: string) => void
  disabled?: boolean
  className?: string
}

export function QuickActionToolbar({
  actions,
  onAction,
  disabled = false,
  className,
}: QuickActionToolbarProps) {
  return (
    <div className={cn('flex flex-wrap gap-2 p-3 bg-surface-tertiary rounded-xl', className)}>
      {actions.map((action) => (
        <button
          key={action.key}
          onClick={() => onAction(action.key)}
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-2',
            'px-4 py-2 rounded-full',
            'text-sm font-medium',
            'transition-all duration-200',
            'border',
            action.priority
              ? 'bg-danger-light border-danger text-danger hover:bg-danger hover:text-white'
              : 'bg-surface-secondary border-border text-content-primary hover:border-accent hover:text-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  )
}

const defaultQuickActions: QuickAction[] = [
  { key: 'call_me', label: 'Call me', icon: <span>📞</span> },
  { key: 'need_help', label: 'I need help', icon: <span>🆘</span>, priority: true },
  { key: 'reached_safely', label: 'Reached safely', icon: <span>✅</span> },
  { key: 'running_late', label: 'Running late', icon: <span>⏰</span> },
  { key: 'on_the_way', label: 'On the way', icon: <span>🚗</span> },
  { key: 'busy_now', label: 'Busy now', icon: <span>🔇</span> },
]

export { defaultQuickActions }
export default QuickActionToolbar

import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  userName?: string
  className?: string
}

export function TypingIndicator({ userName = 'Friend', className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2 px-4 py-2', className)}>
      <div className="flex items-center gap-1 px-3 py-2 bg-surface-tertiary rounded-full">
        <span className="w-2 h-2 bg-content-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-content-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-content-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-content-tertiary italic">{userName} is typing...</span>
    </div>
  )
}

export default TypingIndicator

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Subtle pulse loader
export function PulseLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary-400"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// Breathing loader for AI thinking states
export function BreathingLoader({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        'w-12 h-12 rounded-2xl',
        'bg-gradient-to-br from-primary-100 to-primary-200',
        className
      )}
      animate={{
        scale: [1, 1.05, 1],
        opacity: [0.7, 1, 0.7],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <motion.div
        className="w-full h-full flex items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        <span className="text-xl">✨</span>
      </motion.div>
    </motion.div>
  )
}

// Skeleton loading for content
export function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('rounded-lg bg-surface-tertiary', className)}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

// Card skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 rounded-2xl bg-surface-secondary border border-border-light', className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  )
}

// Message skeleton
export function MessageSkeleton({ isOwn }: { isOwn?: boolean }) {
  return (
    <div className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
      {!isOwn && <Skeleton className="w-8 h-8 rounded-full" />}
      <div className={cn('max-w-[70%]', isOwn && 'items-end')}>
        <Skeleton className={cn('h-16 rounded-2xl', isOwn ? 'w-48' : 'w-56')} />
      </div>
    </div>
  )
}

// Inline spinner
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <motion.div
      className={cn(sizes[size], 'border-2 border-current border-t-transparent rounded-full', className)}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
  )
}

// Progress bar
export function ProgressBar({
  progress,
  className,
}: {
  progress: number
  className?: string
}) {
  return (
    <div className={cn('h-1 bg-surface-tertiary rounded-full overflow-hidden', className)}>
      <motion.div
        className="h-full bg-primary-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  )
}

// Indeterminate progress
export function IndeterminateProgress({ className }: { className?: string }) {
  return (
    <div className={cn('h-1 bg-surface-tertiary rounded-full overflow-hidden', className)}>
      <motion.div
        className="h-full w-1/3 bg-primary-500 rounded-full"
        animate={{ x: ['-100%', '400%'] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

export default {
  PulseLoader,
  BreathingLoader,
  Skeleton,
  CardSkeleton,
  MessageSkeleton,
  Spinner,
  ProgressBar,
  IndeterminateProgress,
}

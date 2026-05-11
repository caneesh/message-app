import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Checkmark animation
export function SuccessCheckmark({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <motion.div
      className={cn(
        sizes[size],
        'rounded-full bg-success-100 flex items-center justify-center',
        className
      )}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 300 }}
    >
      <motion.svg
        className={cn(iconSizes[size], 'text-success-600')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
      >
        <motion.path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M5 13l4 4L19 7"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
        />
      </motion.svg>
    </motion.div>
  )
}

// Celebration confetti burst
export function ConfettiBurst({ className }: { className?: string }) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i * 30) * (Math.PI / 180),
    color: ['#8B5CF6', '#22C55E', '#F59E0B', '#3B82F6'][i % 4],
  }))

  return (
    <div className={cn('relative w-16 h-16', className)}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
          style={{ backgroundColor: particle.color }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: Math.cos(particle.angle) * 40,
            y: Math.sin(particle.angle) * 40,
            scale: [0, 1, 0.5],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

// Heart burst for relationship moments
export function HeartBurst({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('relative', className)}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', damping: 10, stiffness: 200 }}
    >
      <motion.span
        className="text-4xl block"
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 0.4, times: [0, 0.5, 1] }}
      >
        💜
      </motion.span>
      {/* Ripple effect */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary-300"
        initial={{ scale: 0.5, opacity: 1 }}
        animate={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </motion.div>
  )
}

// Success message toast
export function SuccessToast({
  message,
  onComplete,
  className,
}: {
  message: string
  onComplete?: () => void
  className?: string
}) {
  return (
    <motion.div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl',
        'bg-success-50 border border-success-200',
        'shadow-lg shadow-success-100/50',
        className
      )}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      onAnimationComplete={onComplete}
    >
      <SuccessCheckmark size="sm" />
      <span className="text-sm font-medium text-success-800">{message}</span>
    </motion.div>
  )
}

// Promise fulfilled celebration
export function PromiseFulfilledCelebration({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('flex flex-col items-center gap-3', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
      >
        <div className="w-20 h-20 rounded-full bg-success-100 flex items-center justify-center">
          <span className="text-4xl">🤝</span>
        </div>
        <motion.div
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-success-500 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', damping: 10 }}
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      </motion.div>
      <motion.p
        className="text-lg font-semibold text-success-700"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Promise kept!
      </motion.p>
    </motion.div>
  )
}

// Decision confirmed celebration
export function DecisionConfirmedCelebration({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('flex flex-col items-center gap-3', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="relative"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
      >
        <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
          <motion.span
            className="text-4xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            ✨
          </motion.span>
        </div>
      </motion.div>
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-lg font-semibold text-primary-700">Both confirmed!</p>
        <p className="text-sm text-primary-500">This decision is now active</p>
      </motion.div>
    </motion.div>
  )
}

export default {
  SuccessCheckmark,
  ConfettiBurst,
  HeartBurst,
  SuccessToast,
  PromiseFulfilledCelebration,
  DecisionConfirmedCelebration,
}

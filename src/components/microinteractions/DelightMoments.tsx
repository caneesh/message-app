import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// Warm greeting based on time of day
export function WarmGreeting({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const hour = new Date().getHours()
  let greeting = 'Hello'
  let emoji = '👋'

  if (hour < 12) {
    greeting = 'Good morning'
    emoji = '☀️'
  } else if (hour < 17) {
    greeting = 'Good afternoon'
    emoji = '🌤️'
  } else if (hour < 21) {
    greeting = 'Good evening'
    emoji = '🌙'
  } else {
    greeting = 'Good night'
    emoji = '✨'
  }

  return (
    <motion.div
      className={cn('flex items-center gap-2', className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.span
        className="text-2xl"
        initial={{ rotate: -20, scale: 0 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 10, delay: 0.2 }}
      >
        {emoji}
      </motion.span>
      <span className="text-xl font-semibold text-content-primary">
        {greeting}, {name}
      </span>
    </motion.div>
  )
}

// Relationship anniversary badge
export function AnniversaryBadge({
  days,
  className,
}: {
  days: number
  className?: string
}) {
  const milestones = [7, 30, 100, 365, 500, 1000]
  const isMilestone = milestones.includes(days)

  if (!isMilestone) return null

  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full',
        'bg-gradient-to-r from-pink-100 to-purple-100',
        'border border-pink-200',
        className
      )}
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', damping: 10 }}
    >
      <motion.span
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.5, repeat: 3 }}
      >
        🎉
      </motion.span>
      <span className="text-sm font-medium text-purple-700">
        {days} days together!
      </span>
    </motion.div>
  )
}

// Floating hearts for love moments
export function FloatingHearts({
  trigger,
  className,
}: {
  trigger: boolean
  className?: string
}) {
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([])

  useEffect(() => {
    if (trigger) {
      const newHearts = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100 - 50,
      }))
      setHearts(newHearts)

      const timer = setTimeout(() => setHearts([]), 2000)
      return () => clearTimeout(timer)
    }
  }, [trigger])

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-50', className)}>
      <AnimatePresence>
        {hearts.map((heart) => (
          <motion.span
            key={heart.id}
            className="absolute left-1/2 bottom-0 text-2xl"
            initial={{ y: 0, x: heart.x, opacity: 1, scale: 0 }}
            animate={{
              y: -400,
              opacity: [1, 1, 0],
              scale: [0, 1.5, 1],
              rotate: [0, 15, -15, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          >
            💜
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Typing indicator with personality
export function TypingIndicator({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const phrases = [
    `${name} is typing...`,
    `${name} is writing something...`,
    `${name} has something to say...`,
  ]
  const [phraseIndex] = useState(() => Math.floor(Math.random() * phrases.length))

  return (
    <motion.div
      className={cn('flex items-center gap-2', className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary-400"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <span className="text-sm text-content-tertiary">{phrases[phraseIndex]}</span>
    </motion.div>
  )
}

// Subtle glow effect for important items
export function GlowHighlight({
  children,
  color = 'primary',
  className,
}: {
  children: React.ReactNode
  color?: 'primary' | 'success' | 'warning'
  className?: string
}) {
  const glowColors = {
    primary: 'shadow-primary-200/50',
    success: 'shadow-success-200/50',
    warning: 'shadow-warning-200/50',
  }

  return (
    <motion.div
      className={cn('relative', className)}
      animate={{
        boxShadow: [
          `0 0 20px var(--glow-color, #8B5CF633)`,
          `0 0 40px var(--glow-color, #8B5CF644)`,
          `0 0 20px var(--glow-color, #8B5CF633)`,
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  )
}

// Celebration rain
export function CelebrationRain({ className }: { className?: string }) {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    emoji: ['🎉', '✨', '💜', '🎊', '⭐'][i % 5],
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
  }))

  return (
    <div className={cn('fixed inset-0 pointer-events-none overflow-hidden z-50', className)}>
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute text-2xl"
          style={{ left: `${particle.x}%`, top: -50 }}
          animate={{
            y: window.innerHeight + 100,
            rotate: [0, 360],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: 'linear',
            repeat: Infinity,
          }}
        >
          {particle.emoji}
        </motion.span>
      ))}
    </div>
  )
}

// Soft pulse notification dot
export function NotificationDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex h-3 w-3', className)}>
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full bg-danger-400"
        animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-danger-500" />
    </span>
  )
}

export default {
  WarmGreeting,
  AnniversaryBadge,
  FloatingHearts,
  TypingIndicator,
  GlowHighlight,
  CelebrationRain,
  NotificationDot,
}

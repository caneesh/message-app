import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'

// Swipeable card with actions
interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftAction?: { icon: React.ReactNode; color: string; label: string }
  rightAction?: { icon: React.ReactNode; color: string; label: string }
  className?: string
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className,
}: SwipeableCardProps) {
  const x = useMotionValue(0)
  const [isDragging, setIsDragging] = useState(false)

  const leftOpacity = useTransform(x, [0, 80], [0, 1])
  const rightOpacity = useTransform(x, [-80, 0], [1, 0])
  const scale = useTransform(x, [-100, 0, 100], [0.98, 1, 0.98])

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false)

    if (info.offset.x > 100 && onSwipeRight) {
      onSwipeRight()
    } else if (info.offset.x < -100 && onSwipeLeft) {
      onSwipeLeft()
    }
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      {/* Left action background */}
      {leftAction && (
        <motion.div
          className="absolute inset-y-0 left-0 w-24 flex items-center justify-center"
          style={{ opacity: rightOpacity, backgroundColor: leftAction.color }}
        >
          <div className="text-white text-center">
            {leftAction.icon}
            <p className="text-xs mt-1">{leftAction.label}</p>
          </div>
        </motion.div>
      )}

      {/* Right action background */}
      {rightAction && (
        <motion.div
          className="absolute inset-y-0 right-0 w-24 flex items-center justify-center"
          style={{ opacity: leftOpacity, backgroundColor: rightAction.color }}
        >
          <div className="text-white text-center">
            {rightAction.icon}
            <p className="text-xs mt-1">{rightAction.label}</p>
          </div>
        </motion.div>
      )}

      {/* Card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x, scale }}
        className="relative bg-surface-secondary cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  )
}

// Pull to refresh
interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  className?: string
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const y = useMotionValue(0)
  const pullProgress = useTransform(y, [0, 100], [0, 1])
  const rotation = useTransform(y, [0, 100], [0, 360])

  const handleDragEnd = async (_: any, info: PanInfo) => {
    if (info.offset.y > 80 && !isRefreshing) {
      setIsRefreshing(true)
      await onRefresh()
      setIsRefreshing(false)
    }
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex justify-center py-4 z-10"
        style={{ opacity: pullProgress, y: useTransform(y, [0, 100], [-40, 0]) }}
      >
        <motion.div
          className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center"
          style={{ rotate: rotation }}
        >
          {isRefreshing ? (
            <motion.div
              className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.5}
        onDragEnd={handleDragEnd}
        style={{ y }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// Long press button with haptic feedback simulation
interface LongPressButtonProps {
  children: React.ReactNode
  onLongPress: () => void
  duration?: number
  className?: string
}

export function LongPressButton({
  children,
  onLongPress,
  duration = 500,
  className,
}: LongPressButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<NodeJS.Timeout>()
  const intervalRef = useRef<NodeJS.Timeout>()

  const handlePressStart = () => {
    setIsPressed(true)
    setProgress(0)

    intervalRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + 100 / (duration / 10), 100))
    }, 10)

    timerRef.current = setTimeout(() => {
      onLongPress()
      setIsPressed(false)
      setProgress(0)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }, duration)
  }

  const handlePressEnd = () => {
    setIsPressed(false)
    setProgress(0)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  return (
    <motion.button
      className={cn('relative overflow-hidden', className)}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      whileTap={{ scale: 0.98 }}
    >
      {/* Progress indicator */}
      {isPressed && (
        <motion.div
          className="absolute inset-0 bg-primary-500/20"
          style={{ width: `${progress}%` }}
        />
      )}
      {children}
    </motion.button>
  )
}

// Tap feedback wrapper
interface TapFeedbackProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function TapFeedback({ children, className, onClick }: TapFeedbackProps) {
  return (
    <motion.div
      className={className}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', damping: 20, stiffness: 400 }}
    >
      {children}
    </motion.div>
  )
}

// Hover card effect
interface HoverCardProps {
  children: React.ReactNode
  className?: string
}

export function HoverCard({ children, className }: HoverCardProps) {
  return (
    <motion.div
      className={cn('rounded-2xl', className)}
      whileHover={{
        y: -4,
        boxShadow: '0 12px 24px -4px rgba(0, 0, 0, 0.1)',
      }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      {children}
    </motion.div>
  )
}

export default {
  SwipeableCard,
  PullToRefresh,
  LongPressButton,
  TapFeedback,
  HoverCard,
}

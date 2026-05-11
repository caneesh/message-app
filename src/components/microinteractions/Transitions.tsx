import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// Smooth fade transition
export function FadeTransition({
  children,
  show,
  className,
}: {
  children: React.ReactNode
  show: boolean
  className?: string
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Slide up transition
export function SlideUpTransition({
  children,
  show,
  className,
}: {
  children: React.ReactNode
  show: boolean
  className?: string
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Scale transition
export function ScaleTransition({
  children,
  show,
  className,
}: {
  children: React.ReactNode
  show: boolean
  className?: string
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Collapse transition for expandable content
export function CollapseTransition({
  children,
  show,
  className,
}: {
  children: React.ReactNode
  show: boolean
  className?: string
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          className={cn('overflow-hidden', className)}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Stagger children animation
export function StaggerChildren({
  children,
  className,
  staggerDelay = 0.05,
}: {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: staggerDelay },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

// Stagger child item
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      {children}
    </motion.div>
  )
}

// Layout animation wrapper
export function LayoutWrapper({
  children,
  className,
  layoutId,
}: {
  children: React.ReactNode
  className?: string
  layoutId?: string
}) {
  return (
    <motion.div
      className={className}
      layout
      layoutId={layoutId}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {children}
    </motion.div>
  )
}

// Smooth number counter
export function AnimatedNumber({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  return (
    <motion.span
      className={className}
      key={value}
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 10, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      {value}
    </motion.span>
  )
}

// Flip animation for status changes
export function FlipTransition({
  children,
  flipKey,
  className,
}: {
  children: React.ReactNode
  flipKey: string | number
  className?: string
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={flipKey}
        className={className}
        initial={{ rotateX: -90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        exit={{ rotateX: 90, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export default {
  FadeTransition,
  SlideUpTransition,
  ScaleTransition,
  CollapseTransition,
  StaggerChildren,
  StaggerItem,
  LayoutWrapper,
  AnimatedNumber,
  FlipTransition,
}

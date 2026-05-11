import { motion, AnimatePresence } from 'framer-motion'
import { pageVariants, fadeScale } from '../variants/page'
import { useConditionalAnimation } from '../hooks/useReducedMotion'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
  mode?: 'slide' | 'fade'
}

export function PageTransition({
  children,
  className,
  mode = 'slide',
}: PageTransitionProps) {
  const variants = useConditionalAnimation(
    mode === 'slide' ? pageVariants : fadeScale
  )

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}

interface PageTransitionGroupProps {
  children: React.ReactNode
  locationKey: string
  mode?: 'slide' | 'fade'
}

export function PageTransitionGroup({
  children,
  locationKey,
  mode = 'slide',
}: PageTransitionGroupProps) {
  return (
    <AnimatePresence mode="wait">
      <PageTransition key={locationKey} mode={mode}>
        {children}
      </PageTransition>
    </AnimatePresence>
  )
}

export default PageTransition

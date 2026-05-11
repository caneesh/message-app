// Variants
export * from './variants/page'
export * from './variants/list'
export * from './variants/modal'

// Hooks
export * from './hooks/useReducedMotion'

// Components
export { AnimatedList, AnimatedListItem } from './components/AnimatedList'
export { PageTransition, PageTransitionGroup } from './components/PageTransition'
export { AnimatedModal } from './components/AnimatedModal'

// Re-export framer-motion essentials
export {
  motion,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
  useSpring,
  useDragControls,
  type Variants,
  type Transition,
  type MotionProps,
} from 'framer-motion'

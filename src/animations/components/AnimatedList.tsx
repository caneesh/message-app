import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem } from '../variants/list'
import { useConditionalAnimation } from '../hooks/useReducedMotion'

interface AnimatedListProps<T> {
  items: T[]
  keyExtractor: (item: T) => string
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  itemClassName?: string
  animate?: boolean
}

export function AnimatedList<T>({
  items,
  keyExtractor,
  renderItem,
  className,
  itemClassName,
  animate = true,
}: AnimatedListProps<T>) {
  const containerVariants = useConditionalAnimation(staggerContainer, animate)
  const itemVariants = useConditionalAnimation(staggerItem, animate)

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item)}
            variants={itemVariants}
            layout
            className={itemClassName}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

interface AnimatedListItemProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  animate?: boolean
}

export function AnimatedListItem({
  children,
  className,
  onClick,
  animate = true,
}: AnimatedListItemProps) {
  const variants = useConditionalAnimation(staggerItem, animate)

  return (
    <motion.div
      variants={variants}
      layout
      className={className}
      onClick={onClick}
      whileHover={animate ? { scale: 1.01 } : undefined}
      whileTap={animate ? { scale: 0.99 } : undefined}
    >
      {children}
    </motion.div>
  )
}

export default AnimatedList

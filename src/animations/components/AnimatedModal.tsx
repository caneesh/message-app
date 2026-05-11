import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { overlayVariants, modalVariants, bottomSheetVariants } from '../variants/modal'
import { useConditionalAnimation, useReducedMotion } from '../hooks/useReducedMotion'
import { cn } from '@/lib/utils'

interface AnimatedModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  variant?: 'modal' | 'bottom-sheet'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

export function AnimatedModal({
  isOpen,
  onClose,
  children,
  className,
  variant = 'modal',
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: AnimatedModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  const overlayAnimation = useConditionalAnimation(overlayVariants)
  const contentAnimation = useConditionalAnimation(
    variant === 'bottom-sheet' ? bottomSheetVariants : modalVariants
  )

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === overlayRef.current) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Overlay */}
          <motion.div
            ref={overlayRef}
            variants={overlayAnimation}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleOverlayClick}
          />

          {/* Content */}
          <motion.div
            variants={contentAnimation}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag={variant === 'bottom-sheet' && !reducedMotion ? 'y' : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose()
              }
            }}
            className={cn(
              variant === 'modal' && 'absolute inset-0 flex items-center justify-center p-4',
              variant === 'bottom-sheet' && 'absolute bottom-0 left-0 right-0',
              className
            )}
          >
            {variant === 'bottom-sheet' && (
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-neutral-300" />
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default AnimatedModal

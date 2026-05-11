import { useState, useRef, useEffect, type ReactNode, type TouchEvent } from 'react'
import { cn } from '@/lib/utils'

interface MobileSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  snapPoints?: number[]
  initialSnap?: number
  className?: string
}

export function MobileSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [0.5, 0.9],
  initialSnap = 0,
  className,
}: MobileSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(initialSnap)
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const startTranslate = useRef(0)

  const currentHeight = snapPoints[currentSnap] * 100

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setCurrentSnap(initialSnap)
      setTranslateY(0)
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, initialSnap])

  const handleTouchStart = (e: TouchEvent) => {
    startY.current = e.touches[0].clientY
    startTranslate.current = translateY
    setIsDragging(true)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return

    const currentY = e.touches[0].clientY
    const delta = currentY - startY.current
    const newTranslate = Math.max(0, startTranslate.current + delta)

    setTranslateY(newTranslate)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)

    const sheetHeight = sheetRef.current?.offsetHeight || 0
    const dragPercentage = translateY / sheetHeight

    if (dragPercentage > 0.3) {
      if (currentSnap > 0) {
        setCurrentSnap(currentSnap - 1)
        setTranslateY(0)
      } else {
        onClose()
      }
    } else if (dragPercentage < -0.1 && currentSnap < snapPoints.length - 1) {
      setCurrentSnap(currentSnap + 1)
      setTranslateY(0)
    } else {
      setTranslateY(0)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50',
          'bg-black/40 backdrop-blur-sm',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-surface-secondary',
          'rounded-t-3xl',
          'shadow-2xl',
          'transition-all',
          isDragging ? 'duration-0' : 'duration-300 ease-out',
          className
        )}
        style={{
          height: `${currentHeight}vh`,
          transform: `translateY(${translateY}px)`,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div
          className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-content-tertiary/30" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 pb-3 border-b border-border-light">
            <h2 className="text-lg font-semibold text-content-primary">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -m-2 text-content-tertiary active:text-content-primary"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  )
}

interface QuickActionSheetProps {
  isOpen: boolean
  onClose: () => void
  actions: {
    id: string
    label: string
    icon: ReactNode
    variant?: 'default' | 'danger'
    onAction: () => void
  }[]
}

export function QuickActionSheet({
  isOpen,
  onClose,
  actions,
}: QuickActionSheetProps) {
  return (
    <MobileSheet isOpen={isOpen} onClose={onClose} snapPoints={[0.4]}>
      <div className="p-4 space-y-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              action.onAction()
              onClose()
            }}
            className={cn(
              'w-full flex items-center gap-4',
              'p-4 rounded-xl',
              'transition-colors',
              action.variant === 'danger'
                ? 'text-danger active:bg-danger-light'
                : 'text-content-primary active:bg-surface-tertiary'
            )}
          >
            <span className="w-6 h-6">{action.icon}</span>
            <span className="text-base font-medium">{action.label}</span>
          </button>
        ))}

        <button
          onClick={onClose}
          className={cn(
            'w-full p-4 mt-2',
            'rounded-xl',
            'bg-surface-tertiary',
            'text-content-secondary font-medium',
            'active:bg-border'
          )}
        >
          Cancel
        </button>
      </div>
    </MobileSheet>
  )
}

export default MobileSheet

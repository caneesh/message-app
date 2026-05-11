import { useState, useRef, type ReactNode, type TouchEvent } from 'react'
import { cn } from '@/lib/utils'

interface SwipeAction {
  id: string
  icon: ReactNode
  label: string
  color: 'danger' | 'success' | 'warning' | 'accent'
  onAction: () => void
}

interface SwipeableCardProps {
  children: ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  onLongPress?: () => void
  threshold?: number
  className?: string
}

const colorClasses = {
  danger: 'bg-danger text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-amber-900',
  accent: 'bg-accent text-white',
}

export function SwipeableCard({
  children,
  leftActions = [],
  rightActions = [],
  onLongPress,
  threshold = 80,
  className,
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showLeftActions, setShowLeftActions] = useState(false)
  const [showRightActions, setShowRightActions] = useState(false)

  const startX = useRef(0)
  const startY = useRef(0)
  const currentX = useRef(0)
  const isHorizontalSwipe = useRef<boolean | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const maxLeftSwipe = leftActions.length * 72
  const maxRightSwipe = rightActions.length * 72

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    startX.current = touch.clientX
    startY.current = touch.clientY
    currentX.current = translateX
    isHorizontalSwipe.current = null
    setIsDragging(true)

    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        if (!isDragging || Math.abs(translateX) < 10) {
          onLongPress()
          if (navigator.vibrate) navigator.vibrate(50)
        }
      }, 500)
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - startX.current
    const deltaY = touch.clientY - startY.current

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY)
        if (!isHorizontalSwipe.current && longPressTimer.current) {
          clearTimeout(longPressTimer.current)
        }
      }
      return
    }

    if (!isHorizontalSwipe.current) return

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }

    let newTranslate = currentX.current + deltaX

    if (leftActions.length === 0 && newTranslate > 0) {
      newTranslate = newTranslate * 0.2
    } else if (rightActions.length === 0 && newTranslate < 0) {
      newTranslate = newTranslate * 0.2
    } else {
      if (newTranslate > maxLeftSwipe) {
        newTranslate = maxLeftSwipe + (newTranslate - maxLeftSwipe) * 0.2
      } else if (newTranslate < -maxRightSwipe) {
        newTranslate = -maxRightSwipe + (newTranslate + maxRightSwipe) * 0.2
      }
    }

    setTranslateX(newTranslate)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }

    if (translateX > threshold && leftActions.length > 0) {
      setTranslateX(maxLeftSwipe)
      setShowLeftActions(true)
      setShowRightActions(false)
    } else if (translateX < -threshold && rightActions.length > 0) {
      setTranslateX(-maxRightSwipe)
      setShowRightActions(true)
      setShowLeftActions(false)
    } else {
      setTranslateX(0)
      setShowLeftActions(false)
      setShowRightActions(false)
    }
  }

  const resetPosition = () => {
    setTranslateX(0)
    setShowLeftActions(false)
    setShowRightActions(false)
  }

  const handleActionClick = (action: SwipeAction) => {
    action.onAction()
    resetPosition()
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
    >
      {leftActions.length > 0 && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-stretch',
            'transition-opacity duration-200',
            showLeftActions ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: maxLeftSwipe }}
        >
          {leftActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={cn(
                'flex flex-col items-center justify-center',
                'w-[72px] gap-1',
                colorClasses[action.color],
                'active:opacity-80'
              )}
              aria-label={action.label}
            >
              <span className="w-6 h-6">{action.icon}</span>
              <span className="text-[10px] font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {rightActions.length > 0 && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-stretch',
            'transition-opacity duration-200',
            showRightActions ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: maxRightSwipe }}
        >
          {rightActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={cn(
                'flex flex-col items-center justify-center',
                'w-[72px] gap-1',
                colorClasses[action.color],
                'active:opacity-80'
              )}
              aria-label={action.label}
            >
              <span className="w-6 h-6">{action.icon}</span>
              <span className="text-[10px] font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          'relative bg-surface-secondary',
          'transition-transform',
          isDragging ? 'duration-0' : 'duration-300 ease-out'
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

export default SwipeableCard

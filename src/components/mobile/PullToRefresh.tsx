import { useState, useRef, type ReactNode, type TouchEvent } from 'react'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  threshold?: number
  maxPull?: number
  className?: string
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  maxPull = 120,
  className,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const isAtTop = useRef(true)

  const handleTouchStart = (e: TouchEvent) => {
    if (isRefreshing) return

    const scrollElement = containerRef.current
    isAtTop.current = scrollElement ? scrollElement.scrollTop <= 0 : true

    if (isAtTop.current) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling || isRefreshing || !isAtTop.current) return

    const currentY = e.touches[0].clientY
    const delta = currentY - startY.current

    if (delta > 0) {
      const resistance = 0.5
      const adjustedPull = Math.min(delta * resistance, maxPull)
      setPullDistance(adjustedPull)

      if (adjustedPull > 10) {
        e.preventDefault()
      }
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling) return

    setIsPulling(false)

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(60)

      if (navigator.vibrate) {
        navigator.vibrate(10)
      }

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }

  const progress = Math.min(pullDistance / threshold, 1)
  const rotation = progress * 180

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto h-full', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 z-10',
          'flex items-center justify-center',
          'w-10 h-10 rounded-full',
          'bg-white dark:bg-gray-800',
          'shadow-lg border border-border-light',
          'transition-all',
          isPulling || isRefreshing ? 'duration-0' : 'duration-300'
        )}
        style={{
          top: pullDistance - 50,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        {isRefreshing ? (
          <svg
            className="w-5 h-5 text-accent animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg
            className={cn(
              'w-5 h-5 transition-colors',
              progress >= 1 ? 'text-accent' : 'text-content-tertiary'
            )}
            style={{ transform: `rotate(${rotation}deg)` }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        )}
      </div>

      <div
        className={cn(
          'transition-transform',
          isPulling || isRefreshing ? 'duration-0' : 'duration-300'
        )}
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  )
}

export default PullToRefresh

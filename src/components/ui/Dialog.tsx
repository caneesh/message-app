import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { IconButton } from './IconButton'

export interface DialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div
        className={cn(
          'relative z-10 w-full max-w-md max-h-[90vh] overflow-auto',
          'bg-surface-secondary rounded-2xl shadow-xl',
          'animate-scale-in',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}

export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
}

export function DialogHeader({ className, children, onClose, ...props }: DialogHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-5 border-b border-border-light',
        className
      )}
      {...props}
    >
      <h2 className="text-lg font-semibold text-content-primary">{children}</h2>
      {onClose && (
        <IconButton variant="ghost" size="sm" label="Close" onClick={onClose}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </IconButton>
      )}
    </div>
  )
}

export function DialogContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  )
}

export function DialogFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-3 p-5 border-t border-border-light', className)}
      {...props}
    >
      {children}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DecisionSearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DecisionSearchBar({
  value,
  onChange,
  placeholder = 'Search decisions...',
  className,
}: DecisionSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && isFocused) {
        inputRef.current?.blur()
        if (value) {
          onChange('')
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFocused, value, onChange])

  return (
    <div
      className={cn(
        'relative flex items-center gap-2',
        'px-4 py-2.5 rounded-xl',
        'bg-surface-tertiary border border-transparent',
        'transition-all duration-200',
        isFocused && 'bg-surface-secondary border-primary-300 ring-4 ring-primary-100',
        className
      )}
    >
      <svg
        className={cn(
          'w-5 h-5 flex-shrink-0 transition-colors',
          isFocused ? 'text-primary-500' : 'text-content-tertiary'
        )}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={cn(
          'flex-1 bg-transparent',
          'text-sm text-content-primary',
          'placeholder:text-content-tertiary',
          'focus:outline-none'
        )}
      />

      {value ? (
        <button
          onClick={() => onChange('')}
          className={cn(
            'flex-shrink-0 p-1 rounded-md',
            'text-content-tertiary hover:text-content-primary',
            'hover:bg-surface-tertiary',
            'transition-colors'
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : (
        <kbd className={cn(
          'hidden sm:inline-flex items-center gap-1',
          'px-2 py-0.5 rounded',
          'bg-surface-sunken border border-border-light',
          'text-xs text-content-tertiary font-medium'
        )}>
          <span className="text-[10px]">⌘</span>K
        </kbd>
      )}
    </div>
  )
}

export default DecisionSearchBar

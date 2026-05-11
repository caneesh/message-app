/**
 * OneRoom Design System
 *
 * A premium, calm, emotionally intelligent design system
 * for productivity-focused collaboration.
 *
 * @see /docs/DESIGN_SYSTEM.md for complete documentation
 */

export * from './tokens'
export * from './components'

// Re-export commonly used utilities
export { cn } from '@/lib/utils'

// Theme utility
export function setTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    root.classList.toggle('dark', systemTheme === 'dark')
    root.setAttribute('data-theme', systemTheme)
  } else {
    root.classList.toggle('dark', theme === 'dark')
    root.setAttribute('data-theme', theme)
  }

  localStorage.setItem('theme', theme)
}

// Initialize theme on load
export function initTheme() {
  const stored = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
  setTheme(stored || 'system')

  // Listen for system changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (localStorage.getItem('theme') === 'system') {
      setTheme('system')
    }
  })
}

// Feature status types
export type DecisionStatus = 'active' | 'changed' | 'cancelled'
export type PromiseStatus = 'pending' | 'kept' | 'broken'
export type AgreementStatus = 'draft' | 'proposed' | 'accepted' | 'disputed'
export type AccountabilityStatus = 'on-track' | 'at-risk' | 'overdue' | 'completed'

// Status color mappings
export const statusColors = {
  decision: {
    active: 'bg-decision-active-bg text-decision-active border-decision-active',
    changed: 'bg-decision-changed-bg text-decision-changed border-decision-changed',
    cancelled: 'bg-decision-cancelled-bg text-decision-cancelled border-decision-cancelled',
  },
  promise: {
    pending: 'bg-promise-pending-bg text-promise-pending border-promise-pending',
    kept: 'bg-promise-kept-bg text-promise-kept border-promise-kept',
    broken: 'bg-promise-broken-bg text-promise-broken border-promise-broken',
  },
  agreement: {
    draft: 'bg-agreement-draft-bg text-agreement-draft border-agreement-draft',
    proposed: 'bg-agreement-proposed-bg text-agreement-proposed border-agreement-proposed',
    accepted: 'bg-agreement-accepted-bg text-agreement-accepted border-agreement-accepted',
    disputed: 'bg-agreement-disputed-bg text-agreement-disputed border-agreement-disputed',
  },
  accountability: {
    'on-track': 'bg-accountability-on-track-bg text-accountability-on-track border-accountability-on-track',
    'at-risk': 'bg-accountability-at-risk-bg text-accountability-at-risk border-accountability-at-risk',
    overdue: 'bg-accountability-overdue-bg text-accountability-overdue border-accountability-overdue',
    completed: 'bg-accountability-completed-bg text-accountability-completed border-accountability-completed',
  },
} as const

// Spacing scale for programmatic use
export const spacingScale = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const

// Breakpoint values for programmatic media queries
export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

// Media query helpers
export const mediaQueries = {
  xs: `(min-width: ${breakpoints.xs}px)`,
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
  mobile: `(max-width: ${breakpoints.md - 1}px)`,
  tablet: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: `(min-width: ${breakpoints.lg}px)`,
  prefersReducedMotion: '(prefers-reduced-motion: reduce)',
  prefersDark: '(prefers-color-scheme: dark)',
} as const

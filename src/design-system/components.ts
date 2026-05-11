/**
 * OneRoom Design System - Component Specifications
 *
 * Defines the visual and behavioral specifications for all UI components.
 */

// ============================================
// BUTTON COMPONENT
// ============================================

export const button = {
  // Base styles applied to all buttons
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontWeight: 500,
    borderRadius: 'var(--radius-lg)',
    transition: 'all var(--duration-fast) var(--ease-default)',
    cursor: 'pointer',
    outline: 'none',
    border: 'none',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    // Minimum touch target
    minHeight: '44px',
    minWidth: '44px',
  },

  // Size variants
  sizes: {
    xs: {
      height: '28px',
      padding: '0 0.625rem',
      fontSize: 'var(--text-xs)',
      gap: '0.25rem',
      borderRadius: 'var(--radius-md)',
    },
    sm: {
      height: '32px',
      padding: '0 0.75rem',
      fontSize: 'var(--text-sm)',
      gap: '0.375rem',
      borderRadius: 'var(--radius-md)',
    },
    md: {
      height: '40px',
      padding: '0 1rem',
      fontSize: 'var(--text-sm)',
      gap: '0.5rem',
      borderRadius: 'var(--radius-lg)',
    },
    lg: {
      height: '48px',
      padding: '0 1.5rem',
      fontSize: 'var(--text-base)',
      gap: '0.5rem',
      borderRadius: 'var(--radius-lg)',
    },
    xl: {
      height: '56px',
      padding: '0 2rem',
      fontSize: 'var(--text-lg)',
      gap: '0.625rem',
      borderRadius: 'var(--radius-xl)',
    },
  },

  // Variant styles
  variants: {
    primary: {
      default: {
        background: 'var(--interactive-primary)',
        color: 'var(--text-inverse)',
        boxShadow: 'var(--shadow-sm)',
      },
      hover: {
        background: 'var(--interactive-primary-hover)',
        boxShadow: 'var(--shadow-md), var(--shadow-primary)',
        transform: 'translateY(-1px)',
      },
      active: {
        background: 'var(--interactive-primary-active)',
        boxShadow: 'var(--shadow-xs)',
        transform: 'translateY(0)',
      },
      disabled: {
        background: 'var(--interactive-primary-disabled)',
        cursor: 'not-allowed',
        opacity: 0.6,
      },
    },

    secondary: {
      default: {
        background: 'var(--bg-tertiary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-default)',
      },
      hover: {
        background: 'var(--bg-sunken)',
        borderColor: 'var(--border-default)',
      },
      active: {
        background: 'var(--border-light)',
      },
      disabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
      },
    },

    ghost: {
      default: {
        background: 'transparent',
        color: 'var(--text-secondary)',
      },
      hover: {
        background: 'var(--bg-tertiary)',
        color: 'var(--text-primary)',
      },
      active: {
        background: 'var(--bg-sunken)',
      },
      disabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
      },
    },

    danger: {
      default: {
        background: 'var(--color-danger-500)',
        color: 'var(--text-inverse)',
      },
      hover: {
        background: 'var(--color-danger-600)',
        boxShadow: 'var(--shadow-danger)',
      },
      active: {
        background: 'var(--color-danger-700)',
      },
      disabled: {
        background: 'var(--color-danger-300)',
        cursor: 'not-allowed',
      },
    },

    success: {
      default: {
        background: 'var(--color-success-500)',
        color: 'var(--text-inverse)',
      },
      hover: {
        background: 'var(--color-success-600)',
        boxShadow: 'var(--shadow-success)',
      },
      active: {
        background: 'var(--color-success-700)',
      },
      disabled: {
        background: 'var(--color-success-300)',
        cursor: 'not-allowed',
      },
    },

    link: {
      default: {
        background: 'transparent',
        color: 'var(--text-link)',
        padding: 0,
        height: 'auto',
        minHeight: 'auto',
        textDecoration: 'underline',
        textUnderlineOffset: '2px',
      },
      hover: {
        color: 'var(--text-link-hover)',
      },
      active: {
        color: 'var(--color-primary-800)',
      },
      disabled: {
        color: 'var(--text-disabled)',
        cursor: 'not-allowed',
      },
    },
  },

  // Icon button specifics
  iconOnly: {
    sm: { width: '32px', height: '32px', padding: 0 },
    md: { width: '40px', height: '40px', padding: 0 },
    lg: { width: '48px', height: '48px', padding: 0 },
  },
} as const

// ============================================
// CARD COMPONENT
// ============================================

export const card = {
  base: {
    background: 'var(--surface-default)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--border-subtle)',
    overflow: 'hidden',
  },

  variants: {
    default: {
      boxShadow: 'var(--shadow-xs)',
    },
    elevated: {
      boxShadow: 'var(--shadow-md)',
      border: 'none',
    },
    outlined: {
      boxShadow: 'none',
      border: '1px solid var(--border-default)',
    },
    glass: {
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(var(--glass-blur))',
      border: '1px solid var(--glass-border)',
    },
    interactive: {
      cursor: 'pointer',
      transition: 'all var(--duration-fast) var(--ease-default)',
      '&:hover': {
        boxShadow: 'var(--shadow-md)',
        transform: 'translateY(-2px)',
      },
      '&:active': {
        transform: 'translateY(0)',
        boxShadow: 'var(--shadow-sm)',
      },
    },
  },

  // Padding variants
  padding: {
    none: '0',
    sm: 'var(--space-3)',
    md: 'var(--space-4)',
    lg: 'var(--space-6)',
  },
} as const

// ============================================
// BADGE COMPONENT
// ============================================

export const badge = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontWeight: 500,
    borderRadius: 'var(--radius-full)',
    whiteSpace: 'nowrap',
  },

  sizes: {
    sm: {
      height: '20px',
      padding: '0 0.5rem',
      fontSize: 'var(--text-2xs)',
    },
    md: {
      height: '24px',
      padding: '0 0.625rem',
      fontSize: 'var(--text-xs)',
    },
    lg: {
      height: '28px',
      padding: '0 0.75rem',
      fontSize: 'var(--text-sm)',
    },
  },

  variants: {
    // Solid variants
    primary: {
      background: 'var(--color-primary-500)',
      color: 'var(--text-inverse)',
    },
    secondary: {
      background: 'var(--color-secondary-500)',
      color: 'var(--text-inverse)',
    },
    success: {
      background: 'var(--color-success-500)',
      color: 'var(--text-inverse)',
    },
    warning: {
      background: 'var(--color-warning-500)',
      color: 'var(--color-warning-900)',
    },
    danger: {
      background: 'var(--color-danger-500)',
      color: 'var(--text-inverse)',
    },
    info: {
      background: 'var(--color-info-500)',
      color: 'var(--text-inverse)',
    },
    neutral: {
      background: 'var(--bg-tertiary)',
      color: 'var(--text-secondary)',
    },

    // Subtle variants (light background)
    'primary-subtle': {
      background: 'var(--color-primary-50)',
      color: 'var(--color-primary-700)',
    },
    'secondary-subtle': {
      background: 'var(--color-secondary-50)',
      color: 'var(--color-secondary-700)',
    },
    'success-subtle': {
      background: 'var(--color-success-50)',
      color: 'var(--color-success-700)',
    },
    'warning-subtle': {
      background: 'var(--color-warning-50)',
      color: 'var(--color-warning-700)',
    },
    'danger-subtle': {
      background: 'var(--color-danger-50)',
      color: 'var(--color-danger-700)',
    },
    'info-subtle': {
      background: 'var(--color-info-50)',
      color: 'var(--color-info-700)',
    },

    // Outline variants
    'primary-outline': {
      background: 'transparent',
      border: '1px solid var(--color-primary-500)',
      color: 'var(--color-primary-600)',
    },
    'secondary-outline': {
      background: 'transparent',
      border: '1px solid var(--color-secondary-500)',
      color: 'var(--color-secondary-600)',
    },
  },

  // Feature-specific badges
  decision: {
    active: {
      background: 'var(--decision-active-bg)',
      color: 'var(--decision-active)',
    },
    changed: {
      background: 'var(--decision-changed-bg)',
      color: 'var(--decision-changed)',
    },
    cancelled: {
      background: 'var(--decision-cancelled-bg)',
      color: 'var(--decision-cancelled)',
    },
  },

  promise: {
    pending: {
      background: 'var(--promise-pending-bg)',
      color: 'var(--promise-pending)',
    },
    kept: {
      background: 'var(--promise-kept-bg)',
      color: 'var(--promise-kept)',
    },
    broken: {
      background: 'var(--promise-broken-bg)',
      color: 'var(--promise-broken)',
    },
  },

  agreement: {
    draft: {
      background: 'var(--agreement-draft-bg)',
      color: 'var(--agreement-draft)',
    },
    proposed: {
      background: 'var(--agreement-proposed-bg)',
      color: 'var(--agreement-proposed)',
    },
    accepted: {
      background: 'var(--agreement-accepted-bg)',
      color: 'var(--agreement-accepted)',
    },
    disputed: {
      background: 'var(--agreement-disputed-bg)',
      color: 'var(--agreement-disputed)',
    },
  },

  accountability: {
    onTrack: {
      background: 'var(--accountability-on-track-bg)',
      color: 'var(--accountability-on-track)',
    },
    atRisk: {
      background: 'var(--accountability-at-risk-bg)',
      color: 'var(--accountability-at-risk)',
    },
    overdue: {
      background: 'var(--accountability-overdue-bg)',
      color: 'var(--accountability-overdue)',
    },
    completed: {
      background: 'var(--accountability-completed-bg)',
      color: 'var(--accountability-completed)',
    },
  },
} as const

// ============================================
// INPUT COMPONENT
// ============================================

export const input = {
  base: {
    width: '100%',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-sm)',
    color: 'var(--text-primary)',
    background: 'var(--surface-default)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    transition: 'all var(--duration-fast) var(--ease-default)',
    outline: 'none',
  },

  sizes: {
    sm: {
      height: '32px',
      padding: '0 0.75rem',
      fontSize: 'var(--text-xs)',
    },
    md: {
      height: '40px',
      padding: '0 1rem',
      fontSize: 'var(--text-sm)',
    },
    lg: {
      height: '48px',
      padding: '0 1.25rem',
      fontSize: 'var(--text-base)',
    },
  },

  states: {
    default: {
      borderColor: 'var(--border-default)',
    },
    hover: {
      borderColor: 'var(--border-default)',
      background: 'var(--bg-tertiary)',
    },
    focus: {
      borderColor: 'var(--border-focus)',
      boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.15)',
    },
    error: {
      borderColor: 'var(--border-error)',
      boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)',
    },
    disabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
      background: 'var(--bg-tertiary)',
    },
  },
} as const

// ============================================
// NAV ITEM COMPONENT
// ============================================

export const navItem = {
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.625rem 0.875rem',
    borderRadius: 'var(--radius-lg)',
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    transition: 'all var(--duration-fast) var(--ease-default)',
    cursor: 'pointer',
    position: 'relative',
    minHeight: '44px',
  },

  states: {
    default: {
      background: 'transparent',
    },
    hover: {
      background: 'var(--bg-tertiary)',
      color: 'var(--text-primary)',
    },
    active: {
      background: 'var(--color-primary-50)',
      color: 'var(--color-primary-600)',
      fontWeight: 600,
    },
  },

  // Active indicator
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '3px',
    height: '20px',
    background: 'var(--color-primary-500)',
    borderRadius: '0 var(--radius-full) var(--radius-full) 0',
  },

  // Icon styles
  icon: {
    width: '20px',
    height: '20px',
    flexShrink: 0,
  },

  // Badge styles
  badge: {
    marginLeft: 'auto',
    minWidth: '20px',
    height: '20px',
    padding: '0 6px',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--text-2xs)',
    fontWeight: 600,
    background: 'var(--color-primary-500)',
    color: 'var(--text-inverse)',
  },
} as const

// ============================================
// TABS COMPONENT
// ============================================

export const tabs = {
  // Tab list container
  list: {
    display: 'flex',
    gap: '0.25rem',
    padding: '0.25rem',
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-xl)',
  },

  // Individual tab
  tab: {
    base: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      padding: '0.625rem 1rem',
      borderRadius: 'var(--radius-lg)',
      fontSize: 'var(--text-sm)',
      fontWeight: 500,
      color: 'var(--text-secondary)',
      transition: 'all var(--duration-fast) var(--ease-default)',
      cursor: 'pointer',
      border: 'none',
      background: 'transparent',
      minHeight: '40px',
    },
    states: {
      hover: {
        color: 'var(--text-primary)',
      },
      active: {
        background: 'var(--surface-default)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-sm)',
      },
      disabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
      },
    },
  },

  // Tab panel
  panel: {
    padding: 'var(--space-4) 0',
  },
} as const

// ============================================
// SEARCH BAR COMPONENT
// ============================================

export const searchBar = {
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0 1rem',
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid transparent',
    transition: 'all var(--duration-fast) var(--ease-default)',
  },

  sizes: {
    sm: {
      height: '36px',
      fontSize: 'var(--text-xs)',
    },
    md: {
      height: '40px',
      fontSize: 'var(--text-sm)',
    },
    lg: {
      height: '48px',
      fontSize: 'var(--text-base)',
    },
  },

  states: {
    default: {
      borderColor: 'transparent',
    },
    focus: {
      background: 'var(--surface-default)',
      borderColor: 'var(--border-focus)',
      boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.1)',
    },
  },

  icon: {
    width: '18px',
    height: '18px',
    color: 'var(--text-tertiary)',
    flexShrink: 0,
  },

  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
  },

  clearButton: {
    width: '20px',
    height: '20px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-sunken)',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
} as const

// ============================================
// SIDEBAR COMPONENT
// ============================================

export const sidebar = {
  base: {
    width: 'var(--sidebar-width)',
    height: '100%',
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(var(--glass-blur))',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width var(--duration-slow) var(--ease-default)',
  },

  collapsed: {
    width: 'var(--sidebar-collapsed)',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--border-subtle)',
    minHeight: 'var(--header-height)',
  },

  nav: {
    flex: 1,
    overflowY: 'auto',
    padding: 'var(--space-3)',
  },

  footer: {
    padding: 'var(--space-4)',
    borderTop: '1px solid var(--border-subtle)',
  },

  category: {
    marginBottom: 'var(--space-4)',
  },

  categoryLabel: {
    fontSize: 'var(--text-2xs)',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '0 var(--space-3)',
    marginBottom: 'var(--space-2)',
  },
} as const

// ============================================
// MODAL COMPONENT
// ============================================

export const modal = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'var(--bg-overlay)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-4)',
    zIndex: 'var(--z-modal-backdrop)',
  },

  container: {
    position: 'relative',
    width: '100%',
    maxHeight: '90vh',
    background: 'var(--surface-default)',
    borderRadius: 'var(--radius-2xl)',
    boxShadow: 'var(--shadow-2xl)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 'var(--z-modal)',
  },

  sizes: {
    sm: { maxWidth: '400px' },
    md: { maxWidth: '500px' },
    lg: { maxWidth: '640px' },
    xl: { maxWidth: '768px' },
    full: { maxWidth: '100%', height: '100%', borderRadius: 0 },
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-4) var(--space-5)',
    borderBottom: '1px solid var(--border-subtle)',
  },

  body: {
    flex: 1,
    padding: 'var(--space-5)',
    overflowY: 'auto',
  },

  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 'var(--space-3)',
    padding: 'var(--space-4) var(--space-5)',
    borderTop: '1px solid var(--border-subtle)',
  },
} as const

// ============================================
// DRAWER COMPONENT
// ============================================

export const drawer = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'var(--bg-overlay)',
    backdropFilter: 'blur(4px)',
    zIndex: 'var(--z-modal-backdrop)',
  },

  container: {
    position: 'fixed',
    background: 'var(--surface-default)',
    boxShadow: 'var(--shadow-2xl)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 'var(--z-modal)',
    transition: 'transform var(--duration-slow) var(--ease-default)',
  },

  placements: {
    left: {
      top: 0,
      left: 0,
      height: '100%',
      width: '320px',
      maxWidth: '85vw',
      borderRadius: '0 var(--radius-2xl) var(--radius-2xl) 0',
    },
    right: {
      top: 0,
      right: 0,
      height: '100%',
      width: '320px',
      maxWidth: '85vw',
      borderRadius: 'var(--radius-2xl) 0 0 var(--radius-2xl)',
    },
    bottom: {
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '90vh',
      borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0',
    },
    top: {
      top: 0,
      left: 0,
      right: 0,
      maxHeight: '90vh',
      borderRadius: '0 0 var(--radius-2xl) var(--radius-2xl)',
    },
  },

  handle: {
    width: '40px',
    height: '4px',
    background: 'var(--text-tertiary)',
    opacity: 0.3,
    borderRadius: 'var(--radius-full)',
    margin: 'var(--space-3) auto',
  },
} as const

// ============================================
// TOAST COMPONENT
// ============================================

export const toast = {
  container: {
    position: 'fixed',
    zIndex: 'var(--z-toast)',
    padding: 'var(--space-4)',
    pointerEvents: 'none',
  },

  placements: {
    'top-right': { top: 0, right: 0 },
    'top-left': { top: 0, left: 0 },
    'top-center': { top: 0, left: '50%', transform: 'translateX(-50%)' },
    'bottom-right': { bottom: 0, right: 0 },
    'bottom-left': { bottom: 0, left: 0 },
    'bottom-center': { bottom: 0, left: '50%', transform: 'translateX(-50%)' },
  },

  item: {
    base: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
      padding: 'var(--space-4)',
      background: 'var(--surface-default)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-lg)',
      border: '1px solid var(--border-subtle)',
      pointerEvents: 'auto',
      maxWidth: '400px',
      minWidth: '300px',
    },

    variants: {
      default: {
        borderLeftWidth: '4px',
        borderLeftColor: 'var(--color-primary-500)',
      },
      success: {
        borderLeftWidth: '4px',
        borderLeftColor: 'var(--color-success-500)',
      },
      warning: {
        borderLeftWidth: '4px',
        borderLeftColor: 'var(--color-warning-500)',
      },
      error: {
        borderLeftWidth: '4px',
        borderLeftColor: 'var(--color-danger-500)',
      },
      info: {
        borderLeftWidth: '4px',
        borderLeftColor: 'var(--color-info-500)',
      },
    },
  },

  icon: {
    width: '20px',
    height: '20px',
    flexShrink: 0,
  },

  content: {
    flex: 1,
  },

  title: {
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-1)',
  },

  message: {
    fontSize: 'var(--text-sm)',
    color: 'var(--text-secondary)',
  },

  closeButton: {
    width: '24px',
    height: '24px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    flexShrink: 0,
  },
} as const

// ============================================
// FLOATING COMPOSER COMPONENT
// ============================================

export const floatingComposer = {
  container: {
    position: 'fixed',
    bottom: 'calc(var(--tab-bar-height) + var(--safe-area-bottom) + 12px)',
    left: '12px',
    right: '12px',
    zIndex: 'var(--z-fixed)',
  },

  wrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 'var(--space-2)',
    padding: 'var(--space-2)',
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(var(--glass-blur))',
    borderRadius: '28px',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--shadow-xl)',
  },

  input: {
    flex: 1,
    minHeight: '44px',
    maxHeight: '120px',
    padding: 'var(--space-3) var(--space-4)',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    fontSize: '16px', // Prevent iOS zoom
    lineHeight: 1.5,
    color: 'var(--text-primary)',
  },

  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
  },

  actionButton: {
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-tertiary)',
    transition: 'all var(--duration-fast) var(--ease-default)',
  },

  sendButton: {
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--color-primary-500)',
    color: 'var(--text-inverse)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-primary)',
    transition: 'all var(--duration-fast) var(--ease-default)',
  },
} as const

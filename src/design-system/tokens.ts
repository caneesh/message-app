/**
 * OneRoom Design System - Token Definitions
 *
 * A premium, calm, emotionally intelligent design system
 * focused on trust, clarity, and collaboration.
 */

// ============================================
// COLOR TOKENS
// ============================================

export const colors = {
  // ----------------------------------------
  // Neutral Palette - Foundation
  // ----------------------------------------
  neutral: {
    0: '#FFFFFF',
    50: '#FAFBFC',
    100: '#F4F5F7',
    150: '#EBEDF0',
    200: '#DFE1E6',
    300: '#C1C7D0',
    400: '#A5ADBA',
    500: '#7A869A',
    600: '#6B778C',
    700: '#505F79',
    800: '#344563',
    900: '#172B4D',
    950: '#091E42',
  },

  // ----------------------------------------
  // Primary Accent - Trust & Calm
  // Soft violet conveys wisdom and reliability
  // ----------------------------------------
  primary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',   // Main accent
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },

  // ----------------------------------------
  // Secondary Accent - Growth & Harmony
  // Teal represents balance and collaboration
  // ----------------------------------------
  secondary: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',   // Main secondary
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },

  // ----------------------------------------
  // Semantic Colors
  // ----------------------------------------

  // Success - Accomplishment, completion
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },

  // Warning - Attention needed, pending
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Danger - Caution, destructive actions
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Info - Informational, neutral highlights
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // ----------------------------------------
  // Feature-Specific Colors
  // ----------------------------------------

  // Decisions - Clarity & Resolution
  decision: {
    active: '#8B5CF6',      // Primary violet
    activeLight: '#F5F3FF',
    changed: '#F59E0B',     // Amber for attention
    changedLight: '#FFFBEB',
    cancelled: '#6B778C',   // Muted gray
    cancelledLight: '#F4F5F7',
  },

  // Promises - Commitment & Trust
  promise: {
    pending: '#FBBF24',     // Warm amber
    pendingLight: '#FFFBEB',
    kept: '#10B981',        // Fresh green
    keptLight: '#ECFDF5',
    broken: '#EF4444',      // Soft red
    brokenLight: '#FEF2F2',
  },

  // Agreements - Mutual Understanding
  agreement: {
    draft: '#A5ADBA',       // Neutral gray
    draftLight: '#F4F5F7',
    proposed: '#3B82F6',    // Calm blue
    proposedLight: '#EFF6FF',
    accepted: '#14B8A6',    // Teal harmony
    acceptedLight: '#F0FDFA',
    disputed: '#F59E0B',    // Attention amber
    disputedLight: '#FFFBEB',
  },

  // Accountability - Progress & Tracking
  accountability: {
    onTrack: '#10B981',
    onTrackLight: '#ECFDF5',
    atRisk: '#F59E0B',
    atRiskLight: '#FFFBEB',
    overdue: '#EF4444',
    overdueLight: '#FEF2F2',
    completed: '#8B5CF6',
    completedLight: '#F5F3FF',
  },
} as const

// ============================================
// TYPOGRAPHY TOKENS
// ============================================

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', 'monospace'],
  },

  // Font sizes with line heights and letter spacing
  fontSize: {
    // Display - Hero text, large headings
    '4xl': { size: '2.25rem', lineHeight: '2.5rem', letterSpacing: '-0.02em', weight: 700 },
    '3xl': { size: '1.875rem', lineHeight: '2.25rem', letterSpacing: '-0.02em', weight: 700 },

    // Headings
    '2xl': { size: '1.5rem', lineHeight: '2rem', letterSpacing: '-0.01em', weight: 600 },
    'xl': { size: '1.25rem', lineHeight: '1.75rem', letterSpacing: '-0.01em', weight: 600 },
    'lg': { size: '1.125rem', lineHeight: '1.75rem', letterSpacing: '-0.005em', weight: 500 },

    // Body text
    'base': { size: '1rem', lineHeight: '1.5rem', letterSpacing: '0', weight: 400 },
    'sm': { size: '0.875rem', lineHeight: '1.25rem', letterSpacing: '0', weight: 400 },

    // Small text
    'xs': { size: '0.75rem', lineHeight: '1rem', letterSpacing: '0.01em', weight: 400 },
    '2xs': { size: '0.625rem', lineHeight: '0.875rem', letterSpacing: '0.02em', weight: 500 },
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const

// ============================================
// SPACING TOKENS
// ============================================

export const spacing = {
  // Base unit: 4px
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
} as const

// ============================================
// SHADOW TOKENS
// ============================================

export const shadows = {
  // Subtle shadows for elevated surfaces
  none: 'none',

  // Level 1: Subtle lift (cards, buttons)
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',

  // Level 2: Light elevation (dropdowns, popovers)
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',

  // Level 3: Medium elevation (cards on hover, dialogs)
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',

  // Level 4: High elevation (modals, sheets)
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',

  // Level 5: Maximum elevation (overlays, critical modals)
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',

  // Level 6: Dramatic elevation (floating elements)
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',

  // Inner shadows
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.03)',
  'inner-lg': 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.05)',

  // Colored shadows for accent elements
  accent: '0 4px 14px 0 rgba(139, 92, 246, 0.25)',
  success: '0 4px 14px 0 rgba(16, 185, 129, 0.25)',
  warning: '0 4px 14px 0 rgba(245, 158, 11, 0.25)',
  danger: '0 4px 14px 0 rgba(239, 68, 68, 0.25)',
} as const

// ============================================
// BORDER RADIUS TOKENS
// ============================================

export const radius = {
  none: '0',
  sm: '0.25rem',    // 4px - Subtle rounding
  DEFAULT: '0.375rem', // 6px - Default
  md: '0.5rem',     // 8px - Medium elements
  lg: '0.75rem',    // 12px - Cards, containers
  xl: '1rem',       // 16px - Large cards
  '2xl': '1.25rem', // 20px - Modals, sheets
  '3xl': '1.5rem',  // 24px - Large panels
  full: '9999px',   // Pills, circles
} as const

// ============================================
// ANIMATION TOKENS
// ============================================

export const animation = {
  // Timing functions
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',     // ease-out
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',  // iOS-like
  },

  // Durations
  duration: {
    instant: '50ms',
    fastest: '100ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '400ms',
    slowest: '500ms',
  },

  // Predefined animations
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
    slideUp: {
      from: { opacity: 0, transform: 'translateY(8px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    slideDown: {
      from: { opacity: 0, transform: 'translateY(-8px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    slideLeft: {
      from: { opacity: 0, transform: 'translateX(8px)' },
      to: { opacity: 1, transform: 'translateX(0)' },
    },
    slideRight: {
      from: { opacity: 0, transform: 'translateX(-8px)' },
      to: { opacity: 1, transform: 'translateX(0)' },
    },
    scaleIn: {
      from: { opacity: 0, transform: 'scale(0.95)' },
      to: { opacity: 1, transform: 'scale(1)' },
    },
    scaleOut: {
      from: { opacity: 1, transform: 'scale(1)' },
      to: { opacity: 0, transform: 'scale(0.95)' },
    },
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },
    bounce: {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-4px)' },
    },
    shimmer: {
      '0%': { transform: 'translateX(-100%)' },
      '100%': { transform: 'translateX(100%)' },
    },
  },
} as const

// ============================================
// ELEVATION / Z-INDEX TOKENS
// ============================================

export const elevation = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
  max: 100,
} as const

// ============================================
// BREAKPOINTS
// ============================================

export const breakpoints = {
  xs: '320px',   // Small phones
  sm: '640px',   // Large phones
  md: '768px',   // Tablets
  lg: '1024px',  // Laptops
  xl: '1280px',  // Desktops
  '2xl': '1536px', // Large desktops
} as const

// ============================================
// TRANSITION PRESETS
// ============================================

export const transitions = {
  // Common transitions
  colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
  opacity: 'opacity',
  shadow: 'box-shadow',
  transform: 'transform',
  all: 'all',

  // Preset combinations
  default: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  fast: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

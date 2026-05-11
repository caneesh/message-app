import { colors } from '../tokens/colors'

export const darkTheme = {
  name: 'dark' as const,

  colors: {
    // Surfaces
    'surface-primary': colors.neutral[900],
    'surface-secondary': colors.neutral[800],
    'surface-tertiary': colors.neutral[700],
    'surface-sunken': colors.neutral[950],
    'surface-raised': colors.neutral[800],
    'surface-overlay': 'rgba(0, 0, 0, 0.7)',

    // Content
    'content-primary': colors.neutral[50],
    'content-secondary': colors.neutral[300],
    'content-tertiary': colors.neutral[500],
    'content-inverse': colors.neutral[900],
    'content-disabled': colors.neutral[600],

    // Borders
    'border-light': colors.neutral[700],
    'border-default': colors.neutral[600],
    'border-strong': colors.neutral[500],
    'border-focus': colors.primary[400],

    // Brand (slightly adjusted for dark mode)
    'primary-50': colors.primary[950],
    'primary-100': colors.primary[900],
    'primary-200': colors.primary[800],
    'primary-300': colors.primary[700],
    'primary-400': colors.primary[500],
    'primary-500': colors.primary[400],
    'primary-600': colors.primary[300],
    'primary-700': colors.primary[200],
    'primary-800': colors.primary[100],
    'primary-900': colors.primary[50],

    // Semantic (adjusted for dark mode)
    'success-50': colors.success[950],
    'success-100': colors.success[900],
    'success-500': colors.success[400],
    'success-600': colors.success[300],
    'success-700': colors.success[200],

    'warning-50': colors.warning[950],
    'warning-100': colors.warning[900],
    'warning-500': colors.warning[400],
    'warning-600': colors.warning[300],
    'warning-700': colors.warning[200],

    'danger-50': colors.danger[950],
    'danger-100': colors.danger[900],
    'danger-500': colors.danger[400],
    'danger-600': colors.danger[300],
    'danger-700': colors.danger[200],

    'info-50': colors.info[950],
    'info-100': colors.info[900],
    'info-500': colors.info[400],
    'info-600': colors.info[300],
    'info-700': colors.info[200],
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
    none: 'none',
  },
}

export type DarkTheme = typeof darkTheme
export default darkTheme

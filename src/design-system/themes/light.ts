import { colors } from '../tokens/colors'

export const lightTheme = {
  name: 'light' as const,

  colors: {
    // Surfaces
    'surface-primary': colors.neutral[0],
    'surface-secondary': colors.neutral[50],
    'surface-tertiary': colors.neutral[100],
    'surface-sunken': colors.neutral[200],
    'surface-raised': colors.neutral[0],
    'surface-overlay': 'rgba(0, 0, 0, 0.5)',

    // Content
    'content-primary': colors.neutral[900],
    'content-secondary': colors.neutral[600],
    'content-tertiary': colors.neutral[400],
    'content-inverse': colors.neutral[0],
    'content-disabled': colors.neutral[300],

    // Borders
    'border-light': colors.neutral[200],
    'border-default': colors.neutral[300],
    'border-strong': colors.neutral[400],
    'border-focus': colors.primary[500],

    // Brand
    'primary-50': colors.primary[50],
    'primary-100': colors.primary[100],
    'primary-200': colors.primary[200],
    'primary-300': colors.primary[300],
    'primary-400': colors.primary[400],
    'primary-500': colors.primary[500],
    'primary-600': colors.primary[600],
    'primary-700': colors.primary[700],
    'primary-800': colors.primary[800],
    'primary-900': colors.primary[900],

    // Semantic
    'success-50': colors.success[50],
    'success-100': colors.success[100],
    'success-500': colors.success[500],
    'success-600': colors.success[600],
    'success-700': colors.success[700],

    'warning-50': colors.warning[50],
    'warning-100': colors.warning[100],
    'warning-500': colors.warning[500],
    'warning-600': colors.warning[600],
    'warning-700': colors.warning[700],

    'danger-50': colors.danger[50],
    'danger-100': colors.danger[100],
    'danger-500': colors.danger[500],
    'danger-600': colors.danger[600],
    'danger-700': colors.danger[700],

    'info-50': colors.info[50],
    'info-100': colors.info[100],
    'info-500': colors.info[500],
    'info-600': colors.info[600],
    'info-700': colors.info[700],
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    none: 'none',
  },
}

export type LightTheme = typeof lightTheme
export default lightTheme

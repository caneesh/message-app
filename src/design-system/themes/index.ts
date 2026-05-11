import { lightTheme, type LightTheme } from './light'
import { darkTheme, type DarkTheme } from './dark'

export { lightTheme, darkTheme }
export type { LightTheme, DarkTheme }

export type Theme = LightTheme | DarkTheme
export type ThemeName = 'light' | 'dark'

export const themes: Record<ThemeName, Theme> = {
  light: lightTheme,
  dark: darkTheme,
}

export function getTheme(name: ThemeName): Theme {
  return themes[name]
}

export function generateCSSVariables(theme: Theme): string {
  const lines: string[] = []

  // Colors
  for (const [key, value] of Object.entries(theme.colors)) {
    lines.push(`  --color-${key}: ${value};`)
  }

  // Shadows
  for (const [key, value] of Object.entries(theme.shadows)) {
    lines.push(`  --shadow-${key}: ${value};`)
  }

  return lines.join('\n')
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement

  // Apply colors
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--color-${key}`, value)
  }

  // Apply shadows
  for (const [key, value] of Object.entries(theme.shadows)) {
    root.style.setProperty(`--shadow-${key}`, value)
  }

  // Update class
  root.classList.remove('light', 'dark')
  root.classList.add(theme.name)
}

export default themes

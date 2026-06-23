/**
 * Simple Mode Configuration
 *
 * Temporary simple mode: re-enable extra sections later.
 *
 * When VITE_SIMPLE_MODE=true, the app shows only Messages and Settings.
 * All other sections are hidden but not removed.
 */

// Sections visible in simple mode (Messages, Thoughts via chat, Settings)
const SIMPLE_MODE_SECTIONS = ['chat', 'settings']

// Check if simple mode is enabled via environment variable
export function isSimpleModeEnabled() {
  return import.meta.env.VITE_SIMPLE_MODE === 'true'
}

// Check if a section should be visible
export function isSectionVisible(sectionId) {
  if (!isSimpleModeEnabled()) return true
  return SIMPLE_MODE_SECTIONS.includes(sectionId)
}

// Get the default tab for simple mode
export function getDefaultTab() {
  return isSimpleModeEnabled() ? 'chat' : 'chat'
}

// Filter nav categories based on simple mode
export function filterNavCategories(categories) {
  if (!isSimpleModeEnabled()) return categories

  return categories
    .map(category => ({
      ...category,
      items: category.items.filter(item => SIMPLE_MODE_SECTIONS.includes(item.id))
    }))
    .filter(category => category.items.length > 0)
}

// Filter nav items based on simple mode
export function filterNavItems(items) {
  if (!isSimpleModeEnabled()) return items
  return items.filter(item => SIMPLE_MODE_SECTIONS.includes(item.id))
}

export default {
  isSimpleModeEnabled,
  isSectionVisible,
  getDefaultTab,
  filterNavCategories,
  filterNavItems
}

/**
 * Emoji utilities for detecting emoji-only messages
 */

/**
 * Check if a string contains only emoji characters (no text, numbers, or punctuation)
 * Supports:
 * - Basic emoji
 * - Emoji with variation selectors
 * - Zero-width joiner (ZWJ) sequences (e.g., 👨‍👩‍👧‍👦, 👩‍❤️‍👨)
 * - Skin tone modifiers (e.g., 👍🏽)
 * - Flag sequences (e.g., 🇺🇸)
 * - Multiple emoji with spaces between them
 *
 * @param {string} text - The text to check
 * @returns {boolean} - True if the text contains only emoji
 */
export function isEmojiOnlyMessage(text) {
  if (!text || typeof text !== 'string') return false

  const trimmed = text.trim()
  if (trimmed.length === 0) return false

  // Remove all spaces first
  const noSpaces = trimmed.replace(/\s+/g, '')
  if (noSpaces.length === 0) return false

  // Use Unicode property escapes to match emoji
  // This pattern matches:
  // - Extended_Pictographic: emoji and pictographic symbols
  // - Emoji_Presentation: emoji with default emoji presentation
  // - Regional_Indicator: flag sequences (🇺🇸)
  // - Variation selectors: ︎, ️
  // - Zero-width joiner: ‍
  // - Skin tone modifiers: \u{1F3FB}-\u{1F3FF}
  // - Combining marks for keycaps: ⃣
  const emojiPattern = /^(?:[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Regional_Indicator}]|︎|️|‍|[\u{1F3FB}-\u{1F3FF}]|⃣)+$/u

  return emojiPattern.test(noSpaces)
}

/**
 * Count the number of grapheme clusters (visual emoji) in a string
 * This is useful for determining if we should apply large emoji styling
 *
 * @param {string} text - The text to count
 * @returns {number} - The number of grapheme clusters
 */
export function countGraphemes(text) {
  if (!text || typeof text !== 'string') return 0

  // Use Intl.Segmenter if available (modern browsers)
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return [...segmenter.segment(text.trim().replace(/\s+/g, ''))].length
  }

  // Fallback: rough estimate (not perfect for all ZWJ sequences)
  const noSpaces = text.trim().replace(/\s+/g, '')
  // Split by emoji boundaries (imperfect but reasonable)
  const emojiPattern = /(\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|️|‍\p{Extended_Pictographic})*)/gu
  const matches = noSpaces.match(emojiPattern)
  return matches ? matches.length : 0
}

export default { isEmojiOnlyMessage, countGraphemes }

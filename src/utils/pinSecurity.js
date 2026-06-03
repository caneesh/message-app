const PIN_STORAGE_KEY = 'hiddenMediaPin'

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function generateSalt() {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  return arrayBufferToBase64(salt)
}

async function hashPin(pin, salt) {
  const encoder = new TextEncoder()
  const pinData = encoder.encode(pin)
  const saltBuffer = base64ToArrayBuffer(salt)

  // Combine pin and salt
  const combined = new Uint8Array(pinData.length + saltBuffer.byteLength)
  combined.set(pinData, 0)
  combined.set(new Uint8Array(saltBuffer), pinData.length)

  // Hash using SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', combined)
  return arrayBufferToBase64(hashBuffer)
}

export async function createPinHash(pin) {
  if (!pin || pin.length < 4 || pin.length > 6) {
    throw new Error('PIN must be 4-6 digits')
  }

  if (!/^\d+$/.test(pin)) {
    throw new Error('PIN must contain only digits')
  }

  const salt = generateSalt()
  const hash = await hashPin(pin, salt)

  const pinData = {
    hash,
    salt,
    version: 1,
    createdAt: Date.now()
  }

  localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinData))
  return true
}

export async function verifyPin(pin) {
  const stored = localStorage.getItem(PIN_STORAGE_KEY)
  if (!stored) {
    return false
  }

  try {
    const pinData = JSON.parse(stored)
    const hash = await hashPin(pin, pinData.salt)
    return hash === pinData.hash
  } catch {
    return false
  }
}

export function isPinConfigured() {
  const stored = localStorage.getItem(PIN_STORAGE_KEY)
  if (!stored) return false

  try {
    const pinData = JSON.parse(stored)
    return !!(pinData.hash && pinData.salt)
  } catch {
    return false
  }
}

export function clearPin() {
  localStorage.removeItem(PIN_STORAGE_KEY)
}

export function getPinCreatedAt() {
  const stored = localStorage.getItem(PIN_STORAGE_KEY)
  if (!stored) return null

  try {
    const pinData = JSON.parse(stored)
    return pinData.createdAt || null
  } catch {
    return null
  }
}

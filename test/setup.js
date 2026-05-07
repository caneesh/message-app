import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('../src/firebase/firebaseConfig', () => ({
  db: {},
  auth: {},
  storage: {},
  functions: {},
  PRIVATE_CHAT_ID: 'test-chat-id',
  VAPID_KEY: null,
  requestNotificationPermission: vi.fn(),
}))

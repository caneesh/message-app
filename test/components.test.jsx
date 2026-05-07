import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../src/firebase/firebaseConfig', () => ({
  db: {},
  auth: { currentUser: null },
  storage: {},
  functions: {},
  PRIVATE_CHAT_ID: 'test-chat-id',
  VAPID_KEY: null,
  requestNotificationPermission: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
  doc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => new Date()),
  onSnapshot: vi.fn((ref, callback) => {
    callback({ docs: [] })
    return () => {}
  }),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
}))

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytesResumable: vi.fn(),
  getDownloadURL: vi.fn(),
}))

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
}))

import MessageInput from '../src/chat/MessageInput'

describe('MessageInput Component', () => {
  const mockUser = {
    uid: 'test-user-id',
    phoneNumber: '+1234567890',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders input field and send button', () => {
    render(
      <MessageInput
        currentUser={mockUser}
        chatId="test-chat"
        activeReplyTo={null}
        clearReply={() => {}}
      />
    )

    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('prevents sending empty message', () => {
    render(
      <MessageInput
        currentUser={mockUser}
        chatId="test-chat"
        activeReplyTo={null}
        clearReply={() => {}}
      />
    )

    const sendButton = screen.getByRole('button', { name: /send/i })
    expect(sendButton).toBeDisabled()
  })

  it('enables send button when text is entered', () => {
    render(
      <MessageInput
        currentUser={mockUser}
        chatId="test-chat"
        activeReplyTo={null}
        clearReply={() => {}}
      />
    )

    const input = screen.getByPlaceholderText(/type a message/i)
    fireEvent.change(input, { target: { value: 'Hello world' } })

    const sendButton = screen.getByRole('button', { name: /send/i })
    expect(sendButton).not.toBeDisabled()
  })

  it('accepts message with emoji', () => {
    render(
      <MessageInput
        currentUser={mockUser}
        chatId="test-chat"
        activeReplyTo={null}
        clearReply={() => {}}
      />
    )

    const input = screen.getByPlaceholderText(/type a message/i)
    fireEvent.change(input, { target: { value: 'Hello 👋🏻' } })

    expect(input.value).toBe('Hello 👋🏻')
    const sendButton = screen.getByRole('button', { name: /send/i })
    expect(sendButton).not.toBeDisabled()
  })

  it('shows reply preview when replying', () => {
    const replyTo = {
      messageId: 'msg-123',
      senderId: 'other-user',
      textPreview: 'Original message text',
    }

    render(
      <MessageInput
        currentUser={mockUser}
        chatId="test-chat"
        activeReplyTo={replyTo}
        clearReply={() => {}}
      />
    )

    expect(screen.getByText(/replying to/i)).toBeInTheDocument()
    expect(screen.getByText(/original message text/i)).toBeInTheDocument()
  })

  it('shows character count warning when over limit', () => {
    render(
      <MessageInput
        currentUser={mockUser}
        chatId="test-chat"
        activeReplyTo={null}
        clearReply={() => {}}
      />
    )

    const input = screen.getByPlaceholderText(/type a message/i)
    const longText = 'a'.repeat(2001)
    fireEvent.change(input, { target: { value: longText } })

    expect(screen.getByText(/message too long/i)).toBeInTheDocument()
  })

  it('disables send button when over character limit', () => {
    render(
      <MessageInput
        currentUser={mockUser}
        chatId="test-chat"
        activeReplyTo={null}
        clearReply={() => {}}
      />
    )

    const input = screen.getByPlaceholderText(/type a message/i)
    const longText = 'a'.repeat(2001)
    fireEvent.change(input, { target: { value: longText } })

    const sendButton = screen.getByRole('button', { name: /send/i })
    expect(sendButton).toBeDisabled()
  })

  it('shows quick actions button', () => {
    render(
      <MessageInput
        currentUser={mockUser}
        chatId="test-chat"
        activeReplyTo={null}
        clearReply={() => {}}
      />
    )

    expect(screen.getByTitle(/quick actions/i)).toBeInTheDocument()
  })
})

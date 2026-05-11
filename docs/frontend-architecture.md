# OneRoom Frontend Architecture

**Version**: 1.0
**Status**: Production-Grade
**Stack**: React + Vite, TypeScript, Tailwind CSS, Zustand, Framer Motion

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Application Shell                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      Theme Provider                          │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │                   Auth Provider                      │    │   │
│  │  │  ┌───────────────────────────────────────────────┐  │    │   │
│  │  │  │              Store Provider (Zustand)          │  │    │   │
│  │  │  │  ┌─────────────────────────────────────────┐  │  │    │   │
│  │  │  │  │           Router (React Router)          │  │  │    │   │
│  │  │  │  │  ┌───────────────────────────────────┐  │  │  │    │   │
│  │  │  │  │  │        Feature Modules            │  │  │  │    │   │
│  │  │  │  │  └───────────────────────────────────┘  │  │  │    │   │
│  │  │  │  └─────────────────────────────────────────┘  │  │    │   │
│  │  │  └───────────────────────────────────────────────┘  │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Folder Structure

```
src/
├── app/                          # Application shell
│   ├── providers/               # Context providers
│   │   ├── ThemeProvider.tsx
│   │   ├── AuthProvider.tsx
│   │   └── index.ts
│   ├── routes/                  # Route definitions
│   │   ├── AppRoutes.tsx
│   │   └── guards/
│   └── App.tsx
│
├── features/                     # Feature modules (domain-driven)
│   ├── chat/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── api/
│   │   ├── types/
│   │   └── index.ts
│   ├── decisions/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── api/
│   │   ├── types/
│   │   └── index.ts
│   ├── promises/
│   ├── memories/
│   ├── ai/
│   └── settings/
│
├── shared/                       # Shared utilities
│   ├── components/              # Shared UI components
│   │   ├── primitives/          # Base components (Button, Input)
│   │   ├── patterns/            # Composite patterns (Card, Modal)
│   │   └── layouts/             # Layout components
│   ├── hooks/                   # Shared hooks
│   ├── utils/                   # Utility functions
│   ├── api/                     # API layer
│   │   ├── client.ts            # API client
│   │   ├── firebase.ts          # Firebase config
│   │   └── types.ts
│   └── types/                   # Shared types
│
├── design-system/               # Design tokens & theme
│   ├── tokens/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── shadows.ts
│   │   ├── animations.ts
│   │   └── index.ts
│   ├── themes/
│   │   ├── light.ts
│   │   ├── dark.ts
│   │   └── index.ts
│   └── index.ts
│
├── store/                        # Global state (Zustand)
│   ├── slices/
│   │   ├── authSlice.ts
│   │   ├── uiSlice.ts
│   │   ├── chatSlice.ts
│   │   └── notificationSlice.ts
│   ├── middleware/
│   ├── selectors/
│   └── index.ts
│
├── animations/                   # Animation system (Framer Motion)
│   ├── variants/
│   │   ├── page.ts
│   │   ├── list.ts
│   │   ├── modal.ts
│   │   └── card.ts
│   ├── hooks/
│   │   ├── useAnimatedMount.ts
│   │   └── useReducedMotion.ts
│   ├── components/
│   │   ├── AnimatedPresence.tsx
│   │   ├── PageTransition.tsx
│   │   └── AnimatedList.tsx
│   └── index.ts
│
├── assets/                       # Static assets
│   ├── icons/
│   ├── images/
│   └── fonts/
│
└── styles/                       # Global styles
    ├── globals.css
    ├── reset.css
    └── utilities.css
```

---

## 3. State Management Strategy

### 3.1 Zustand Store Architecture

```typescript
// Store composition pattern
interface RootStore {
  // Slices
  auth: AuthSlice
  ui: UISlice
  chat: ChatSlice
  decisions: DecisionSlice
  notifications: NotificationSlice
  
  // Hydration
  hydrate: () => Promise<void>
  reset: () => void
}

// Slice pattern
interface AuthSlice {
  // State
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  login: (credentials: Credentials) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}
```

### 3.2 State Categories

| Category | Storage | Tool | Example |
|----------|---------|------|---------|
| **Server State** | Remote | React Query + Firestore | Messages, decisions |
| **Client State** | Memory | Zustand | UI state, selections |
| **Persisted State** | LocalStorage | Zustand persist | Theme, preferences |
| **URL State** | URL | React Router | Filters, active tab |
| **Form State** | Local | React Hook Form | Form inputs |

### 3.3 Optimistic Updates Pattern

```typescript
// Optimistic update with rollback
const sendMessage = async (message: Message) => {
  // 1. Optimistic update
  const tempId = generateTempId()
  addMessage({ ...message, id: tempId, status: 'sending' })
  
  try {
    // 2. Server request
    const result = await api.messages.send(message)
    
    // 3. Replace temp with real
    replaceMessage(tempId, result)
  } catch (error) {
    // 4. Rollback on failure
    removeMessage(tempId)
    showError('Failed to send message')
  }
}
```

---

## 4. API Abstraction Layer

### 4.1 API Client Structure

```typescript
// api/client.ts
class APIClient {
  private firebase: FirebaseApp
  private cache: Map<string, CacheEntry>
  
  // Resource endpoints
  messages: MessageAPI
  decisions: DecisionAPI
  promises: PromiseAPI
  memories: MemoryAPI
  ai: AIAPI
  
  // Lifecycle
  subscribe<T>(path: string, callback: (data: T) => void): Unsubscribe
  invalidate(pattern: string): void
}

// Usage
const api = new APIClient(firebaseConfig)

// Subscribe to real-time updates
const unsubscribe = api.messages.subscribe(chatId, (messages) => {
  setMessages(messages)
})

// Mutations with optimistic updates
await api.decisions.create(decision, { optimistic: true })
```

### 4.2 Feature API Modules

```typescript
// features/decisions/api/decisionsApi.ts
export const decisionsApi = {
  // Queries
  getAll: (chatId: string) => firebase.collection(`chats/${chatId}/decisions`),
  getById: (chatId: string, id: string) => firebase.doc(`chats/${chatId}/decisions/${id}`),
  
  // Mutations
  create: async (chatId: string, decision: NewDecision) => {...},
  update: async (chatId: string, id: string, updates: Partial<Decision>) => {...},
  confirm: async (chatId: string, id: string, userId: string) => {...},
  
  // Subscriptions
  subscribe: (chatId: string, callback: (decisions: Decision[]) => void) => {...},
}
```

---

## 5. Component Hierarchy

### 5.1 Component Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                         PAGE COMPONENTS                          │
│  Full screens with routing, data fetching, state management      │
│  Examples: ChatPage, DecisionsPage, SettingsPage                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       FEATURE COMPONENTS                         │
│  Domain-specific, business logic aware                           │
│  Examples: DecisionList, ChatComposer, PromiseTracker            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       PATTERN COMPONENTS                         │
│  Reusable patterns, may have some business context               │
│  Examples: Card, Modal, Dropdown, DataTable                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      PRIMITIVE COMPONENTS                        │
│  Pure UI, no business logic, fully controlled                    │
│  Examples: Button, Input, Badge, Avatar, Icon                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Component Template

```typescript
// Primitive component template
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(baseStyles, variants[variant], sizes[size])} {...props}>
        {isLoading ? <Spinner /> : children}
      </button>
    )
  }
)
```

---

## 6. Animation System

### 6.1 Animation Variants

```typescript
// animations/variants/page.ts
export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2, ease: 'easeIn' } },
}

// animations/variants/list.ts
export const listVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  },
  item: {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  },
}

// animations/variants/modal.ts
export const modalVariants = {
  overlay: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  content: {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25 } },
  },
}
```

### 6.2 Animation Hooks

```typescript
// useReducedMotion - respects user preference
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [])
  
  return prefersReducedMotion
}

// useAnimationConfig - returns appropriate config
export function useAnimationConfig() {
  const reducedMotion = useReducedMotion()
  
  return {
    transition: reducedMotion ? { duration: 0 } : { duration: 0.3 },
    variants: reducedMotion ? instantVariants : defaultVariants,
  }
}
```

---

## 7. Theme Engine

### 7.1 Design Tokens

```typescript
// design-system/tokens/colors.ts
export const colors = {
  // Semantic colors
  primary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  // ... other scales
  
  // Semantic aliases
  semantic: {
    success: 'green',
    warning: 'amber',
    danger: 'red',
    info: 'blue',
  },
}

// design-system/tokens/typography.ts
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
}

// design-system/tokens/spacing.ts
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
}
```

### 7.2 Theme Definition

```typescript
// design-system/themes/light.ts
export const lightTheme = {
  name: 'light',
  colors: {
    // Surfaces
    'surface-primary': colors.white,
    'surface-secondary': colors.neutral[50],
    'surface-tertiary': colors.neutral[100],
    'surface-sunken': colors.neutral[200],
    
    // Content
    'content-primary': colors.neutral[900],
    'content-secondary': colors.neutral[600],
    'content-tertiary': colors.neutral[400],
    
    // Borders
    'border-light': colors.neutral[200],
    'border-default': colors.neutral[300],
    
    // Brand
    'primary': colors.primary,
    'success': colors.green,
    'warning': colors.amber,
    'danger': colors.red,
  },
}

// design-system/themes/dark.ts
export const darkTheme = {
  name: 'dark',
  colors: {
    'surface-primary': colors.neutral[900],
    'surface-secondary': colors.neutral[800],
    'surface-tertiary': colors.neutral[700],
    'surface-sunken': colors.neutral[950],
    
    'content-primary': colors.neutral[50],
    'content-secondary': colors.neutral[300],
    'content-tertiary': colors.neutral[500],
    
    'border-light': colors.neutral[700],
    'border-default': colors.neutral[600],
    
    'primary': colors.primary,
    'success': colors.green,
    'warning': colors.amber,
    'danger': colors.red,
  },
}
```

---

## 8. Performance Optimization

### 8.1 Code Splitting

```typescript
// Lazy load feature modules
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage'))
const DecisionsPage = lazy(() => import('@/features/decisions/pages/DecisionsPage'))
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'))

// Route-based code splitting
<Routes>
  <Route path="/chat" element={
    <Suspense fallback={<PageSkeleton />}>
      <ChatPage />
    </Suspense>
  } />
</Routes>
```

### 8.2 Memoization Strategy

```typescript
// Component memoization
const MessageItem = memo(({ message, onReact }: MessageItemProps) => {
  // ...
}, (prev, next) => prev.message.id === next.message.id && prev.message.status === next.message.status)

// Selector memoization
const selectUnreadMessages = createSelector(
  [(state) => state.messages, (state) => state.lastReadTimestamp],
  (messages, lastRead) => messages.filter(m => m.timestamp > lastRead)
)

// Callback memoization
const handleReact = useCallback((emoji: string) => {
  addReaction(messageId, emoji)
}, [messageId, addReaction])
```

### 8.3 Virtual Lists

```typescript
// For long message lists
import { Virtuoso } from 'react-virtuoso'

<Virtuoso
  data={messages}
  itemContent={(index, message) => <MessageItem message={message} />}
  followOutput="smooth"
  alignToBottom
/>
```

---

## 9. Accessibility

### 9.1 Accessibility Checklist

- [ ] Semantic HTML (`<button>`, `<nav>`, `<main>`, `<article>`)
- [ ] ARIA labels for interactive elements
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus management for modals
- [ ] Color contrast ratios (4.5:1 minimum)
- [ ] Screen reader announcements for dynamic content
- [ ] Reduced motion support
- [ ] Skip links for navigation

### 9.2 Focus Management

```typescript
// Modal focus trap
export function useModalFocus(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      containerRef.current?.focus()
    } else {
      previousFocusRef.current?.focus()
    }
  }, [isOpen])
  
  return containerRef
}
```

---

## 10. Migration Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Set up new folder structure
- [ ] Implement Zustand store with slices
- [ ] Create API abstraction layer
- [ ] Set up Framer Motion animation system
- [ ] Implement theme engine with dark mode

### Phase 2: Core Migration (Week 3-4)
- [ ] Migrate chat feature to new architecture
- [ ] Migrate decisions feature
- [ ] Migrate promises feature
- [ ] Update all components to use new patterns

### Phase 3: Enhancement (Week 5-6)
- [ ] Add optimistic updates
- [ ] Implement virtual lists
- [ ] Add proper error boundaries
- [ ] Performance audit and optimization

### Phase 4: Polish (Week 7-8)
- [ ] Accessibility audit
- [ ] Animation polish
- [ ] Documentation
- [ ] Testing coverage

---

*Version 1.0 - Production-Grade Frontend Architecture*

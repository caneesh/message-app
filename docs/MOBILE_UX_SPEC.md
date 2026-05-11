# OneRoom Mobile UX Specification

## Overview

Touch-first mobile redesign prioritizing thumb ergonomics, safe-area compliance, reduced cognitive load, and premium visual quality across iPhone, Android, mobile web, and PWA.

---

## 1. Mobile Wireframes

### Main Chat View
```
┌─────────────────────────────────┐
│ ▓▓ safe-area-top ▓▓▓▓▓▓▓▓▓▓▓▓▓ │
├─────────────────────────────────┤
│  ≡  OneRoom         🔔  👤     │  ← Compact header (56px)
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │ Friend's message        │   │  ← Message bubbles
│  │ with relaxed padding    │   │    (16px padding)
│  └─────────────────────────┘   │
│                                 │
│       ┌─────────────────────┐  │
│       │ Your message        │  │
│       │ gradient accent     │  │
│       └─────────────────────┘  │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Long press for actions  │   │
│  │ Swipe to reply          │   │
│  └─────────────────────────┘   │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│  ╭─────────────────────────╮   │  ← Floating composer
│  │ ＋  📎  Message...   ➤ │   │    (detached, pill shape)
│  ╰─────────────────────────╯   │
│            12px gap             │
├─────────────────────────────────┤
│  💬      📋      ✓      ⚙️    │  ← Bottom tab bar (64px)
│  Chat  Decisions Promise Settings│
│ ▓▓▓ safe-area-bottom ▓▓▓▓▓▓▓▓▓ │
└─────────────────────────────────┘
```

### Decisions List View
```
┌─────────────────────────────────┐
│ ▓▓ safe-area-top ▓▓▓▓▓▓▓▓▓▓▓▓▓ │
├─────────────────────────────────┤
│  ←  Decisions           ＋      │
├─────────────────────────────────┤
│  ╭────────────────────────────╮ │
│  │ All │ Active │ Changed     │ │  ← Filter pills
│  ╰────────────────────────────╯ │
├─────────────────────────────────┤
│  ↓ Pull to refresh              │
│                                 │
│  ╭────────────────────────────╮ │
│  │ ● Restaurant for Friday   │◂│  ← Swipeable card
│  │   Active · 2 participants  │ │    (swipe → archive)
│  │   "Italian place downtown" │ │
│  │              ⋯ View more   │ │  ← Progressive disclosure
│  ╰────────────────────────────╯ │
│                                 │
│  ╭────────────────────────────╮ │
│  │ ○ Vacation dates          │ │
│  │   Changed · Yesterday      │ │
│  │              ▸ chevron     │ │
│  ╰────────────────────────────╯ │
│                                 │
│                                 │
├─────────────────────────────────┤
│  💬      📋      ✓      ⚙️    │
└─────────────────────────────────┘
```

### Promise Split View
```
┌─────────────────────────────────┐
│ ▓▓ safe-area-top ▓▓▓▓▓▓▓▓▓▓▓▓▓ │
├─────────────────────────────────┤
│  ←  Promises                    │
├─────────────────────────────────┤
│  ╭──────────────────────────╮   │
│  │ To Me (3) │ By Me (5)    │   │  ← Segmented control
│  ╰──────────────────────────╯   │
├─────────────────────────────────┤
│                                 │
│  ╭────────────────────────────╮ │
│  │ ⏳ Call mom this week     │ │  ← Status indicator left
│  │    Due: May 12            │ │
│  │    ╭────╮ ╭──────╮        │ │
│  │    │ ✓  │ │  ✗   │        │ │  ← Large action buttons
│  │    ╰────╯ ╰──────╯        │ │    (48px touch targets)
│  ╰────────────────────────────╯ │
│                                 │
│  ╭────────────────────────────╮ │
│  │ ✓ Pick up groceries       │ │  ← Completed state
│  │    Completed May 8     🗑️ │ │    (muted, delete option)
│  ╰────────────────────────────╯ │
│                                 │
│                                 │
│  ╭────────────────────────────╮ │
│  │     📊 Completion Rate    │ │  ← Stats card
│  │     ████████░░ 80%        │ │
│  ╰────────────────────────────╯ │
├─────────────────────────────────┤
│  💬      📋      ✓      ⚙️    │
└─────────────────────────────────┘
```

---

## 2. Interaction Flows

### Swipe Gestures

```
MESSAGE INTERACTIONS
─────────────────────────────────────────
Swipe Right (partial)  → Reply to message
Swipe Right (full)     → React with emoji
Swipe Left             → (disabled - prevent accidental)
Long Press (500ms)     → Quick action menu
Double Tap             → Heart reaction

CARD INTERACTIONS
─────────────────────────────────────────
Swipe Left             → Archive / Cancel
Swipe Right            → Mark Done (promises)
Long Press             → Multi-select mode
Tap                    → Expand details
```

### Pull to Refresh

```
PULL SEQUENCE
─────────────────────────────────────────
1. Touch + Hold at top
2. Pull down (resistance curve)
   - 0-40px: Linear pull
   - 40-80px: Resistance (0.5x)
   - 80px+: Threshold reached (haptic)
3. Release
   - If threshold: Refresh + spinner
   - If not: Snap back (spring animation)
4. Complete: Fade out spinner
```

### Keyboard Handling

```
COMPOSER BEHAVIOR
─────────────────────────────────────────
Keyboard Opens:
  1. Composer rises above keyboard
  2. Chat content scrolls to bottom
  3. Tab bar hides (recovers space)

Keyboard Closes:
  1. Composer returns to floating position
  2. Tab bar reappears
  3. Spring animation (0.3s)
```

---

## 3. Responsive Behavior Rules

### Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile S | 320px | Single column, compact |
| Mobile M | 375px | Single column, standard |
| Mobile L | 414px | Single column, comfortable |
| Tablet | 768px | Side drawer available |
| Desktop | 1024px+ | Persistent sidebar |

### Component Adaptations

```typescript
// Spacing scale by breakpoint
const spacing = {
  mobile: {
    gutter: 16,      // Side padding
    cardGap: 12,     // Between cards
    sectionGap: 24,  // Between sections
  },
  tablet: {
    gutter: 24,
    cardGap: 16,
    sectionGap: 32,
  },
  desktop: {
    gutter: 32,
    cardGap: 20,
    sectionGap: 40,
  }
}

// Touch targets
const touchTargets = {
  minimum: 44,    // WCAG AA
  comfortable: 48,
  large: 56,      // Primary actions
}
```

### Safe Area Handling

```css
/* iOS notch + home indicator */
.screen-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Tab bar */
.tab-bar {
  height: calc(64px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
}

/* Floating composer */
.composer {
  bottom: calc(64px + env(safe-area-inset-bottom) + 12px);
}
```

---

## 4. Accessibility Guidance

### Touch Targets

| Element | Minimum Size | Spacing |
|---------|--------------|---------|
| Buttons | 44×44px | 8px between |
| List items | 48px height | - |
| Action buttons | 48×48px | 12px between |
| Tab bar items | 64px wide | - |

### Focus Management

```typescript
// Screen reader announcements
const announcements = {
  messageSent: "Message sent",
  messageReceived: "New message from {name}",
  promiseCompleted: "Promise marked as done",
  swipeAction: "Swipe right to mark done, left to cancel",
  pullRefresh: "Pull down to refresh",
}

// Focus trap for sheets
const focusTrap = {
  firstElement: 'close-button',
  lastElement: 'confirm-button',
  returnFocus: 'trigger-element',
}
```

### Color Contrast

| Element | Foreground | Background | Ratio |
|---------|------------|------------|-------|
| Primary text | #1F2937 | #FFFFFF | 12.6:1 |
| Secondary text | #6B7280 | #FFFFFF | 5.4:1 |
| Accent on light | #6C5CE7 | #F3F4F6 | 4.6:1 |
| Status badges | White | Status color | 4.5:1+ |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all animations */
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  
  /* Keep essential feedback */
  .touch-feedback:active {
    background-color: var(--active-bg);
  }
}
```

---

## 5. Touch Ergonomics Analysis

### Thumb Zone Map

```
┌─────────────────────────────────┐
│                                 │
│   ╔═══════════════════════╗     │  HARD TO REACH
│   ║  Tertiary Actions     ║     │  (settings, search)
│   ║  • Settings button    ║     │
│   ║  • Search icon        ║     │
│   ╚═══════════════════════╝     │
│                                 │
│   ┌───────────────────────┐     │  MODERATE EFFORT
│   │  Secondary Actions    │     │  (content browsing)
│   │  • Card expansion     │     │
│   │  • Scroll content     │     │
│   └───────────────────────┘     │
│                                 │
│   ╔═══════════════════════╗     │  EASY TO REACH
│   ║  Primary Actions      ║     │  (compose, navigate)
│   ║  • Floating composer  ║     │
│   ║  • Tab bar            ║     │
│   ║  • Action buttons     ║     │
│   ╚═══════════════════════╝     │
│                                 │
└─────────────────────────────────┘

Right-hand single-thumb usage:
├── Natural arc from bottom-right
├── Comfortable zone: bottom 60%
└── Stretch zone: top-left corner
```

### One-Handed Operation Guidelines

1. **Primary actions at bottom**
   - Send message button
   - Tab navigation
   - FAB for new items

2. **Swipe from edges**
   - Right edge swipe: context actions
   - Left edge swipe: go back
   - Bottom edge swipe: dismiss keyboard

3. **Avoid top corners**
   - Place hamburger menu in header left (use drawer)
   - Put search in header center (expandable)
   - Settings accessible via profile tab

---

## 6. Component Redesign Recommendations

### Floating Composer (Before → After)

```
BEFORE:
┌─────────────────────────────────┐
│ ┌─────────────────────────────┐ │  ← Attached to edge
│ │ + 📎 Type message...   Send │ │  ← Dense controls
│ └─────────────────────────────┘ │  ← Small tap targets
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
└─────────────────────────────────┘

AFTER:
┌─────────────────────────────────┐
│                                 │
│  ╭─────────────────────────╮   │  ← Floating pill
│  │ ＋  📎  Message...   ⬤ │   │  ← 12px from edges
│  ╰─────────────────────────╯   │  ← 48px action buttons
│           ↕ 12px gap            │  ← Detached from tab bar
│  ╭─────────────────────────╮   │
│  │ 💬    📋    ✓    ⚙️   │   │
│  ╰─────────────────────────╯   │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
└─────────────────────────────────┘
```

### Card Density (Before → After)

```
BEFORE:
╭────────────────────────────────╮
│ Restaurant for Friday    Active│  ← Too dense
│ Italian place downtown • 2 ppl │  ← Hard to scan
│ Changed 2h ago │ Edit │ History│  ← Cramped actions
╰────────────────────────────────╯

AFTER:
╭────────────────────────────────╮
│ ● Restaurant for Friday        │  ← Status indicator
│                                 │  ← Visual breathing room
│   "Italian place downtown"     │  ← Clear content hierarchy
│                                 │
│   Active · 2 participants      │  ← Metadata row
│                        ▸       │  ← Single disclosure arrow
╰────────────────────────────────╯
```

### Tab Bar (Before → After)

```
BEFORE:
┌─────────────────────────────────┐
│  💬      📋      ✓      ⚙️    │  ← 56px height
│  Chat  Decisions Promise Settings│  ← No active indicator
└─────────────────────────────────┘

AFTER:
┌─────────────────────────────────┐
│   ╭──╮                          │
│   │💬│    📋      ✓      ⚙️   │  ← Active pill background
│   ╰──╯                          │
│   Chat  Decisions Promise Settings│  ← 64px + safe area
│   ●                             │  ← Active dot indicator
└─────────────────────────────────┘
```

---

## 7. Mobile Animation Guidelines

### Timing Functions

```css
/* Standard easing */
--ease-out: cubic-bezier(0.4, 0, 0.2, 1);        /* Default transitions */
--ease-in-out: cubic-bezier(0.4, 0, 0.6, 1);    /* Looping animations */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy feedback */

/* Durations */
--duration-instant: 100ms;   /* Micro-interactions */
--duration-fast: 150ms;      /* Button presses */
--duration-normal: 250ms;    /* Panel transitions */
--duration-slow: 350ms;      /* Page transitions */
```

### Animation Patterns

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Button press | Scale to 0.95 | 100ms | ease-out |
| Card tap | Scale to 0.98 | 150ms | ease-out |
| Sheet open | Slide up | 300ms | ease-out |
| Sheet close | Slide down | 250ms | ease-in |
| Tab switch | Cross-fade | 200ms | ease-out |
| Pull refresh | Spring bounce | 400ms | spring |
| Message send | Slide up + fade | 250ms | ease-out |

### Gesture Animations

```typescript
// Swipe feedback
const swipeAnimation = {
  threshold: 80,           // px to trigger action
  resistance: 0.5,         // Past threshold
  snapBack: {
    duration: 300,
    easing: 'ease-out'
  },
  actionTrigger: {
    duration: 200,
    scale: 0.95
  }
}

// Pull to refresh
const pullRefresh = {
  maxPull: 120,
  threshold: 80,
  spinnerSize: 40,
  animation: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
}
```

### Haptic Feedback

```typescript
// Vibration patterns (Android/iOS)
const haptics = {
  light: 10,      // Tab selection
  medium: 25,     // Action confirmation
  heavy: 50,      // Error/warning
  success: [10, 50, 10],  // Pattern
}

// Trigger haptics
function triggerHaptic(type: keyof typeof haptics) {
  if (navigator.vibrate) {
    navigator.vibrate(haptics[type])
  }
}
```

---

## 8. Implementation Checklist

### Phase 1: Foundation
- [x] Safe area CSS variables
- [x] Mobile typography scale
- [x] Touch target enforcement (44px min)
- [x] Mobile spacing utilities

### Phase 2: Core Components
- [x] MobileFloatingComposer
- [x] MobileTabBar
- [x] SwipeableCard
- [x] PullToRefresh
- [x] MobileSheet

### Phase 3: Interactions
- [ ] Gesture recognition hooks
- [ ] Haptic feedback integration
- [ ] Keyboard avoidance logic
- [ ] Animation orchestration

### Phase 4: Testing
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro Max (notch + dynamic island)
- [ ] Android varied DPI
- [ ] PWA install flow
- [ ] Offline behavior

---

## Files Created

| File | Purpose |
|------|---------|
| `src/components/mobile/MobileFloatingComposer.tsx` | Detached pill composer |
| `src/components/mobile/MobileTabBar.tsx` | Enhanced bottom navigation |
| `src/components/mobile/SwipeableCard.tsx` | Swipe gesture wrapper |
| `src/components/mobile/PullToRefresh.tsx` | Pull-to-refresh container |
| `src/components/mobile/MobileCard.tsx` | Touch-optimized cards |
| `src/components/mobile/MobileSheet.tsx` | Bottom sheet + actions |
| `src/styles/mobile.css` | Mobile-specific styles |

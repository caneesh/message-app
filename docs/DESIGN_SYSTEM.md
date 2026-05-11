# OneRoom Design System

## Philosophy

OneRoom's design system embodies **trust, clarity, calmness, and collaboration**. Every design decision prioritizes emotional intelligence and premium quality while maintaining accessibility and usability.

### Core Principles

1. **Calm Over Chaos** - Reduce visual noise; let content breathe
2. **Trust Through Consistency** - Predictable patterns build confidence
3. **Clarity Over Cleverness** - Obvious is better than smart
4. **Collaboration First** - Design for two people, not one

---

## 1. Foundations

### 1.1 Color System

#### Neutral Palette

The foundation of our visual language. Neutrals create hierarchy and provide rest for the eye.

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-0` | `#FFFFFF` | Primary backgrounds |
| `neutral-50` | `#FAFBFC` | App background |
| `neutral-100` | `#F4F5F7` | Secondary surfaces |
| `neutral-200` | `#DFE1E6` | Borders, dividers |
| `neutral-500` | `#7A869A` | Tertiary text |
| `neutral-600` | `#6B778C` | Secondary text |
| `neutral-900` | `#172B4D` | Primary text |

#### Primary Color (Violet)

Conveys wisdom, trust, and reliability. Used for primary actions and active states.

```css
--color-primary-50: #F5F3FF;   /* Subtle backgrounds */
--color-primary-500: #8B5CF6;  /* Primary actions */
--color-primary-600: #7C3AED;  /* Hover states */
--color-primary-700: #6D28D9;  /* Active states */
```

#### Secondary Color (Teal)

Represents harmony, balance, and collaboration. Used for secondary actions and success-adjacent states.

```css
--color-secondary-50: #F0FDFA;
--color-secondary-500: #14B8A6;
--color-secondary-600: #0D9488;
```

#### Semantic Colors

| Purpose | Color | Token | Usage |
|---------|-------|-------|-------|
| Success | Green | `success-500` | Completion, kept promises |
| Warning | Amber | `warning-500` | Attention, pending items |
| Danger | Red | `danger-500` | Destructive actions, broken promises |
| Info | Blue | `info-500` | Informational content |

#### Feature-Specific Colors

**Decisions:**
```css
--decision-active: var(--color-primary-500);    /* Active decisions */
--decision-changed: var(--color-warning-500);   /* Changed decisions */
--decision-cancelled: var(--color-neutral-500); /* Cancelled */
```

**Promises:**
```css
--promise-pending: var(--color-warning-500);  /* Awaiting completion */
--promise-kept: var(--color-success-500);     /* Fulfilled */
--promise-broken: var(--color-danger-500);    /* Not fulfilled */
```

**Agreements:**
```css
--agreement-draft: var(--color-neutral-500);    /* In progress */
--agreement-proposed: var(--color-info-500);    /* Awaiting acceptance */
--agreement-accepted: var(--color-secondary-500); /* Mutual agreement */
--agreement-disputed: var(--color-warning-500); /* Needs resolution */
```

**Accountability:**
```css
--accountability-on-track: var(--color-success-500);
--accountability-at-risk: var(--color-warning-500);
--accountability-overdue: var(--color-danger-500);
--accountability-completed: var(--color-primary-500);
```

---

### 1.2 Typography

#### Font Family

```css
--font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
```

#### Type Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `text-4xl` | 2.25rem | 2.5rem | 700 | Hero headings |
| `text-3xl` | 1.875rem | 2.25rem | 700 | Page titles |
| `text-2xl` | 1.5rem | 2rem | 600 | Section headings |
| `text-xl` | 1.25rem | 1.75rem | 600 | Card titles |
| `text-lg` | 1.125rem | 1.75rem | 500 | Subheadings |
| `text-base` | 1rem | 1.5rem | 400 | Body text |
| `text-sm` | 0.875rem | 1.25rem | 400 | Secondary text |
| `text-xs` | 0.75rem | 1rem | 400 | Captions, labels |
| `text-2xs` | 0.625rem | 0.875rem | 500 | Badges, tags |

#### Typography Guidelines

1. **Headlines**: Use negative letter-spacing (`-0.02em`) for display text
2. **Body**: Keep line length between 45-75 characters
3. **Contrast**: Maintain 4.5:1 for body text, 3:1 for large text
4. **Weight**: Use 500 for interactive elements, 600 for emphasis

---

### 1.3 Spacing

Based on a 4px base unit for consistent rhythm.

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `space-1` | 0.25rem | 4px | Tight gaps |
| `space-2` | 0.5rem | 8px | Icon gaps |
| `space-3` | 0.75rem | 12px | Compact padding |
| `space-4` | 1rem | 16px | Standard padding |
| `space-5` | 1.25rem | 20px | Card padding |
| `space-6` | 1.5rem | 24px | Section gaps |
| `space-8` | 2rem | 32px | Large gaps |
| `space-12` | 3rem | 48px | Section spacing |
| `space-16` | 4rem | 64px | Page margins |

#### Spacing Rules

```
┌─────────────────────────────────────────┐
│ Page Margin: space-4 (mobile) / space-8 │
│ ┌─────────────────────────────────────┐ │
│ │ Section Padding: space-6           │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ Card Padding: space-4 / space-5 │ │ │
│ │ │ Element Gap: space-3            │ │ │
│ │ │ Icon Gap: space-2               │ │ │
│ │ └─────────────────────────────────┘ │ │
│ │ Card Gap: space-3 / space-4        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

### 1.4 Shadows

Subtle shadows create depth without harshness.

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.03)` | Subtle lift |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.04)` | Buttons, inputs |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.05)` | Cards, dropdowns |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.06)` | Modals, popovers |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.08)` | Floating panels |
| `shadow-2xl` | `0 25px 50px rgba(0,0,0,0.15)` | Major overlays |

#### Colored Shadows

For emphasis on interactive elements:

```css
--shadow-primary: 0 4px 14px rgba(139, 92, 246, 0.2);
--shadow-success: 0 4px 14px rgba(16, 185, 129, 0.2);
--shadow-warning: 0 4px 14px rgba(245, 158, 11, 0.2);
--shadow-danger: 0 4px 14px rgba(239, 68, 68, 0.2);
```

---

### 1.5 Border Radius

Soft, approachable corners convey friendliness.

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Small elements |
| `radius-md` | 8px | Inputs, small cards |
| `radius-lg` | 12px | Buttons, cards |
| `radius-xl` | 16px | Large cards |
| `radius-2xl` | 20px | Modals, sheets |
| `radius-3xl` | 24px | Large panels |
| `radius-full` | 9999px | Pills, avatars |

---

### 1.6 Animation

#### Timing Functions

```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);    /* Standard */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy */
--ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);  /* iOS-like */
```

#### Duration Scale

| Token | Value | Usage |
|-------|-------|-------|
| `instant` | 50ms | Micro-interactions |
| `fastest` | 100ms | Color changes |
| `fast` | 150ms | Button states |
| `normal` | 200ms | Standard transitions |
| `slow` | 300ms | Panel transitions |
| `slower` | 400ms | Page transitions |
| `slowest` | 500ms | Complex animations |

#### Animation Guidelines

1. **Purposeful**: Every animation should communicate state change
2. **Subtle**: Keep durations under 300ms for interactions
3. **Consistent**: Use the same easing across similar interactions
4. **Accessible**: Respect `prefers-reduced-motion`

---

### 1.7 Elevation (Z-Index)

| Token | Value | Usage |
|-------|-------|-------|
| `z-base` | 0 | Content |
| `z-dropdown` | 10 | Dropdowns |
| `z-sticky` | 20 | Sticky headers |
| `z-fixed` | 30 | Fixed elements |
| `z-modal-backdrop` | 40 | Modal overlays |
| `z-modal` | 50 | Modals |
| `z-popover` | 60 | Popovers |
| `z-tooltip` | 70 | Tooltips |
| `z-toast` | 80 | Notifications |
| `z-max` | 100 | Critical overlays |

---

### 1.8 Breakpoints

| Token | Value | Devices |
|-------|-------|---------|
| `xs` | 320px | Small phones |
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

---

## 2. Components

### 2.1 Buttons

#### Variants

| Variant | Usage |
|---------|-------|
| `primary` | Main actions, CTAs |
| `secondary` | Secondary actions |
| `ghost` | Tertiary actions |
| `danger` | Destructive actions |
| `success` | Positive confirmations |
| `link` | Text links |

#### Sizes

```
┌──────────────────────────────────────────────────────────────┐
│ xs: 28px │ sm: 32px │ md: 40px │ lg: 48px │ xl: 56px        │
└──────────────────────────────────────────────────────────────┘
```

#### States

```jsx
// Default
<Button variant="primary">Action</Button>

// Hover: background darkens, slight lift, colored shadow
// Active: press down, reduce shadow
// Focus: 3px ring with 15% opacity accent color
// Disabled: 60% opacity, no interactions
// Loading: spinner replaces content
```

---

### 2.2 Cards

#### Variants

| Variant | Description |
|---------|-------------|
| `default` | Subtle shadow, border |
| `elevated` | Higher shadow, no border |
| `outlined` | Border only, no shadow |
| `glass` | Frosted glass effect |
| `interactive` | Hover lift effect |

#### Structure

```
┌──────────────────────────────────────┐
│ Card Header (optional)               │
│   - Title                            │
│   - Subtitle                         │
│   - Actions                          │
├──────────────────────────────────────┤
│ Card Body                            │
│   - Content                          │
│   - Flexible padding                 │
├──────────────────────────────────────┤
│ Card Footer (optional)               │
│   - Actions                          │
│   - Metadata                         │
└──────────────────────────────────────┘
```

---

### 2.3 Badges

#### Status Badges

```jsx
// Decisions
<Badge variant="decision-active">Active</Badge>
<Badge variant="decision-changed">Changed</Badge>
<Badge variant="decision-cancelled">Cancelled</Badge>

// Promises
<Badge variant="promise-pending">Pending</Badge>
<Badge variant="promise-kept">Kept</Badge>
<Badge variant="promise-broken">Broken</Badge>

// Agreements
<Badge variant="agreement-draft">Draft</Badge>
<Badge variant="agreement-proposed">Proposed</Badge>
<Badge variant="agreement-accepted">Accepted</Badge>
<Badge variant="agreement-disputed">Disputed</Badge>

// Accountability
<Badge variant="accountability-onTrack">On Track</Badge>
<Badge variant="accountability-atRisk">At Risk</Badge>
<Badge variant="accountability-overdue">Overdue</Badge>
```

---

### 2.4 Navigation Items

```
┌────────────────────────────────────┐
│ ▌│ Icon │ Label          │ Badge │ │
└────────────────────────────────────┘
  ↑
  Active indicator (3px violet bar)
```

#### States

- **Default**: Transparent background, secondary text
- **Hover**: Tertiary background, primary text
- **Active**: Primary-50 background, primary text, left indicator

---

### 2.5 Tabs

```
╭─────────────────────────────────────────╮
│ ╭───────────╮                           │
│ │  Active   │  Inactive   Inactive      │
│ ╰───────────╯                           │
╰─────────────────────────────────────────╯
```

- Container has tertiary background, rounded
- Active tab has white background with subtle shadow
- Transition smoothly between tabs

---

### 2.6 Search Bars

```
╭───────────────────────────────────────╮
│ 🔍  Search...                    ✕    │
╰───────────────────────────────────────╯
```

- Pill shape (`radius-full`)
- Tertiary background default
- Focus: white background, primary border, subtle ring

---

### 2.7 Floating Composer

```
╭─────────────────────────────────────────╮
│                                         │
│  ╭───────────────────────────────────╮  │
│  │ ＋  📎  Message...            ⬤  │  │
│  ╰───────────────────────────────────╯  │
│                                         │
│  ╭───────────────────────────────────╮  │
│  │  💬    📋    ✓    ⚙️           │  │
│  ╰───────────────────────────────────╯  │
╰─────────────────────────────────────────╯
```

- Detached from edges (12px margin)
- Glassmorphism background
- 28px border radius (pill-ish)
- Expands vertically with content

---

### 2.8 Sidebars

```
┌──────────────────────┐
│ Logo        [toggle] │
├──────────────────────┤
│ ▌ Dashboard          │
│   Messages           │
│   Decisions          │
│   Promises           │
├──────────────────────┤
│ CATEGORY             │
│   Settings           │
│   Help               │
├──────────────────────┤
│ User Profile         │
└──────────────────────┘
```

- Glassmorphism background
- Collapsible to icon-only (72px)
- Category labels in uppercase, tertiary color
- Smooth width transition

---

### 2.9 Modals

```
┌─────────────────────────────────────────┐
│ Title                              [✕]  │
├─────────────────────────────────────────┤
│                                         │
│   Content area with flexible padding   │
│                                         │
├─────────────────────────────────────────┤
│                     [Cancel] [Confirm]  │
└─────────────────────────────────────────┘
```

- Centered with backdrop blur
- `radius-2xl` corners
- Scale-in animation
- Focus trap enabled

---

### 2.10 Drawers

```
Mobile Sheet (bottom):
┌─────────────────────────────────────────┐
│              ─────                      │
│              Handle                     │
├─────────────────────────────────────────┤
│ Title                              [✕]  │
├─────────────────────────────────────────┤
│                                         │
│   Content                               │
│                                         │
└─────────────────────────────────────────┘
```

- Rounded top corners
- Draggable handle
- Slide animation from direction
- Safe area padding

---

### 2.11 Toast Notifications

```
┌─────────────────────────────────────────┐
│ ▌│ ✓ │ Title                       [✕] │
│     │ Description text                  │
└─────────────────────────────────────────┘
  ↑
  Colored left border indicates type
```

- Appears top-right (desktop) or top-center (mobile)
- Auto-dismiss after 5 seconds
- Stacks with 8px gap
- Slide-in animation

---

## 3. States

### 3.1 Interactive States

| State | Visual Treatment |
|-------|------------------|
| **Default** | Base appearance |
| **Hover** | Subtle background change, lift |
| **Focus** | 3px ring with accent color at 15% opacity |
| **Active** | Pressed appearance, reduced elevation |
| **Disabled** | 50-60% opacity, no pointer events |
| **Loading** | Spinner, reduced opacity, no interactions |

### 3.2 Validation States

| State | Border | Background | Icon |
|-------|--------|------------|------|
| **Success** | `success-500` | `success-50` | ✓ Checkmark |
| **Warning** | `warning-500` | `warning-50` | ⚠ Triangle |
| **Error** | `danger-500` | `danger-50` | ✕ Circle |

### 3.3 Loading States

```jsx
// Skeleton
<div className="animate-pulse bg-neutral-200 rounded-lg h-4 w-3/4" />

// Spinner
<div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent" />

// Progress
<div className="h-1 bg-neutral-200 rounded-full">
  <div className="h-full bg-primary-500 rounded-full w-[60%] transition-all" />
</div>
```

---

## 4. Visual Language for Features

### 4.1 Decisions

**Visual Identity**: Primary violet with a sense of clarity and resolution.

```
╭────────────────────────────────────────╮
│ ● Decision Title                       │
│                                        │
│   "Quoted content in italic"           │
│                                        │
│   ╭────────────╮                       │
│   │  Active    │  2 participants       │
│   ╰────────────╯                       │
│                                    ▸   │
╰────────────────────────────────────────╯
```

- Status indicator dot (colored)
- Subtle left border for changed/cancelled
- Change history shows timeline with arrows

### 4.2 Promises

**Visual Identity**: Warm amber (pending) transitioning to fresh green (kept).

```
╭────────────────────────────────────────╮
│ ⏳ Promise Title                       │
│    Due: May 15, 2026                   │
│                                        │
│    ╭──────╮  ╭──────╮                  │
│    │  ✓   │  │  ✕   │                  │
│    │ Done │  │Cancel│                  │
│    ╰──────╯  ╰──────╯                  │
╰────────────────────────────────────────╯
```

- Clock icon for pending, check for kept, X for broken
- Progress indicator for multi-step promises
- Large action buttons for easy completion

### 4.3 Shared Agreements

**Visual Identity**: Teal harmony representing mutual understanding.

```
╭────────────────────────────────────────╮
│ 🤝 Agreement Title                     │
│                                        │
│   ╭──────────────────────────────╮     │
│   │ You        │    Partner      │     │
│   │    ✓       │       ✓         │     │
│   │ Accepted   │    Accepted     │     │
│   ╰──────────────────────────────╯     │
│                                        │
│   Last updated: May 10, 2026           │
╰────────────────────────────────────────╯
```

- Two-sided visual showing both parties
- Clear acceptance status for each
- Handshake or link icon

### 4.4 Accountability Tracking

**Visual Identity**: Progress-focused with clear status indicators.

```
╭────────────────────────────────────────╮
│ Accountability Score                   │
│                                        │
│   ████████████░░░░░ 75%               │
│                                        │
│   ✓ 12 Kept   ⏳ 3 Pending   ✕ 1 Missed│
│                                        │
│   ╭────────────────────────────────╮   │
│   │ On Track │ At Risk │ Overdue  │   │
│   │    ●     │         │          │   │
│   ╰────────────────────────────────╯   │
╰────────────────────────────────────────╯
```

- Progress bar with gradient
- Clear numerical stats
- Status tabs for filtering

---

## 5. Accessibility

### 5.1 Color Contrast

All text must meet WCAG 2.1 AA standards:
- **Body text**: 4.5:1 minimum
- **Large text (18px+)**: 3:1 minimum
- **UI components**: 3:1 minimum

### 5.2 Focus Indicators

```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
  border-color: var(--color-primary-500);
}
```

### 5.3 Touch Targets

- Minimum: 44×44px
- Comfortable: 48×48px
- Spacing between targets: 8px minimum

### 5.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 5.5 Screen Reader Considerations

- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- Include `aria-label` for icon-only buttons
- Announce dynamic content with `aria-live`
- Maintain logical focus order

---

## 6. Motion Guidelines

### 6.1 Principles

1. **Meaningful**: Motion should communicate, not decorate
2. **Quick**: Keep interactions under 200ms
3. **Natural**: Use easing that mimics physical movement
4. **Subtle**: Avoid jarring or attention-grabbing motion

### 6.2 Common Patterns

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Button hover | Background, lift | 150ms | ease-default |
| Card hover | Scale, shadow | 200ms | ease-default |
| Modal open | Scale, fade | 250ms | ease-out |
| Sheet slide | Translate | 300ms | ease-out |
| Toast enter | Slide, fade | 200ms | ease-spring |
| Tab switch | Cross-fade | 150ms | ease-default |

### 6.3 Micro-interactions

```css
/* Button press */
.button:active {
  transform: scale(0.98);
  transition: transform 100ms ease-out;
}

/* Card hover */
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  transition: all 200ms ease-out;
}

/* Checkbox check */
.checkbox-icon {
  animation: checkmark 200ms ease-out;
}
```

---

## 7. Dark Mode Strategy

### 7.1 Principles

1. **Invert surfaces, not brand colors**
2. **Reduce shadows** (they're less visible on dark)
3. **Adjust semantic colors** slightly for visibility
4. **Maintain contrast ratios**

### 7.2 Color Adjustments

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `bg-primary` | `#FAFBFC` | `#0D0D10` |
| `bg-secondary` | `#FFFFFF` | `#131318` |
| `text-primary` | `#172B4D` | `#F4F5F7` |
| `text-secondary` | `#6B778C` | `#A5ADBA` |
| `border-default` | `#DFE1E6` | `#2D2D38` |

### 7.3 Implementation

```jsx
// Toggle dark mode
document.documentElement.classList.toggle('dark');

// Or with data attribute
document.documentElement.setAttribute('data-theme', 'dark');
```

---

## 8. Responsive System

### 8.1 Layout Shifts

| Breakpoint | Sidebar | Navigation | Cards |
|------------|---------|------------|-------|
| < 640px | Hidden | Bottom tabs | 1 column |
| 640-768px | Hidden | Bottom tabs | 2 columns |
| 768-1024px | Collapsed (72px) | Sidebar | 2 columns |
| 1024px+ | Expanded (260px) | Sidebar | 2-3 columns |

### 8.2 Component Adaptations

```jsx
// Button sizes
<Button className="h-10 md:h-9" /> // Larger on mobile

// Card padding
<Card className="p-4 md:p-5 lg:p-6" />

// Typography
<h1 className="text-2xl md:text-3xl lg:text-4xl" />
```

### 8.3 Safe Areas

```css
.app-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

---

## 9. Implementation Examples

### 9.1 Decision Card

```tsx
import { cn } from '@/lib/utils'

function DecisionCard({ decision, className }) {
  const statusStyles = {
    active: 'border-l-primary-500 bg-primary-50/50',
    changed: 'border-l-warning-500 bg-warning-50/50',
    cancelled: 'border-l-neutral-400 opacity-60',
  }

  return (
    <div
      className={cn(
        'bg-surface-secondary rounded-xl border border-border-subtle',
        'border-l-4 p-5 transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        statusStyles[decision.status],
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-content-primary">
            {decision.title}
          </h3>
          <p className="text-sm text-content-secondary mt-1">
            {decision.description}
          </p>
        </div>
        <Badge variant={`decision-${decision.status}`}>
          {decision.status}
        </Badge>
      </div>
    </div>
  )
}
```

### 9.2 Promise Progress

```tsx
function PromiseProgress({ kept, pending, broken }) {
  const total = kept + pending + broken
  const keptPercent = (kept / total) * 100
  const pendingPercent = (pending / total) * 100
  const brokenPercent = (broken / total) * 100

  return (
    <div className="space-y-3">
      <div className="flex h-2 rounded-full overflow-hidden bg-neutral-100">
        <div
          className="bg-success-500 transition-all duration-500"
          style={{ width: `${keptPercent}%` }}
        />
        <div
          className="bg-warning-500 transition-all duration-500"
          style={{ width: `${pendingPercent}%` }}
        />
        <div
          className="bg-danger-500 transition-all duration-500"
          style={{ width: `${brokenPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-success-600">{kept} kept</span>
        <span className="text-warning-600">{pending} pending</span>
        <span className="text-danger-600">{broken} broken</span>
      </div>
    </div>
  )
}
```

### 9.3 Agreement Card

```tsx
function AgreementCard({ agreement }) {
  return (
    <div className="bg-surface-secondary rounded-xl border border-border-subtle p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🤝</span>
        <h3 className="text-lg font-semibold">{agreement.title}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 bg-secondary-50 rounded-lg">
        <div className="text-center">
          <Avatar fallback="You" className="mx-auto mb-2" />
          <Badge variant={agreement.yourStatus === 'accepted' ? 'success' : 'warning'}>
            {agreement.yourStatus}
          </Badge>
        </div>
        <div className="text-center">
          <Avatar fallback="Partner" className="mx-auto mb-2" />
          <Badge variant={agreement.partnerStatus === 'accepted' ? 'success' : 'warning'}>
            {agreement.partnerStatus}
          </Badge>
        </div>
      </div>
    </div>
  )
}
```

---

## 10. Tailwind Mappings

See `tailwind.config.js` for complete token mappings. Key extensions:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F5F3FF',
          500: '#8B5CF6',
          600: '#7C3AED',
          // ...
        },
        decision: {
          active: '#8B5CF6',
          'active-bg': '#F5F3FF',
          changed: '#F59E0B',
          'changed-bg': '#FFFBEB',
        },
        promise: {
          pending: '#FBBF24',
          kept: '#10B981',
          broken: '#EF4444',
        },
        // ...
      },
    },
  },
}
```

---

## Files

| File | Purpose |
|------|---------|
| `src/design-system/tokens.ts` | TypeScript token definitions |
| `src/design-system/theme.css` | CSS custom properties |
| `src/design-system/components.ts` | Component specifications |
| `tailwind.config.js` | Tailwind integration |

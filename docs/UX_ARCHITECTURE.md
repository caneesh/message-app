# OneRoom UX Architecture

## Executive Summary

OneRoom's current 17-feature structure creates cognitive overload. Users face decision fatigue: "Should this be a reminder, promise, decision, or follow-up?"

**The Solution**: Collapse features into 4 intuitive spaces organized around user intent, with smart automation that moves items through their natural lifecycle.

---

## 1. Information Architecture Redesign

### Current Problem

```
Current: 17 discrete features across 6 categories
────────────────────────────────────────────────
User mental model: "Which drawer does this go in?"
Result: Feature paralysis, underutilization, fragmentation
```

### Proposed: Intent-Based Architecture

```
New: 4 spaces organized by user intent
────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│                        OneRoom                               │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│   TALK      │   PLAN      │   COMMIT    │    REMEMBER       │
│             │             │             │                   │
│ Real-time   │ Future      │ Agreements  │ Past              │
│ conversation│ coordination│ & tracking  │ preservation      │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│ • Chat      │ • Calendar  │ • Decisions │ • Memories        │
│ • Check-in  │ • Reminders │ • Promises  │ • Photos          │
│ • Clear Air │ • Lists     │ • Follow-up │ • Capsules        │
│             │ • Notes     │             │ • Vault           │
└─────────────┴─────────────┴─────────────┴───────────────────┘
```

### Mental Model Shift

| Old Thinking | New Thinking |
|--------------|--------------|
| "What feature do I need?" | "What am I trying to do?" |
| Navigate to correct tab | Start anywhere, system guides |
| Manual categorization | Automatic lifecycle flow |
| Features are separate | Features are connected |

---

## 2. Sitemap

```
OneRoom
│
├── 🏠 Home (Dashboard)
│   ├── Today's Focus
│   │   ├── Pending promises
│   │   ├── Due reminders
│   │   └── Partner's mood
│   ├── Quick Actions
│   │   ├── Send message
│   │   ├── Add reminder
│   │   └── Check in
│   └── Recent Activity
│       └── Timeline of changes
│
├── 💬 Talk
│   ├── Chat (default view)
│   │   ├── Message thread
│   │   ├── Quick convert actions
│   │   └── Floating composer
│   ├── Check-in
│   │   ├── Today's mood
│   │   ├── Partner's mood
│   │   └── History
│   └── Clear the Air
│       ├── Active discussions
│       ├── New misunderstanding
│       └── Resolved archive
│
├── 📅 Plan
│   ├── Calendar (default view)
│   │   ├── Month/Week/Day views
│   │   ├── Events
│   │   └── Due items overlay
│   ├── Reminders
│   │   ├── Active (by priority)
│   │   ├── Completed
│   │   └── Recurring
│   ├── Lists
│   │   ├── Shared lists
│   │   └── List items
│   └── Notes
│       └── Quick reference
│
├── 🤝 Commit
│   ├── Overview (default view)
│   │   ├── Accountability score
│   │   ├── Active commitments
│   │   └── Recent completions
│   ├── Decisions
│   │   ├── Active
│   │   ├── Changed
│   │   └── History
│   ├── Promises
│   │   ├── To me
│   │   ├── By me
│   │   └── Completed
│   └── Follow-ups
│       ├── Pending
│       └── Sent
│
├── 📚 Remember
│   ├── Timeline (default view)
│   │   └── Chronological memories
│   ├── Memories
│   │   ├── By date
│   │   └── By capsule
│   ├── Capsules
│   │   ├── Collections
│   │   └── Create new
│   ├── Photos
│   │   └── Gallery
│   └── Vault
│       ├── Emergency
│       ├── Health
│       ├── Home
│       ├── Finance
│       └── Travel
│
├── 💜 Care Mode
│   ├── Partner wellness
│   ├── Urgent items
│   └── Support resources
│
└── ⚙️ Settings
    ├── Profile
    ├── Notifications
    ├── Privacy & Security
    ├── Devices
    └── AI Preferences
```

---

## 3. Screen Hierarchy

### Primary Screens (Tab Bar / Sidebar)

```
Level 0: Tab Navigation
┌───────┬───────┬───────┬───────┬───────┐
│ Home  │ Talk  │ Plan  │Commit │Remember│
└───────┴───────┴───────┴───────┴───────┘
```

### Secondary Screens (Within Each Tab)

```
Level 1: Sub-navigation (pills/segments)
┌─────────────────────────────────────────┐
│ Talk                                    │
│ ┌─────────┬──────────┬────────────────┐ │
│ │  Chat   │ Check-in │ Clear the Air  │ │
│ └─────────┴──────────┴────────────────┘ │
└─────────────────────────────────────────┘
```

### Tertiary Screens (Modals / Sheets)

```
Level 2: Contextual overlays
┌─────────────────────────────────────────┐
│                                    [✕]  │
│ New Promise                             │
│ ─────────────────────────────────────── │
│ Created from conversation               │
│                                         │
│ "I'll call the plumber tomorrow"        │
│                                         │
│ Due: Tomorrow                           │
│ Owner: You                              │
│                                         │
│ [Cancel]              [Create Promise]  │
└─────────────────────────────────────────┘
```

### Hierarchy Depth Rules

| Level | Navigation | Example |
|-------|------------|---------|
| 0 | Tab bar | Talk, Plan, Commit |
| 1 | Segment control | Chat, Check-in |
| 2 | Modal / Sheet | New reminder |
| 3 | Sub-modal | Select date |

**Rule**: Never exceed 3 levels. If needed, use progressive disclosure within level 2.

---

## 4. Primary User Journeys

### Journey 1: Daily Check-in → Care Response

```
┌──────────────────────────────────────────────────────────────┐
│ MORNING RITUAL                                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │  Open   │───▶│ See     │───▶│ Check   │───▶│ Review  │   │
│  │  App    │    │ Partner │    │ In Own  │    │ Day     │   │
│  │         │    │ Mood    │    │ Mood    │    │ Together│   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│       │              │              │              │         │
│       ▼              ▼              ▼              ▼         │
│  [Dashboard]    [Empathy      [Self         [Shared        │
│               prompt if      reflection]   planning]       │
│               partner sad]                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Journey 2: Conversation → Commitment

```
┌──────────────────────────────────────────────────────────────┐
│ NATURAL COMMITMENT FLOW                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │ Chat    │───▶│  AI     │───▶│ Review  │───▶│ Track   │   │
│  │ about   │    │ detects │    │ & edit  │    │ in      │   │
│  │ plans   │    │ promise │    │ promise │    │ Commit  │   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│       │              │              │              │         │
│       ▼              ▼              ▼              ▼         │
│  "I'll pick      [Subtle        [One-tap       [Appears in  │
│   up dinner"     highlight]      confirm]       dashboard]   │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Detection Patterns:
• "I'll..." → Promise
• "Let's decide..." → Decision  
• "Don't forget..." → Reminder
• "Remember when..." → Memory
```

### Journey 3: Conflict → Resolution

```
┌──────────────────────────────────────────────────────────────┐
│ MISUNDERSTANDING RESOLUTION                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │ Tension │───▶│ Clear   │───▶│ Each    │───▶│ Reach   │   │
│  │ in chat │    │ the Air │    │ shares  │    │ under-  │   │
│  │         │    │ prompt  │    │ view    │    │ standing│   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│       │              │              │              │         │
│       ▼              ▼              ▼              ▼         │
│  [AI detects     [Private       [AI helps      [Archive +   │
│   sentiment]     reflection]    articulate]    growth log]  │
│                                                              │
│                                        │                     │
│                                        ▼                     │
│                              ┌─────────────────┐             │
│                              │ Optional:       │             │
│                              │ Create decision │             │
│                              │ to prevent      │             │
│                              │ recurrence      │             │
│                              └─────────────────┘             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Journey 4: Decision → Action → Memory

```
┌──────────────────────────────────────────────────────────────┐
│ COMPLETE LIFECYCLE                                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │ Discuss │───▶│ Decide  │───▶│ Promise │───▶│ Execute │   │
│  │ options │    │ together│    │ actions │    │ & track │   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│       │              │              │              │         │
│       │              │              │              ▼         │
│       │              │              │        ┌─────────┐    │
│       │              │              │        │ Complete│    │
│       │              │              │        │ & review│    │
│       │              │              │        └─────────┘    │
│       │              │              │              │         │
│       │              │              │              ▼         │
│       │              │              │        ┌─────────┐    │
│       │              │              └───────▶│ Archive │    │
│       │              │                       │ memory  │    │
│       │              │                       └─────────┘    │
│       │              │                                      │
│       ▼              ▼                                      │
│  [Chat tab]    [Commit tab]                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Example:
1. Chat: "Should we get a dog?"
2. Decide: "We'll adopt a rescue dog this spring"
3. Promise: "I'll research shelters" + "You'll check apartment rules"
4. Execute: Track progress, check off tasks
5. Archive: Memory with photo of new dog + perspectives
```

---

## 5. Feature Relationships

### Conceptual Model

```
                    ┌─────────────────────────────────────┐
                    │           CONVERSATION              │
                    │         (where it starts)           │
                    └──────────────┬──────────────────────┘
                                   │
                                   ▼
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
      ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
      │   PLANNING    │    │  COMMITTING   │    │   RESOLVING   │
      │               │    │               │    │               │
      │ • Reminders   │    │ • Decisions   │    │ • Clear Air   │
      │ • Events      │    │ • Promises    │    │ • Follow-ups  │
      │ • Lists       │    │               │    │               │
      └───────┬───────┘    └───────┬───────┘    └───────┬───────┘
              │                    │                    │
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────────┐
                    │            MEMORY                   │
                    │        (where it rests)             │
                    │                                     │
                    │ • Completed decisions → History     │
                    │ • Kept promises → Memories          │
                    │ • Resolved conflicts → Growth log   │
                    │ • Shared experiences → Capsules     │
                    └─────────────────────────────────────┘
```

### Feature Transition Matrix

| From | Can become | Trigger |
|------|------------|---------|
| Message | Reminder | "Don't forget...", manual |
| Message | Promise | "I'll...", "I promise...", manual |
| Message | Decision | "Let's decide...", manual |
| Message | Memory | "Remember when...", manual |
| Reminder | Promise | "I'll handle this" |
| Promise | Memory | Completion + significant |
| Decision | Promise | Action items extracted |
| Decision | Memory | Major life decision archived |
| Misunderstanding | Decision | "Let's agree to..." |
| Check-in | Misunderstanding | Low mood + context |

### Automatic Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ ITEM STATES                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ACTIVE ──────▶ PENDING ──────▶ COMPLETED ──────▶ ARCHIVED  │
│    │              │                 │                 │      │
│    │              │                 │                 │      │
│    ▼              ▼                 ▼                 ▼      │
│  Visible      Reminders         Celebrate        Searchable │
│  in tabs      sent              moment           in memory  │
│                                                              │
│  Auto-transitions:                                           │
│  • Pending → Overdue (due date passes)                       │
│  • Completed → Archived (after 7 days)                       │
│  • Active → Stale notification (no activity 14 days)        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Feature Usage Guidance

### When to Use Each Feature

```
┌─────────────────────────────────────────────────────────────┐
│ FEATURE DECISION TREE                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  "I need to..."                                              │
│       │                                                      │
│       ├── Talk right now ─────────────────▶ 💬 CHAT          │
│       │                                                      │
│       ├── Share how I'm feeling ──────────▶ 😊 CHECK-IN      │
│       │                                                      │
│       ├── Address a misunderstanding ─────▶ 🌊 CLEAR THE AIR │
│       │                                                      │
│       ├── Remember to do something ───────▶ ⏰ REMINDER      │
│       │   (task for me or us)                                │
│       │                                                      │
│       ├── Schedule a specific time ───────▶ 📅 EVENT         │
│       │                                                      │
│       ├── Track a shared list ────────────▶ 📝 LIST          │
│       │   (groceries, movies, etc.)                          │
│       │                                                      │
│       ├── Make a joint decision ──────────▶ ⚖️ DECISION      │
│       │   (something we agreed on)                           │
│       │                                                      │
│       ├── Commit to doing something ──────▶ 🤝 PROMISE       │
│       │   (accountability needed)                            │
│       │                                                      │
│       ├── Gently remind partner ──────────▶ 💌 FOLLOW-UP     │
│       │   (caring nudge)                                     │
│       │                                                      │
│       ├── Preserve a special moment ──────▶ 💜 MEMORY        │
│       │                                                      │
│       ├── Group related things ───────────▶ 📦 CAPSULE       │
│       │   (trip, project, theme)                             │
│       │                                                      │
│       └── Store important info ───────────▶ 🔐 VAULT         │
│           (emergency, medical, etc.)                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Quick Reference Cards

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 CHAT                                                      │
├─────────────────────────────────────────────────────────────┤
│ Use for: Real-time conversation, quick updates, sharing     │
│ Not for: Things that need tracking or remembering           │
│ Tip: Long-press messages to convert to tasks                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚖️ DECISIONS                                                 │
├─────────────────────────────────────────────────────────────┤
│ Use for: Joint choices you want to remember and reference   │
│ Examples: "We'll do holidays at my parents' this year"      │
│           "Budget is $200/month for dining out"             │
│ Tip: Include the "why" - helps when revisiting later        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🤝 PROMISES                                                  │
├─────────────────────────────────────────────────────────────┤
│ Use for: Commitments that need accountability               │
│ Examples: "I'll call the plumber by Friday"                 │
│           "I promise to be home by 7pm"                     │
│ Tip: Set realistic due dates - builds trust over time       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⏰ REMINDERS                                                 │
├─────────────────────────────────────────────────────────────┤
│ Use for: Tasks without personal accountability              │
│ Examples: "Pay electric bill", "Buy anniversary gift"       │
│ Not for: Promises (use Promises for accountability)         │
│ Tip: Assign to a person so it's clear who's responsible    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 💜 MEMORIES                                                  │
├─────────────────────────────────────────────────────────────┤
│ Use for: Moments worth preserving                           │
│ Examples: First apartment, engagement, trips                │
│ Special: Both can add perspectives - your view + theirs    │
│ Tip: Add to Capsules to create themed collections          │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Navigation Architecture

### Mobile Navigation

```
┌─────────────────────────────────────────────────────────────┐
│ MOBILE: BOTTOM TAB BAR + CONTEXTUAL HEADERS                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ← Talk                               🔍  ⋯           │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ ┌─────────┬──────────┬────────────┐                   │  │
│  │ │  Chat   │ Check-in │ Clear Air  │ ← Segment control│  │
│  │ └─────────┴──────────┴────────────┘                   │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │                                                       │  │
│  │              [Content Area]                           │  │
│  │                                                       │  │
│  │                                                       │  │
│  │                                                       │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  ╭─────────────────────────────────────────────────╮  │  │
│  │  │  Message...                              Send   │  │  │ ← Floating
│  │  ╰─────────────────────────────────────────────────╯  │  │
│  │                                                       │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  🏠      💬      📅      🤝      📚                 │  │ ← Tab bar
│  │ Home    Talk    Plan   Commit  Remember              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Tab Bar Behavior:                                           │
│  • Tap active tab: Scroll to top / Show sub-nav             │
│  • Long press: Quick actions sheet                          │
│  • Badge: Unread/pending count                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Desktop Navigation

```
┌─────────────────────────────────────────────────────────────┐
│ DESKTOP: COLLAPSIBLE SIDEBAR + HEADER                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ OneRoom              🔍 Search...        🔔  👤  ⚙️    ││
│  ├────────────┬────────────────────────────────────────────┤│
│  │            │                                            ││
│  │  🏠 Home   │  ┌────────┬──────────┬────────────┐       ││
│  │            │  │  Chat  │ Check-in │ Clear Air  │       ││
│  │ ──────────│  └────────┴──────────┴────────────┘       ││
│  │ TALK      │                                            ││
│  │  💬 Chat  │                                            ││
│  │  😊 Check │      [Main Content Area]                   ││
│  │  🌊 Clear │                                            ││
│  │            │                                            ││
│  │ ──────────│                                            ││
│  │ PLAN      │                                            ││
│  │  📅 Cal   │                                            ││
│  │  ⏰ Tasks │                                            ││
│  │  📝 Lists │                                            ││
│  │  📄 Notes │                                            ││
│  │            │  ┌─────────────────────────────────────┐  ││
│  │ ──────────│  │ Message...                    Send  │  ││
│  │ COMMIT    │  └─────────────────────────────────────┘  ││
│  │  ⚖️ Decide│                                            ││
│  │  🤝 Promise│                                           ││
│  │            │                                            ││
│  │ ──────────│                                            ││
│  │ REMEMBER  │                                            ││
│  │  💜 Memory│                                            ││
│  │  📦 Caps  │                                            ││
│  │  🔐 Vault │                                            ││
│  │            │                                            ││
│  │ ──────────│                                            ││
│  │  💜 Care  │                                            ││
│  │  ⚙️ Settings│                                          ││
│  └────────────┴────────────────────────────────────────────┘│
│                                                              │
│  Sidebar Behavior:                                           │
│  • Collapse to icons on medium screens                      │
│  • Hover to expand when collapsed                           │
│  • Drag edge to resize                                      │
│  • Keyboard: Cmd+\ to toggle                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Navigation States

```
┌─────────────────────────────────────────────────────────────┐
│ NAVIGATION INDICATORS                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Badges:                                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 💬 Talk  ●3         │ 3 unread messages               │   │
│  │ 📅 Plan  ●2         │ 2 overdue reminders             │   │
│  │ 🤝 Commit ●1        │ 1 promise needs attention       │   │
│  │ 💜 Care  ●          │ Partner needs support (dot)     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Active States:                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Default:     Gray icon + text                         │   │
│  │ Hover:       Icon darkens, subtle bg                  │   │
│  │ Active:      Primary color, left indicator bar        │   │
│  │ Urgent:      Pulse animation on badge                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Onboarding Flow

### Sequence Overview

```
┌─────────────────────────────────────────────────────────────┐
│ ONBOARDING SEQUENCE (5 steps, ~3 minutes)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│  │    1    │──▶│    2    │──▶│    3    │──▶│    4    │     │
│  │ Welcome │   │ Connect │   │ First   │   │ Quick   │     │
│  │         │   │ Partner │   │ Check-in│   │ Tour    │     │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│       │             │             │             │           │
│       ▼             ▼             ▼             ▼           │
│  "A shared       "Send or     "How are      Highlight      │
│   space for      accept      you feeling    4 main         │
│   just the       invite"     today?"       spaces          │
│   two of you"                                               │
│                                                              │
│                                        │                    │
│                                        ▼                    │
│                                  ┌─────────┐                │
│                                  │    5    │                │
│                                  │ You're  │                │
│                                  │  Ready  │                │
│                                  └─────────┘                │
│                                        │                    │
│                                        ▼                    │
│                                  "Send your                 │
│                                   first message"            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Step Details

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: WELCOME                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────────┐                      │
│                    │    OneRoom      │                      │
│                    │       💜        │                      │
│                    │                 │                      │
│                    │  A shared space │                      │
│                    │  for just the   │                      │
│                    │  two of you     │                      │
│                    │                 │                      │
│                    │  Chat. Plan.    │                      │
│                    │  Commit.        │                      │
│                    │  Remember.      │                      │
│                    │                 │                      │
│                    │  [Get Started]  │                      │
│                    └─────────────────┘                      │
│                                                              │
│  Goal: Set emotional tone - calm, intimate, supportive      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: CONNECT PARTNER                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────────┐                      │
│                    │ Invite Your     │                      │
│                    │ Partner         │                      │
│                    │                 │                      │
│                    │ ┌─────────────┐ │                      │
│                    │ │ +1 (___) ___│ │                      │
│                    │ └─────────────┘ │                      │
│                    │                 │                      │
│                    │ They'll receive │                      │
│                    │ a text with     │                      │
│                    │ your invite     │                      │
│                    │                 │                      │
│                    │ [Send Invite]   │                      │
│                    │                 │                      │
│                    │ ─── or ───     │                      │
│                    │                 │                      │
│                    │ [I have a code] │                      │
│                    └─────────────────┘                      │
│                                                              │
│  Goal: Establish the two-person connection                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: FIRST CHECK-IN                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────────┐                      │
│                    │ How are you     │                      │
│                    │ feeling today?  │                      │
│                    │                 │                      │
│                    │  😊  😐  😟     │                      │
│                    │                 │                      │
│                    │  😴  ❤️         │                      │
│                    │                 │                      │
│                    │ ┌─────────────┐ │                      │
│                    │ │ Add a note  │ │                      │
│                    │ │ (optional)  │ │                      │
│                    │ └─────────────┘ │                      │
│                    │                 │                      │
│                    │ [Continue]      │                      │
│                    └─────────────────┘                      │
│                                                              │
│  Goal: Introduce check-in habit, set emotional baseline     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: QUICK TOUR (swipeable cards)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Card 1: TALK                                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         💬                                          │    │
│  │                                                     │    │
│  │   Talk                                              │    │
│  │   Chat naturally. Important things can              │    │
│  │   become tasks with one tap.                        │    │
│  │                                             ● ○ ○ ○ │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Card 2: PLAN                                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         📅                                          │    │
│  │                                                     │    │
│  │   Plan                                              │    │
│  │   Reminders, events, and lists you                  │    │
│  │   manage together.                                  │    │
│  │                                             ○ ● ○ ○ │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Card 3: COMMIT                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         🤝                                          │    │
│  │                                                     │    │
│  │   Commit                                            │    │
│  │   Track decisions and promises.                     │    │
│  │   Build trust through follow-through.               │    │
│  │                                             ○ ○ ● ○ │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Card 4: REMEMBER                                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         📚                                          │    │
│  │                                                     │    │
│  │   Remember                                          │    │
│  │   Preserve memories, photos, and                    │    │
│  │   important documents together.                     │    │
│  │                                             ○ ○ ○ ● │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: READY                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────────┐                      │
│                    │      ✨         │                      │
│                    │                 │                      │
│                    │ You're all set  │                      │
│                    │                 │                      │
│                    │ Start by        │                      │
│                    │ sending a       │                      │
│                    │ message         │                      │
│                    │                 │                      │
│                    │ ┌─────────────┐ │                      │
│                    │ │ Hi! 👋      │ │                      │
│                    │ └─────────────┘ │                      │
│                    │                 │                      │
│                    │ [Send Message]  │                      │
│                    └─────────────────┘                      │
│                                                              │
│  Goal: Immediate action, builds habit from moment one       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Progressive Feature Introduction

```
┌─────────────────────────────────────────────────────────────┐
│ FEATURE UNLOCK TIMELINE                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Day 1: Core features                                        │
│  ├── Chat (unlocked immediately)                            │
│  ├── Check-in (prompted daily)                              │
│  └── Reminders (first mention triggers tip)                 │
│                                                              │
│  Day 2-3: After first conversation                          │
│  ├── "Convert to reminder" tooltip on long press            │
│  └── Lists feature highlighted                               │
│                                                              │
│  Day 4-7: First week                                         │
│  ├── Decisions feature unlocked                             │
│  ├── Promises feature unlocked                              │
│  └── "You've been chatting a lot! Want to save as memory?"  │
│                                                              │
│  Week 2: Deeper features                                     │
│  ├── Capsules (after 3+ memories)                           │
│  ├── Clear the Air (contextual, on tense conversation)     │
│  └── Care Mode (if partner has low check-in)               │
│                                                              │
│  Week 3+: Full access                                        │
│  ├── Vault                                                  │
│  ├── Advanced settings                                      │
│  └── AI suggestions fully enabled                           │
│                                                              │
│  Principle: Don't overwhelm. Let features reveal themselves │
│  naturally based on usage patterns.                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Empty State Guidance

### Philosophy

Empty states are teaching moments. They should:
1. Explain what belongs here
2. Provide a clear first action
3. Feel inviting, not empty

### Empty State Templates

```
┌─────────────────────────────────────────────────────────────┐
│ CHAT (Partner not yet joined)                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────────┐                      │
│                    │       💬        │                      │
│                    │                 │                      │
│                    │ Waiting for     │                      │
│                    │ [Partner Name]  │                      │
│                    │                 │                      │
│                    │ They'll get a   │                      │
│                    │ notification    │                      │
│                    │ when you send   │                      │
│                    │ your first      │                      │
│                    │ message         │                      │
│                    │                 │                      │
│                    │ [Resend Invite] │                      │
│                    └─────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ DECISIONS                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────────┐                      │
│                    │       ⚖️        │                      │
│                    │                 │                      │
│                    │ No decisions    │                      │
│                    │ yet             │                      │
│                    │                 │                      │
│                    │ Decisions help  │                      │
│                    │ you remember    │                      │
│                    │ what you've     │                      │
│                    │ agreed on       │                      │
│                    │                 │                      │
│                    │ Example:        │                      │
│                    │ "We'll alternate│                      │
│                    │ who picks       │                      │
│                    │ date nights"    │                      │
│                    │                 │                      │
│                    │ [Add Decision]  │                      │
│                    └─────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROMISES                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────────┐                      │
│                    │       🤝        │                      │
│                    │                 │                      │
│                    │ All clear!      │                      │
│                    │                 │                      │
│                    │ No pending      │                      │
│                    │ promises        │                      │
│                    │                 │                      │
│                    │ Promises are    │                      │
│                    │ commitments     │                      │
│                    │ you make to     │                      │
│                    │ each other      │                      │
│                    │                 │                      │
│                    │ Tip: Say "I'll" │                      │
│                    │ in chat and     │                      │
│                    │ we'll offer to  │                      │
│                    │ track it        │                      │
│                    │                 │                      │
│                    │ [Make Promise]  │                      │
│                    └─────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MEMORIES                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────────┐                      │
│                    │       💜        │                      │
│                    │                 │                      │
│                    │ Start your      │                      │
│                    │ memory book     │                      │
│                    │                 │                      │
│                    │ Preserve the    │                      │
│                    │ moments that    │                      │
│                    │ matter most     │                      │
│                    │                 │                      │
│                    │ Both of you     │                      │
│                    │ can add your    │                      │
│                    │ perspective     │                      │
│                    │                 │                      │
│                    │ [Add Memory]    │                      │
│                    └─────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ REMINDERS (with completed items)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────────┐                      │
│                    │       ✨        │                      │
│                    │                 │                      │
│                    │ You're all      │                      │
│                    │ caught up!      │                      │
│                    │                 │                      │
│                    │ 12 reminders    │                      │
│                    │ completed       │                      │
│                    │ this month      │                      │
│                    │                 │                      │
│                    │ [View History]  │                      │
│                    │                 │                      │
│                    │ [Add Reminder]  │                      │
│                    └─────────────────┘                      │
│                                                              │
│  Note: Celebrate completion, show progress                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CLEAR THE AIR                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────────┐                      │
│                    │       🌊        │                      │
│                    │                 │                      │
│                    │ Nothing to      │                      │
│                    │ clear           │                      │
│                    │                 │                      │
│                    │ When something  │                      │
│                    │ feels off,      │                      │
│                    │ this space      │                      │
│                    │ helps you       │                      │
│                    │ understand      │                      │
│                    │ each other      │                      │
│                    │                 │                      │
│                    │ [Learn More]    │                      │
│                    └─────────────────┘                      │
│                                                              │
│  Note: Don't encourage creating conflicts!                   │
│  Keep this neutral and educational.                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Agreement Lifecycle

### The Complete Flow

```
┌─────────────────────────────────────────────────────────────┐
│ AGREEMENT LIFECYCLE                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PHASE 1: EMERGENCE                                          │
│  ──────────────────                                          │
│                                                              │
│  ┌─────────────┐                                            │
│  │ Conversation│                                            │
│  │   starts    │                                            │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────┐     ┌─────────────┐                        │
│  │   Topic     │────▶│  Discussion │                        │
│  │  surfaces   │     │   unfolds   │                        │
│  └─────────────┘     └──────┬──────┘                        │
│                             │                                │
│                             ▼                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ AI Detection: "This sounds like a decision..."       │   │
│  │                                                      │   │
│  │ "We should probably..." → Decision candidate         │   │
│  │ "I'll make sure to..." → Promise candidate          │   │
│  │ "Let's agree that..." → Agreement candidate         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  PHASE 2: FORMATION                                          │
│  ─────────────────                                           │
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  Proposal   │────▶│   Review    │────▶│ Acceptance  │   │
│  │  (one-tap)  │     │   (edit)    │     │  (confirm)  │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│   AI extracts        Both can see       Both explicitly     │
│   key elements       and modify         accept or reject    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Agreement Preview                                    │   │
│  │                                                      │   │
│  │ Decision: "Dinner budget is $200/month"             │   │
│  │ Reason: "Saving for vacation"                       │   │
│  │                                                      │   │
│  │ You: ✓ Accepted                                     │   │
│  │ Partner: ○ Pending                                  │   │
│  │                                                      │   │
│  │ [Nudge Partner]                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  PHASE 3: ACTIVE TRACKING                                    │
│  ────────────────────                                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Active Agreement                              📍     │    │
│  │                                                     │    │
│  │ "Dinner budget is $200/month"                      │    │
│  │                                                     │    │
│  │ Status: Active                                      │    │
│  │ Created: May 1, 2026                               │    │
│  │ Linked promises:                                    │    │
│  │   └── "I'll track spending" (you, in progress)     │    │
│  │                                                     │    │
│  │ [View in Commit]                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Features during active phase:                               │
│  • Dashboard visibility                                      │
│  • Reference in chat ("Remember, we agreed...")             │
│  • Linked promises tracked                                  │
│  • Milestone notifications                                   │
│                                                              │
│  PHASE 4: EVOLUTION                                          │
│  ─────────────────                                           │
│                                                              │
│  ┌─────────────┐                                            │
│  │ Situation   │                                            │
│  │  changes    │                                            │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ├──────────────────┬──────────────────┐             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Modify    │    │   Cancel    │    │  Complete   │     │
│  │   (update)  │    │  (void)     │    │  (archive)  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  Change history      Both must         Celebration +       │
│  preserved           agree to cancel    memory option       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Decision History                                     │   │
│  │                                                      │   │
│  │ Current: "$250/month" (since May 15)                │   │
│  │   └── Why: "Birthday month flexibility"             │   │
│  │                                                      │   │
│  │ Previous: "$200/month" (May 1 - May 14)             │   │
│  │   └── Why: "Saving for vacation"                    │   │
│  │                                                      │   │
│  │ [View Full History]                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  PHASE 5: RESOLUTION                                         │
│  ───────────────────                                         │
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  Complete   │────▶│  Reflect    │────▶│   Archive   │   │
│  │  (done!)    │     │  (optional) │     │  (memory)   │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  Celebrate           Add perspectives    Searchable         │
│  the win             "What we learned"   forever            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🎉 Agreement Completed!                              │   │
│  │                                                      │   │
│  │ "Save $2000 for vacation"                           │   │
│  │                                                      │   │
│  │ Duration: 6 months                                   │   │
│  │ Promises kept: 24                                    │   │
│  │                                                      │   │
│  │ [Add to Memories]  [View Details]  [Done]           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Lifecycle State Machine

```
┌─────────────────────────────────────────────────────────────┐
│ STATE TRANSITIONS                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌──────────┐                             │
│                    │  DRAFT   │                             │
│                    └────┬─────┘                             │
│                         │ propose                           │
│                         ▼                                   │
│                    ┌──────────┐                             │
│          ┌────────│ PROPOSED │────────┐                     │
│          │        └────┬─────┘        │                     │
│          │ reject      │ accept       │ expire (7 days)     │
│          ▼             ▼              ▼                     │
│     ┌──────────┐ ┌──────────┐   ┌──────────┐               │
│     │ REJECTED │ │  ACTIVE  │   │ EXPIRED  │               │
│     └──────────┘ └────┬─────┘   └──────────┘               │
│                       │                                     │
│          ┌────────────┼────────────┐                       │
│          │ modify     │ complete   │ cancel                │
│          ▼            ▼            ▼                       │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│     │ CHANGED  │ │COMPLETED │ │CANCELLED │                 │
│     └────┬─────┘ └────┬─────┘ └──────────┘                 │
│          │            │                                     │
│          │            ▼                                     │
│          │       ┌──────────┐                               │
│          └──────▶│ ARCHIVED │◀────────────────────────────  │
│                  └──────────┘     (auto after 30 days)      │
│                                                              │
│  Notifications at each transition:                          │
│  • Proposed → Both notified                                 │
│  • Accepted → Celebration                                    │
│  • Changed → History logged, both notified                  │
│  • Completed → Achievement unlocked                          │
│  • Cancelled → Requires reason, both notified               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Interaction Patterns

### Contextual Actions

```
┌─────────────────────────────────────────────────────────────┐
│ MESSAGE LONG-PRESS MENU                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ "I'll pick up groceries tomorrow"                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ┌─────────────────────────────────────────────────┐ │    │
│  │ │  💬 Reply                                       │ │    │
│  │ ├─────────────────────────────────────────────────┤ │    │
│  │ │  🤝 Track as Promise  ← AI suggested           │ │    │
│  │ ├─────────────────────────────────────────────────┤ │    │
│  │ │  ⏰ Set Reminder                                │ │    │
│  │ ├─────────────────────────────────────────────────┤ │    │
│  │ │  📌 Pin Message                                 │ │    │
│  │ ├─────────────────────────────────────────────────┤ │    │
│  │ │  📋 Copy                                        │ │    │
│  │ ├─────────────────────────────────────────────────┤ │    │
│  │ │  🗑️ Delete                                      │ │    │
│  │ └─────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  AI suggestion appears when message matches pattern          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Quick Capture Flows

```
┌─────────────────────────────────────────────────────────────┐
│ UNIVERSAL QUICK ADD (Cmd+K / Long-press +)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ What would you like to add?                         │    │
│  │                                                     │    │
│  │ ┌─────────────────────────────────────────────────┐ │    │
│  │ │ 🔍 Type or choose below...                      │ │    │
│  │ └─────────────────────────────────────────────────┘ │    │
│  │                                                     │    │
│  │  💬 Message      ⏰ Reminder      📅 Event         │    │
│  │                                                     │    │
│  │  ⚖️ Decision     🤝 Promise       💜 Memory        │    │
│  │                                                     │    │
│  │  📝 Note         📋 List item     🔐 Vault item    │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Natural language parsing:                                   │
│  "Remind me to call mom tomorrow" → Reminder, due tomorrow  │
│  "We decided on Italian" → Decision, pre-filled             │
│  "I promise to..." → Promise, pre-filled                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Swipe Gestures

```
┌─────────────────────────────────────────────────────────────┐
│ CARD SWIPE ACTIONS                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  REMINDERS                                                   │
│  ←────────── Swipe Left ──────────→                         │
│  ┌──────────┬────────────────────────────────┬──────────┐   │
│  │ Complete │      Reminder Card             │  Snooze  │   │
│  │    ✓     │                                │    ⏰    │   │
│  └──────────┴────────────────────────────────┴──────────┘   │
│                                                              │
│  PROMISES                                                    │
│  ←────────── Swipe Left ──────────→                         │
│  ┌──────────┬────────────────────────────────┬──────────┐   │
│  │ Mark     │      Promise Card              │  Cancel  │   │
│  │ Done ✓   │                                │    ✗     │   │
│  └──────────┴────────────────────────────────┴──────────┘   │
│                                                              │
│  MESSAGES                                                    │
│  ←── Swipe Right ──                                         │
│  ┌──────────┬────────────────────────────────────────────┐  │
│  │  Reply   │      Message Bubble                        │  │
│  │    ↩     │                                            │  │
│  └──────────┴────────────────────────────────────────────┘  │
│                                                              │
│  Swipe distance indicates action:                            │
│  • Short swipe (< 80px): Preview action                     │
│  • Full swipe (> 80px): Execute action                      │
│  • Release before threshold: Cancel                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Summary

### Key Changes

| Before | After |
|--------|-------|
| 17 features in 6 categories | 4 intent-based spaces |
| Manual categorization | AI-assisted flow |
| Features feel disconnected | Natural lifecycle |
| Overwhelming for new users | Progressive disclosure |
| Empty states feel empty | Teaching opportunities |

### Success Metrics

| Metric | Target |
|--------|--------|
| Time to first message | < 2 minutes |
| Feature discovery rate | 80% use 4+ features in week 1 |
| Promise completion rate | > 75% |
| Daily active usage | Both partners active 5+ days/week |
| Conflict resolution | < 24 hours average |

### Implementation Priority

1. **Phase 1**: Navigation restructure (Talk, Plan, Commit, Remember)
2. **Phase 2**: AI detection for conversation → task conversion
3. **Phase 3**: Empty states and onboarding
4. **Phase 4**: Agreement lifecycle automation
5. **Phase 5**: Progressive feature revelation

---

## Files Created

| File | Purpose |
|------|---------|
| `docs/UX_ARCHITECTURE.md` | This document |

## Related Documentation

- `docs/DESIGN_SYSTEM.md` - Visual design tokens and components
- `docs/MOBILE_UX_SPEC.md` - Mobile-specific interaction patterns

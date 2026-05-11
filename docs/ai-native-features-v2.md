# OneRoom AI-Native Features Design v2

**Purpose**: Design AI-powered features that genuinely improve coordination, trust, planning, accountability, and emotional clarity for couples.

**Core Principle**: OneRoom is a relationship coordination platform, agreement intelligence system, and household memory system - not just chat.

---

## 1. Feature Concepts

### 1.1 Agreement Intelligence ("You Both Agreed")

**Purpose**: Surface relevant past decisions and agreements at contextually appropriate moments.

**How it works**:
- AI scans current conversation for topics that relate to existing decisions
- When relevant, surfaces a gentle "reminder card" with the past agreement
- Never accusatory, always collaborative framing

**Examples**:
- Partner mentions dining out → "You both agreed: $200/month dining budget"
- Discussion about weekend plans → "Reminder: You alternate who picks date activities"
- Conversation about chores → "Last month you decided: Partner A handles dishes, Partner B handles laundry"

**UI Pattern**: Gentle inline card that appears above the message input, dismissible with one tap.

---

### 1.2 Unresolved Conflict Detector

**Purpose**: Identify conversations that ended without resolution and offer to help.

**How it works**:
- AI analyzes conversation patterns for:
  - Topic changes without resolution ("let's talk about this later")
  - Emotional temperature drops without repair
  - Questions left unanswered
- Creates a "clear the air" prompt for both partners

**Privacy Approach**:
- Only suggests, never forces
- Both partners must opt-in to see detected conflicts
- No judgment, just observation

**UI Pattern**: Appears in "Relationship Pulse" section as "1 topic to revisit" with soft amber indicator.

---

### 1.3 Household Workload Awareness

**Purpose**: Help couples see workload distribution without scorekeeping.

**How it works**:
- Tracks completed promises, tasks, and reminders by each partner
- Generates weekly "partnership pulse" summary
- Frames as celebration of teamwork, not comparison

**Key Design Decisions**:
- Never shows percentages (no "you do 70%")
- Shows categories both partners contribute to
- Highlights growth and consistency
- Suggests balance through positive framing

**UI Pattern**: Weekly digest card, opt-in only, shows "This week's teamwork" with contribution categories.

---

### 1.4 Memory Resurfacing Engine

**Purpose**: Bring back meaningful moments at contextually appropriate times.

**Triggers**:
- Anniversary of a saved memory
- Location-based (if enabled)
- Conversation keyword matching
- "On this day" style prompts

**Examples**:
- "1 year ago: Your first trip to the cabin"
- "You saved this memory 6 months ago" (with thumbnail)
- During discussion about vacations → "Here are your favorite travel memories together"

**Privacy Approach**:
- Only surfaces memories both partners have seen
- Never surfaces during tense conversations (emotional temperature check)
- Always dismissible with "not now"

**UI Pattern**: Floating memory card with photo thumbnail, appears between messages.

---

### 1.5 Promise Accountability Companion

**Purpose**: Gentle accountability for commitments without nagging.

**How it works**:
- Tracks promises from conversation
- Escalating reminder cadence: subtle → gentle → direct
- Offers to help rephrase follow-ups

**Escalation Pattern**:
1. **Day 1 past due**: No notification
2. **Day 3**: Soft badge on promises tab
3. **Day 7**: Gentle prompt to person who made promise
4. **Day 14**: Offer to help craft a follow-up message

**Key Design Decisions**:
- Promise maker gets reminders, not promise receiver
- Never "tattles" to partner
- Offers constructive help, not guilt

**UI Pattern**: Promise cards with subtle "overdue" state, never red/aggressive.

---

### 1.6 Emotional Clarity Coach

**Purpose**: Help partners communicate emotions clearly without judgment.

**Features**:
- Real-time tone indicators while typing (opt-in)
- "This might come across as..." suggestions
- Alternative phrasing options
- Context-aware based on recent emotional check-ins

**Key Design Decisions**:
- Never blocks sending any message
- Suggestions are subtle and optional
- Learns from user's acceptance/rejection patterns
- Respects when user intentionally wants directness

**UI Pattern**: Subtle underline indicators, expand for suggestions.

---

### 1.7 Coordination Assistant

**Purpose**: Help manage shared logistics and planning.

**Features**:
- Automatic extraction of dates, times, commitments
- Calendar conflict detection
- "Both free" time finding
- Packing/planning list generation from conversation

**Examples**:
- "You mentioned Friday dinner - add to calendar?"
- "Partner has a conflict at 7pm - suggest alternate times?"
- "Trip to cabin mentioned - generate packing list?"

**UI Pattern**: Smart action chips that appear contextually.

---

### 1.8 Relationship Pulse Dashboard

**Purpose**: A shared view of relationship health metrics.

**Metrics**:
- Communication frequency
- Response patterns
- Decision completion rate
- Promise fulfillment rate
- Emotional check-in trends
- Shared memories created

**Key Design Decisions**:
- Always presented as trends, not scores
- No comparison to "other couples"
- Focus on growth over time
- Celebration of positive patterns

**UI Pattern**: Weekly digest view, accessible from main dashboard.

---

## 2. UI Integration Patterns

### 2.1 AI Insight Cards

**Anatomy**:
```
┌─────────────────────────────────────┐
│ ✨ [Type Icon]                   ✕  │
│                                     │
│ [Main insight text]                 │
│ [Supporting context]                │
│                                     │
│ [Primary Action]  [Dismiss]         │
└─────────────────────────────────────┘
```

**Types**:
- **Agreement Reminder**: Purple accent, shield icon
- **Memory Resurface**: Warm amber, photo icon
- **Conflict Alert**: Soft amber, heart icon
- **Promise Nudge**: Gentle blue, checkmark icon
- **Coordination Tip**: Teal, calendar icon

### 2.2 Contextual Action Chips

Small, inline suggestions that appear after relevant messages:
```
┌──────────────────┐ ┌───────────────┐ ┌─────────────┐
│ 📅 Add to cal    │ │ ✓ Track this  │ │ 💭 Save     │
└──────────────────┘ └───────────────┘ └─────────────┘
```

### 2.3 AI Composer Overlay

When AI is helping compose/rephrase:
```
┌─────────────────────────────────────┐
│ ✨ AI is thinking...                │
│ ━━━━━━━━━━━━━━━━━━━░░░░░░░░░░      │
└─────────────────────────────────────┘
```

Then:
```
┌─────────────────────────────────────┐
│ ✨ Suggestions                       │
│                                     │
│ ○ "Could we talk about dinner..."   │
│ ○ "I'd love to discuss when..."     │
│ ○ "What do you think about..."      │
│                                     │
│ [Use selected]  [Write my own]      │
└─────────────────────────────────────┘
```

### 2.4 Pulse Indicators

Subtle status indicators in navigation:
- **Green dot**: All healthy, no pending items
- **Amber dot**: Items to review (conflicts, overdue promises)
- **No dot**: AI features disabled

---

## 3. Interaction Flows

### 3.1 Agreement Resurfacing Flow

```
User types message about budgeting
         ↓
AI detects topic match with existing decision
         ↓
Gentle card slides up: "You both agreed: $200/month dining"
         ↓
┌────────────────┬────────────────┐
│   [Got it]     │  [View full]   │
└────────────────┴────────────────┘
         ↓
Card auto-dismisses after 8s if no action
```

### 3.2 Conflict Resolution Prompt Flow

```
Conversation ends with unresolved topic
         ↓
24 hours pass
         ↓
Both partners see: "Would you like to revisit [topic]?"
         ↓
Both must tap "Yes" for prompt to activate
         ↓
Opens structured "Clear the Air" form
```

### 3.3 Promise Tracking Flow

```
AI detects: "I'll pick up groceries tomorrow"
         ↓
Chip appears: [Track this promise?]
         ↓
User taps → Promise created with:
  - Auto-filled title
  - Inferred due date
  - Assigned to sender
         ↓
User can edit before confirming
```

---

## 4. Notification Strategies

### 4.1 Notification Types

| Type | Priority | Sound | Badge |
|------|----------|-------|-------|
| New message | High | Yes | Yes |
| Promise reminder | Low | No | Subtle |
| Agreement relevant | Low | No | No |
| Memory resurface | Low | No | No |
| Conflict prompt | Medium | No | Amber |
| Weekly digest | Low | No | No |

### 4.2 Notification Cadence Rules

- **Max 2 AI notifications per day** (excluding messages)
- **No AI notifications during active conversation** (last message < 30 min)
- **No AI notifications after 9pm local time**
- **Respect focus/DND modes**
- **Bundle similar notifications**

### 4.3 Notification Copy Guidelines

- Always warm, never urgent
- Frame as helpful, not obligatory
- Include context snippet
- Single clear action

**Examples**:
- "A memory from last summer might brighten your day"
- "You both wanted to revisit the vacation plans"
- "Your weekly partnership pulse is ready"

---

## 5. Trust & Privacy Model

### 5.1 Data Processing Principles

1. **On-device first**: Local analysis when possible
2. **Ephemeral processing**: AI calls don't store conversation history
3. **Minimum data**: Only send what's needed for the specific feature
4. **Both partners informed**: Both know when AI features are active

### 5.2 Consent Layers

| Layer | Description | Default |
|-------|-------------|---------|
| Master toggle | Enable any AI features | OFF |
| Feature toggles | Per-feature opt-in | OFF |
| Data sharing | Allow message content analysis | OFF |
| Notifications | AI-generated notifications | OFF |

### 5.3 Transparency Features

- **AI indicator**: All AI-generated content marked with ✨
- **Activity log**: "What AI has accessed" viewable anytime
- **Data export**: Full export of all AI interactions
- **Delete**: Remove all AI data with one action

### 5.4 Partner Visibility

- Both partners can see if AI features are enabled
- Neither partner can enable AI for the other
- AI suggestions visible only to intended recipient
- No "secret" monitoring features

### 5.5 What AI Never Does

- Read messages without explicit opt-in
- Share information between partners without consent
- Store conversation patterns for "learning"
- Train on user data
- Access messages from before opt-in
- Make any changes without user confirmation

---

## 6. Implementation Components

### 6.1 New Types
- `AIInsight`: Base type for all AI-generated insights
- `AgreementMatch`: When current conversation matches a decision
- `ConflictSignal`: Detected unresolved conversation
- `PromiseDetection`: Identified commitment
- `MemoryTrigger`: Relevant memory to surface

### 6.2 New Components
- `AIInsightCard`: Generic insight display
- `AgreementReminderCard`: Decision/agreement surfacing
- `PromiseNudgeCard`: Promise accountability
- `MemoryResurfaceCard`: Memory display
- `EmotionalClarityIndicator`: Tone suggestions
- `CoordinationChips`: Action suggestions
- `RelationshipPulse`: Dashboard widget
- `AISettingsPanel`: Consent management

### 6.3 New Hooks
- `useAIInsights`: Manage insight display/dismissal
- `useAgreementMatcher`: Match conversation to decisions
- `usePromiseDetector`: Detect commitments
- `useEmotionalTone`: Analyze message tone
- `useRelationshipPulse`: Aggregate metrics

---

## 7. Success Metrics

### 7.1 Engagement Metrics
- AI feature adoption rate (target: 40% of active users)
- Insight acceptance rate (target: 30% of shown insights)
- Feature retention after 30 days (target: 60%)

### 7.2 Quality Metrics
- False positive rate for conflict detection (target: < 20%)
- Promise detection accuracy (target: > 80%)
- User satisfaction with suggestions (target: 4+/5)

### 7.3 Trust Metrics
- Privacy concern reports (target: < 1% of users)
- Feature disable rate after trial (target: < 30%)
- "Felt surveilled" in feedback (target: < 5%)

---

*Version 2.0 - AI-Native Features Design*
*Focus: Relationship coordination, not just chat*

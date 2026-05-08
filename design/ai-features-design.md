# OneRoom AI Features Design Document

## 1. Current App Assessment

### Technology Stack
- **Frontend**: React 18.2 with Vite 5, deployed to Firebase Hosting
- **Backend**: Firebase ecosystem (Firestore, Auth, Storage, Cloud Functions v2)
- **Authentication**: Phone-based auth via Firebase
- **Real-time**: Firestore onSnapshot listeners throughout
- **Push Notifications**: Firebase Cloud Messaging (FCM)

### Existing Data Model
The app uses a chat-centric model with 15+ subcollections under `chats/{chatId}`:
- **Core**: messages, reactions, typing, pinnedMessages
- **Relationship**: emotionalReceipts, checkIns, memories, misunderstandings
- **Organization**: reminders, decisions, promises, capsules, followUps
- **Storage**: vaultItems, notes, lists, events, importantDates

### Existing Cloud Functions
1. `sendNewMessageNotification` - Firestore trigger for push notifications
2. `cleanupOldMessages` - Scheduled cleanup every 6 hours
3. `createInvite` / `redeemInvite` - Callable functions for chat invitations

### Security Posture
- Comprehensive Firestore rules with `isChatMember()` validation
- All subcollections require authenticated chat membership
- Storage rules enforce 5MB limit and allowed file types
- No direct external API access from client

### AI Readiness Assessment
- **Strengths**: Existing Cloud Functions infrastructure, clear data model, real-time patterns established
- **Gaps**: No AI service integration, no suggestion/approval workflow, no consent tracking
- **Risk Areas**: Cost management, rate limiting, data privacy for AI processing

---

## 2. Recommended AI Architecture

### Principle: Backend-Only AI Processing
All AI API calls must go through Cloud Functions. The frontend never calls OpenAI/Anthropic directly.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   React     │────▶│  Cloud Functions │────▶│  AI API     │
│   Frontend  │◀────│  (Firebase)      │◀────│  (Anthropic)│
└─────────────┘     └──────────────────┘     └─────────────┘
       │                     │
       │                     ▼
       │            ┌──────────────────┐
       └───────────▶│    Firestore     │
                    └──────────────────┘
```

### Function Types

**1. On-Demand Functions (Callable)**
- User explicitly requests AI assistance
- Examples: Tone repair, message rewrite
- Triggered by user action in UI

**2. Background Processing Functions (Firestore Triggers)**
- Passive analysis after message/document creation
- Examples: Promise detection, decision detection
- Creates suggestions for user approval

**3. Scheduled Functions (Cron)**
- Periodic batch operations
- Examples: Daily summary, weekly digest

### API Provider Recommendation
**Primary: Anthropic Claude API**
- Better at nuanced relationship/emotional content
- Haiku model for cost-effective quick tasks
- Sonnet for more complex analysis

**Fallback Pattern**
- Local heuristics as fallback when API fails
- Graceful degradation to non-AI functionality

---

## 3. AI Consent Model

### Consent Levels

```javascript
// Per-user AI preferences stored at users/{userId}/settings/ai
{
  aiEnabled: boolean,           // Master toggle
  features: {
    toneRepair: boolean,
    promiseDetection: boolean,
    decisionDetection: boolean,
    messageToTask: boolean,
    misunderstandingHelper: boolean,
    capsuleSuggestions: boolean,
    dailySummary: boolean,
    followUpGenerator: boolean,
    memoryAssistant: boolean,
    vaultExtractor: boolean
  },
  dataSharing: {
    allowMessageAnalysis: boolean,  // Allow AI to read message content
    allowPatternLearning: boolean   // Allow cross-conversation learning
  }
}
```

### Consent Flow
1. **First Launch**: Explain AI features, default all OFF
2. **Feature Discovery**: When user first encounters AI feature, explain and ask
3. **Settings Page**: Granular control over each feature
4. **Per-Action Consent**: Some features require approval before executing

### Data Handling Commitments
- Messages sent to AI are not stored by AI provider (use API settings)
- AI suggestions are stored locally in Firestore, not externally
- User can delete all AI-generated content
- No cross-chat learning without explicit consent

---

## 4. AI Suggestion Data Model

### Core Suggestion Schema

```javascript
// chats/{chatId}/aiSuggestions/{suggestionId}
{
  // Identity
  id: string,
  type: 'tone_repair' | 'promise_detected' | 'decision_detected' | 
        'task_suggestion' | 'misunderstanding_helper' | 'capsule_suggestion' |
        'follow_up_suggestion' | 'memory_suggestion' | 'vault_suggestion',
  
  // Source
  sourceType: 'message' | 'conversation' | 'scheduled',
  sourceId: string | null,          // Message ID if applicable
  sourcePreview: string,            // First 100 chars for context
  
  // Suggestion Content
  title: string,                    // Short description
  suggestion: string,               // The AI-generated content
  suggestedAction: object,          // Structured data for the action
  confidence: number,               // 0-1 confidence score
  
  // Targeting
  targetUserId: string,             // Who should see this suggestion
  
  // Status
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'auto_dismissed',
  
  // Metadata
  createdAt: timestamp,
  expiresAt: timestamp,             // Auto-expire old suggestions
  processedAt: timestamp | null,    // When user acted
  processedAction: string | null,   // What action was taken
  
  // Audit
  aiModel: string,                  // Which model generated this
  promptVersion: string             // Version tracking for prompts
}
```

### Suggestion Lifecycle
1. **Created**: AI generates suggestion, status = 'pending'
2. **Shown**: User sees suggestion in UI
3. **Acted**: User accepts/rejects/modifies
4. **Archived**: Suggestion moves to processed state

### Expiration Policy
- Tone repair suggestions: 5 minutes (contextual to draft)
- Detection suggestions: 24 hours
- Summary suggestions: 48 hours
- Auto-dismiss if source message deleted

---

## 5. AI Feature-by-Feature Design

### Feature 1: AI-Powered Tone Repair

**Purpose**: Enhance existing local tone repair with AI-powered rewrites when user opts in.

**Trigger**: User clicks "Soften with AI" button (new option alongside existing local options).

**Input**:
```javascript
{
  originalText: string,
  toneGoal: 'softer' | 'clearer' | 'more_caring' | 'less_angry',
  contextMessages: Message[],  // Last 3-5 messages for context
  partnerMood: string | null   // From check-in if available
}
```

**Output**:
```javascript
{
  rewrittenText: string,
  explanation: string,  // Brief note on changes made
  confidence: number
}
```

**Approval Flow**:
1. User drafts message
2. Clicks "Tone" → "Soften with AI"
3. Loading state while API processes (1-3 seconds)
4. Shows suggested rewrite with diff highlighting
5. User can: Accept, Edit, Try Again, Cancel
6. Only on Accept does the draft update

**Firestore Write**: None for the AI call itself. If accepted, normal message send flow.

**Risks**:
- Over-sanitizing authentic expression
- Latency frustrating real-time conversation
- Cost if used frequently

**Guardrails**:
- Rate limit: 10 AI rewrites per user per hour
- Minimum message length: 10 characters
- Cache identical requests for 5 minutes
- Fallback to local repair if API fails

**Complexity**: Low - Extends existing feature, single API call, no background processing.

---

### Feature 2: Promise Detector

**Purpose**: Automatically detect when a message contains a promise and suggest creating a Promise Tracker entry.

**Trigger**: Firestore trigger on new message creation.

**Input**:
```javascript
{
  messageText: string,
  senderName: string,
  timestamp: timestamp,
  recentContext: Message[]  // Last 5 messages
}
```

**Output**:
```javascript
{
  isPromise: boolean,
  confidence: number,
  extractedPromise: {
    title: string,
    description: string,
    suggestedDueDate: timestamp | null,
    promiseOwner: 'sender' | 'recipient'
  }
}
```

**Approval Flow**:
1. Message sent
2. Background function analyzes (async, non-blocking)
3. If promise detected with confidence > 0.7:
   - Creates aiSuggestion document
   - Shows subtle notification to sender: "Track this promise?"
4. User taps to see extracted promise details
5. Can: Create Promise, Edit & Create, Dismiss
6. On accept, creates entry in promises subcollection

**Firestore Write**:
- Creates `aiSuggestions/{id}` on detection
- On accept, creates `promises/{id}`
- Updates suggestion status

**Risks**:
- False positives annoying users
- Missing context changes meaning
- Processing every message costly

**Guardrails**:
- Confidence threshold: 0.7 minimum
- Rate limit: Process max 100 messages per chat per day
- Exclude very short messages (< 20 chars)
- Exclude messages that are clearly questions
- User can disable per-chat or globally

**Complexity**: Medium - Background trigger, suggestion workflow, creates secondary documents.

---

### Feature 3: Message-to-Task Converter

**Purpose**: Convert a message into a reminder or list item with one tap + AI extraction.

**Trigger**: User long-presses message → "Create Task from This"

**Input**:
```javascript
{
  messageText: string,
  messageTimestamp: timestamp,
  conversationContext: Message[]  // Surrounding messages
}
```

**Output**:
```javascript
{
  taskTitle: string,
  taskDescription: string,
  suggestedDueDate: timestamp | null,
  suggestedAssignee: 'sender' | 'recipient' | null,
  taskType: 'reminder' | 'list_item'
}
```

**Approval Flow**:
1. User selects message action "Create Task"
2. Brief loading (1-2 seconds)
3. Shows pre-filled form with AI suggestions
4. User can edit all fields
5. Confirm creates the reminder/list item

**Firestore Write**:
- On confirm: creates `reminders/{id}` or adds to `lists/{listId}/items`
- No aiSuggestion document (synchronous flow)

**Risks**:
- Extracting wrong details
- Creating duplicates of existing tasks
- Over-automation feeling impersonal

**Guardrails**:
- Always show editable preview, never auto-create
- Check for similar existing reminders (fuzzy match title)
- Limit to 20 conversions per user per day
- Clear "AI suggested" label on created items

**Complexity**: Low - Synchronous, user-initiated, direct feedback loop.

---

### Feature 4: Decision Detector

**Purpose**: Identify when a decision has been made in conversation and suggest logging it.

**Trigger**: Firestore trigger on message creation (batched with promise detection).

**Input**:
```javascript
{
  messageText: string,
  conversationContext: Message[],  // Last 10 messages
  existingDecisions: Decision[]    // Recent decisions to avoid duplicates
}
```

**Output**:
```javascript
{
  isDecision: boolean,
  confidence: number,
  extractedDecision: {
    title: string,
    description: string,
    decisionType: 'agreement' | 'choice' | 'plan',
    participants: string[]
  }
}
```

**Approval Flow**:
1. Decision language detected (confidence > 0.75)
2. Creates suggestion for both chat members
3. Either user can act on it
4. Preview shows extracted decision
5. Accept creates decision document
6. Link to source message preserved

**Firestore Write**:
- Creates `aiSuggestions/{id}` 
- On accept: creates `decisions/{id}` with `sourceMessageId`

**Risks**:
- Casual agreement != formal decision
- Context misinterpretation
- Duplicate detection from both sides

**Guardrails**:
- Higher confidence threshold (0.75)
- Deduplicate: if both users get same suggestion, link them
- Check against recent decisions for similarity
- Cooldown: max 5 decision suggestions per chat per day

**Complexity**: Medium - Similar to promise detection, needs deduplication logic.

---

### Feature 5: Misunderstanding Helper

**Purpose**: When user opens "Clear the Air" flow, AI can help articulate feelings.

**Trigger**: User clicks "Help me express this" in misunderstanding form.

**Input**:
```javascript
{
  sourceMessageText: string,
  userDraft: {
    whatIMeant: string | null,
    whatIHeard: string | null,
    whatINeed: string | null
  },
  fieldToHelp: 'whatIMeant' | 'whatIHeard' | 'whatINeed'
}
```

**Output**:
```javascript
{
  suggestions: string[],  // 2-3 alternative phrasings
  tone: 'gentle',
  explanation: string
}
```

**Approval Flow**:
1. User starts misunderstanding marker
2. Struggles with wording, clicks "Help me express this"
3. AI offers 2-3 phrasing options
4. User selects one or writes their own
5. Continues with form submission

**Firestore Write**: None for AI assistance. Normal misunderstanding document on submit.

**Risks**:
- AI words don't feel authentic
- Over-reliance on AI for emotional expression
- Misreading the emotional context

**Guardrails**:
- Always offer multiple options, not single "right" answer
- Include "None of these, I'll write my own" option
- Gentle, non-clinical language
- No storage of drafts or AI suggestions

**Complexity**: Low - Synchronous, optional enhancement, no background processing.

---

### Feature 6: Context Capsule Suggestions

**Purpose**: Suggest relevant capsules when user sends a message about a recurring topic.

**Trigger**: 
- Background: Periodic scan of recent messages
- Foreground: User creates capsule, AI suggests items to link

**Input (Background)**:
```javascript
{
  recentMessages: Message[],  // Last 50 messages
  existingCapsules: Capsule[]
}
```

**Input (Foreground)**:
```javascript
{
  capsuleTitle: string,
  capsuleDescription: string,
  recentMessages: Message[],
  existingLinks: Link[]
}
```

**Output**:
```javascript
{
  suggestedLinks: [{
    targetType: string,
    targetId: string,
    preview: string,
    relevanceScore: number
  }]
}
```

**Approval Flow**:
1. User creates/opens capsule
2. Optional: "Find related items" button
3. AI scans recent content
4. Shows suggested links with previews
5. User selects which to add
6. Batch creates link documents

**Firestore Write**:
- On confirm: creates multiple `capsules/{id}/links/{linkId}`

**Risks**:
- Suggesting irrelevant connections
- Missing obvious connections
- Overwhelming with suggestions

**Guardrails**:
- Max 10 suggestions per request
- Minimum relevance score 0.6
- Exclude already-linked items
- User controls when to invoke (not automatic)

**Complexity**: Medium - Needs to read across multiple subcollections.

---

### Feature 7: Daily Summary

**Purpose**: Generate end-of-day summary of conversation highlights.

**Trigger**: Scheduled function at user's configured time (default: 8 PM local).

**Input**:
```javascript
{
  todaysMessages: Message[],
  newDecisions: Decision[],
  newPromises: Promise[],
  dueReminders: Reminder[],
  checkIns: CheckIn[]
}
```

**Output**:
```javascript
{
  summary: string,          // 2-3 sentence narrative
  highlights: [{
    type: string,
    preview: string,
    sourceId: string
  }],
  actionItems: string[],
  mood: 'positive' | 'neutral' | 'needs_attention'
}
```

**Approval Flow**:
1. Scheduled function runs
2. Creates summary document
3. Optional push notification: "Your daily summary is ready"
4. User views in app
5. Can dismiss or snooze

**Firestore Write**:
- Creates `chats/{chatId}/summaries/{date}`
- Creates `aiSuggestions/{id}` for notification

**Risks**:
- Summarizing sensitive content inappropriately
- Missing important nuance
- Notification fatigue

**Guardrails**:
- Only generate if > 10 messages that day
- Skip days with sensitive keyword detection
- User can disable or change time
- Summary auto-expires after 7 days

**Complexity**: Medium - Scheduled, aggregates multiple data sources.

---

### Feature 8: Gentle Follow-up Generator

**Purpose**: Generate thoughtful follow-up message text for pending promises/reminders.

**Trigger**: User clicks "Suggest follow-up" on a follow-up item.

**Input**:
```javascript
{
  originalPromise: Promise | Reminder,
  daysSinceDue: number,
  previousFollowUps: FollowUp[],
  relationshipContext: {
    partnerName: string,
    recentMood: string | null
  }
}
```

**Output**:
```javascript
{
  suggestedMessages: string[],  // 2-3 options
  tone: 'gentle' | 'casual' | 'direct',
  timing: 'now' | 'later_today' | 'tomorrow'
}
```

**Approval Flow**:
1. User views pending follow-up
2. Clicks "Suggest message"
3. AI generates 2-3 gentle options
4. User selects or edits
5. Can send now or schedule

**Firestore Write**:
- On send: creates normal message
- Updates followUp status to 'sent'

**Risks**:
- Sounding robotic or impersonal
- Nagging tone despite "gentle" intent
- Partner recognizing AI-generated text

**Guardrails**:
- Always editable, never auto-send
- Vary phrasing to avoid patterns
- Consider mood check-in data
- Limit suggestions: 3 per follow-up item

**Complexity**: Low - Synchronous, user-initiated, enhances existing feature.

---

### Feature 9: Memory Assistant

**Purpose**: Help capture and enhance shared memories with richer descriptions.

**Trigger**: User creates memory → "Help me describe this"

**Input**:
```javascript
{
  memoryTitle: string,
  userDescription: string,
  relatedMessages: Message[],  // If linked to conversation
  memoryDate: timestamp,
  photos: string[]  // URLs if attached
}
```

**Output**:
```javascript
{
  enhancedDescription: string,
  suggestedTags: string[],
  emotionalTone: string,
  alternativeTitles: string[]
}
```

**Approval Flow**:
1. User creates memory with basic info
2. Optional: "Enhance description"
3. AI suggests richer description
4. User edits and confirms
5. Saved to memory document

**Firestore Write**: Updates `memories/{id}` with enhanced content.

**Risks**:
- Adding details that didn't happen
- Overwriting authentic voice
- Privacy if photos analyzed

**Guardrails**:
- Never auto-enhance, always preview
- Don't analyze photo content (v1)
- Preserve original as "userOriginal" field
- Clear "AI enhanced" indicator

**Complexity**: Low - Synchronous enhancement, user-controlled.

---

### Feature 10: Vault Extractor

**Purpose**: Identify important documents/info in messages and suggest saving to vault.

**Trigger**: Background scan of messages with attachments or key patterns.

**Input**:
```javascript
{
  messageText: string,
  attachments: Attachment[],
  messageType: string
}
```

**Output**:
```javascript
{
  shouldSuggestVault: boolean,
  confidence: number,
  suggestedVaultItem: {
    title: string,
    category: string,
    importance: 'high' | 'medium' | 'low',
    expirationDate: timestamp | null
  }
}
```

**Approval Flow**:
1. Message with attachment or key info sent
2. Background analysis detects important content
3. Subtle suggestion appears: "Save to vault?"
4. User taps to see details
5. Confirm creates vault item

**Firestore Write**:
- Creates `aiSuggestions/{id}`
- On accept: creates `vaultItems/{id}`

**Risks**:
- Missing important items
- Over-suggesting for routine attachments
- Category misclassification

**Guardrails**:
- Focus on: IDs, tickets, confirmations, receipts, dates
- Ignore: casual photos, memes, stickers
- Max 3 vault suggestions per day
- Learn from dismissals (reduce similar suggestions)

**Complexity**: Medium - Background processing, pattern recognition.

---

## 6. Recommended Implementation Order

### Phase 1: Foundation (Week 1-2)
1. **AI Settings & Consent UI** - Required for all features
2. **AI Suggestion Data Model** - Core infrastructure
3. **Cloud Function AI Integration** - Anthropic API setup
4. **Rate Limiting & Cost Controls** - Safety first

### Phase 2: User-Initiated Features (Week 3-4)
5. **AI Tone Repair** - Extends existing, low risk
6. **Message-to-Task** - Clear user intent, immediate value
7. **Misunderstanding Helper** - Enhances existing feature

### Phase 3: Gentle Detection (Week 5-6)
8. **Promise Detector** - Background, needs tuning
9. **Decision Detector** - Similar pattern
10. **Follow-up Generator** - Builds on existing follow-ups

### Phase 4: Advanced Features (Week 7-8)
11. **Daily Summary** - Scheduled, aggregation logic
12. **Capsule Suggestions** - Cross-collection queries
13. **Memory Assistant** - Enhancement feature
14. **Vault Extractor** - Pattern detection

---

## 7. Security Rules Plan

### New Rules Required

```javascript
// AI Settings (user-level)
match /users/{userId}/settings/ai {
  allow read: if request.auth.uid == userId;
  allow write: if request.auth.uid == userId
    && validateAISettings(request.resource.data);
}

// AI Suggestions
match /chats/{chatId}/aiSuggestions/{suggestionId} {
  allow read: if isChatMember(chatId) 
    && (resource.data.targetUserId == request.auth.uid 
        || resource.data.targetUserId == null);
  allow update: if isChatMember(chatId)
    && request.auth.uid == resource.data.targetUserId
    && onlyAllowedFields(['status', 'processedAt', 'processedAction']);
  allow delete: if isChatMember(chatId)
    && request.auth.uid == resource.data.targetUserId;
  // Create only allowed from Cloud Functions (no client create)
  allow create: if false;
}

// Daily Summaries
match /chats/{chatId}/summaries/{summaryId} {
  allow read: if isChatMember(chatId);
  allow write: if false;  // Cloud Functions only
}
```

### Validation Functions

```javascript
function validateAISettings(data) {
  return data.keys().hasOnly(['aiEnabled', 'features', 'dataSharing'])
    && data.aiEnabled is bool
    && validateFeatureToggles(data.features)
    && validateDataSharing(data.dataSharing);
}

function validateFeatureToggles(features) {
  return features.keys().hasOnly([
    'toneRepair', 'promiseDetection', 'decisionDetection',
    'messageToTask', 'misunderstandingHelper', 'capsuleSuggestions',
    'dailySummary', 'followUpGenerator', 'memoryAssistant', 'vaultExtractor'
  ]);
}
```

---

## 8. Cloud Functions / Backend Plan

### New Functions Required

```javascript
// Callable Functions (user-initiated)
exports.aiToneRepair = onCall(async (request) => { /* ... */ });
exports.aiMessageToTask = onCall(async (request) => { /* ... */ });
exports.aiMisunderstandingHelper = onCall(async (request) => { /* ... */ });
exports.aiFollowUpGenerator = onCall(async (request) => { /* ... */ });
exports.aiMemoryAssistant = onCall(async (request) => { /* ... */ });
exports.aiCapsuleSuggestions = onCall(async (request) => { /* ... */ });

// Firestore Triggers (background)
exports.analyzeNewMessage = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => { /* Promise/Decision/Vault detection */ }
);

// Scheduled Functions
exports.generateDailySummaries = onSchedule(
  'every day 20:00',
  async (context) => { /* ... */ }
);

exports.expireOldSuggestions = onSchedule(
  'every 6 hours',
  async (context) => { /* Clean up expired suggestions */ }
);
```

### API Integration Pattern

```javascript
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function callAI(systemPrompt, userMessage, maxTokens = 500) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',  // Cost-effective for quick tasks
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });
    return { success: true, content: response.content[0].text };
  } catch (error) {
    console.error('AI API error:', error);
    return { success: false, error: error.message };
  }
}
```

### Cost Management

```javascript
// Rate limiting per user
const rateLimit = {
  toneRepair: { max: 10, window: '1h' },
  detection: { max: 100, window: '24h' },
  summary: { max: 1, window: '24h' }
};

// Token budget per request
const tokenBudgets = {
  toneRepair: { input: 500, output: 300 },
  detection: { input: 1000, output: 200 },
  summary: { input: 2000, output: 500 }
};
```

---

## 9. UI/UX Plan

### AI Settings Screen
- Location: Profile → Settings → AI Features
- Master toggle at top
- Feature list with individual toggles
- "Learn more" links for each feature
- Data sharing preferences section

### Suggestion Display Patterns

**Inline Suggestion (Toast)**
- For: Tone repair result, quick suggestions
- Appears above message input
- Auto-dismiss after 10 seconds
- Actions: Accept, Dismiss

**Card Suggestion**
- For: Promise/Decision detection
- Appears in suggestion tray below messages
- Swipe to dismiss
- Tap to expand details

**Dashboard Integration**
- AI Suggestions card showing pending count
- Daily summary card when available
- "Suggested follow-ups" section

### Visual Language
- AI suggestions marked with subtle sparkle icon
- Different from user-created content
- "AI suggested" label on created items
- Non-intrusive color (muted purple/blue)

### Loading States
- Skeleton loaders for AI processing
- "Thinking..." indicator
- Cancel option for long operations
- Timeout after 10 seconds with graceful failure

---

## 10. Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API costs exceed budget | Medium | High | Strict rate limits, usage monitoring, budget alerts |
| API latency impacts UX | Medium | Medium | Timeout handling, local fallbacks, async processing |
| False positives annoy users | High | Medium | Confidence thresholds, easy dismissal, learning from feedback |
| API outage | Low | Medium | Graceful degradation, cached responses, local alternatives |

### Privacy Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Sensitive data sent to AI | High | High | User consent, data minimization, no PII in prompts |
| AI suggestions reveal private info | Medium | High | Target suggestions to relevant user only |
| Data retention by AI provider | Low | Medium | Use API settings to disable training, review ToS |

### User Experience Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI feels intrusive | Medium | High | Opt-in only, easy disable, subtle UI |
| Over-reliance on AI | Medium | Medium | Position as assistant, not replacement |
| Partner discovers AI use | Low | Medium | Transparent "AI suggested" labels |

---

## 11. Minimum Viable AI Version

### MVP Scope (2-3 weeks)

**Include:**
1. AI Settings & Consent system
2. AI Tone Repair (extends existing feature)
3. Message-to-Task converter
4. Basic rate limiting

**Exclude from MVP:**
- Background detection (promises, decisions)
- Daily summaries
- Capsule suggestions
- Memory assistant
- Vault extractor

### MVP Success Metrics
- 50% of users enable at least one AI feature
- AI Tone Repair used at least once by 30% of enabled users
- < 5% disable AI features after trying
- Zero privacy complaints
- API costs < $50/month for first 100 users

### MVP Architecture
- 2 new Cloud Functions (toneRepair, messageToTask)
- 1 new Firestore collection (users/{}/settings/ai)
- No background processing
- No scheduled functions

---

## 12. Final Recommendation

### Recommended Approach: Phased Rollout

**Start with MVP** focusing on user-initiated features where:
- User explicitly requests AI help
- AI output is always previewed before action
- Easy to understand and control

**Add background features gradually** once:
- User trust is established
- Detection accuracy is validated
- Cost patterns are understood

### Key Principles

1. **Consent First**: Default everything off, require explicit opt-in
2. **Human in Loop**: AI suggests, human decides
3. **Graceful Degradation**: App works fully without AI
4. **Transparent**: Clear "AI" labeling, no hidden automation
5. **Private**: Minimize data sent, no cross-conversation learning
6. **Cost Conscious**: Rate limits, budgets, monitoring

### Not Recommended

- Auto-sending any message without user confirmation
- Background processing without user awareness
- Cross-chat learning or pattern recognition
- Storing conversation history externally
- Real-time analysis of every keystroke

### Architecture Decision

Use **Anthropic Claude API** via **Firebase Cloud Functions** with:
- Haiku model for quick tasks (tone repair, task extraction)
- Sonnet model for complex analysis (summaries, detection)
- Local fallbacks for all features
- Per-user rate limiting
- Cost monitoring dashboard

This approach balances capability with privacy, cost, and user control.

---

*Document generated: 2026-05-08*
*Target implementation: Phased over 8 weeks*
*Requires: Anthropic API key, Cloud Functions billing enabled*

# OneRoom AI Features Design Document

**Version**: 2.0 (Revised)
**Last Updated**: 2026-05-08

---

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
All AI API calls must go through Cloud Functions. The frontend never calls AI providers directly.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   React     │────▶│  Cloud Functions │────▶│  AI API     │
│   Frontend  │◀────│  (Firebase)      │◀────│  (Provider) │
└─────────────┘     └──────────────────┘     └─────────────┘
       │                     │
       │                     ▼
       │            ┌──────────────────┐
       └───────────▶│    Firestore     │
                    └──────────────────┘
```

### Function Types

**1. On-Demand Functions (Callable) - MVP**
- User explicitly requests AI assistance
- Examples: Tone repair, message-to-task
- Triggered by user action in UI
- **This is the only type used in MVP**

**2. Background Processing Functions (Firestore Triggers) - Post-MVP**
- Passive analysis after message/document creation
- Examples: Promise detection, decision detection
- Creates suggestions for user approval
- **Deferred to Phase 2+**

**3. Scheduled Functions (Cron) - Post-MVP**
- Periodic batch operations
- Examples: Daily summary, weekly digest
- **Deferred to Phase 3+**

### API Provider Configuration
AI provider is configured via environment variables, not hardcoded:
- `AI_PROVIDER` - Provider identifier (e.g., "anthropic", "openai")
- `AI_MODEL_FAST` - Model for quick, low-cost tasks
- `AI_MODEL_SMART` - Model for complex analysis
- `AI_API_KEY` - Provider API key

**Fallback Pattern**
- Local heuristics as fallback when API fails
- Graceful degradation to non-AI functionality

---

## 3. AI Consent Model

### Consent Schema

```javascript
// Per-user AI preferences stored at users/{userId}/settings/ai
{
  aiEnabled: boolean,           // Master toggle - default OFF
  features: {
    toneRepair: boolean,        // MVP
    messageToTask: boolean,     // MVP
    misunderstandingHelper: boolean,
    followUpGenerator: boolean,
    memoryAssistant: boolean,
    promiseDetection: boolean,      // Post-MVP
    decisionDetection: boolean,     // Post-MVP
    capsuleSuggestions: boolean,    // Post-MVP
    dailySummary: boolean,          // Post-MVP
    vaultExtractor: boolean         // Post-MVP
  },
  dataSharing: {
    allowMessageAnalysis: boolean   // Allow AI to read message content
  },
  consentedAt: timestamp,       // When user first enabled AI
  consentVersion: string        // Track consent version for legal
}
```

### Version 1 Limitations
- **No cross-chat learning**: AI does not learn patterns across conversations
- **No pattern learning**: AI does not build user profiles or preferences over time
- **No training**: User data is not used to train or fine-tune AI models
- **No long-term personalization**: Each AI request is stateless

### Consent Flow
1. **First Launch**: Explain AI features, default all OFF
2. **Feature Discovery**: When user first encounters AI feature, explain and ask
3. **Settings Page**: Granular control over each feature
4. **Per-Action Consent**: User must tap AI action to invoke it

### Privacy Statement
The configured AI provider processes submitted content when users invoke AI features. Users must explicitly opt in to each AI feature before any data is sent to the AI provider. The app does not control how the AI provider handles data after submission - users should review the AI provider's privacy policy and terms of service. AI suggestions are stored in Firestore within the user's chat data. Users can delete all AI-generated content at any time.

---

## 4. AI Suggestion Data Model

### Core Suggestion Schema

```javascript
// chats/{chatId}/aiSuggestions/{suggestionId}
{
  // Identity
  id: string,
  type: 'tone_repair' | 'task_suggestion' | 'misunderstanding_helper' | 
        'follow_up_suggestion' | 'memory_suggestion' |
        'promise_detected' | 'decision_detected' | 'capsule_suggestion' |
        'vault_suggestion' | 'daily_summary',
  
  // Request Origin
  requestedByUserId: string,        // Who triggered the AI request
  targetUserId: string,             // Who should see/act on suggestion
  
  // Source Context (immutable after creation)
  sourceMessageId: string | null,   // Message ID if applicable
  sourceTextPreview: string,        // First 100 chars for context
  
  // AI Generation (immutable after creation)
  generatedBy: string,              // AI provider used (from AI_PROVIDER)
  generatedByFunction: string,      // Cloud Function that created this
  suggestedPayload: object,         // The AI-generated suggestion (IMMUTABLE)
  confidence: number,               // 0-1 confidence score
  
  // Review Fields (mutable by user)
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'dismissed',
  acceptedPayload: object | null,   // User-modified version if edited
  reviewedBy: string | null,        // User who acted on suggestion
  reviewedAt: timestamp | null,     // When user acted
  dismissReason: string | null,     // Why user dismissed (optional)
  
  // Metadata
  createdAt: timestamp,
  expiresAt: timestamp              // Auto-expire old suggestions
}
```

### Field Immutability Rules

**Immutable after creation** (set by Cloud Function only):
- `id`, `type`
- `requestedByUserId`, `targetUserId`
- `sourceMessageId`, `sourceTextPreview`
- `generatedBy`, `generatedByFunction`
- `suggestedPayload`, `confidence`
- `createdAt`, `expiresAt`

**Mutable by user** (review fields only):
- `status`
- `acceptedPayload`
- `reviewedBy`
- `reviewedAt`
- `dismissReason`

### Suggestion Lifecycle
1. **Created**: User triggers AI action, Cloud Function creates suggestion with `status = 'pending'`
2. **Shown**: User sees suggestion in UI
3. **Reviewed**: User accepts (with optional edits), rejects, or dismisses
4. **Archived**: Suggestion expires or is processed

### Expiration Policy
- Tone repair suggestions: 5 minutes
- Task suggestions: 24 hours
- All other suggestions: 48 hours
- Auto-expire sets `status = 'expired'`

---

## 5. AI Feature-by-Feature Design

### Feature 1: AI-Powered Tone Repair (MVP)

**Purpose**: Enhance existing local tone repair with AI-powered rewrites when user opts in.

**Trigger**: User clicks "Soften with AI" button (explicit user action required).

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
  explanation: string,
  confidence: number
}
```

**Approval Flow**:
1. User drafts message
2. User explicitly clicks "Tone" then "Soften with AI"
3. Loading state while API processes (1-3 seconds)
4. Shows suggested rewrite with diff highlighting
5. User can: Accept, Edit, Try Again, Cancel
6. Only on Accept does the draft update

**Firestore Write**: Creates `aiSuggestions/{id}` for audit. If accepted, normal message send flow.

**Guardrails**:
- Rate limit: 10 AI rewrites per user per hour
- Minimum message length: 10 characters
- Cache identical requests for 5 minutes
- Fallback to local repair if API fails
- Sensitive data filtering (see Section 5.11)

**Complexity**: Low - Extends existing feature, single API call, no background processing.

---

### Feature 2: Message-to-Task Converter (MVP)

**Purpose**: Convert a message into a reminder with AI extraction when user explicitly requests.

**Trigger**: User long-presses message and selects "Create Task with AI" (explicit user action required).

**Input**:
```javascript
{
  messageText: string,
  messageTimestamp: timestamp,
  conversationContext: Message[]  // Surrounding 3-5 messages
}
```

**Output**:
```javascript
{
  taskTitle: string,
  taskDescription: string,
  suggestedDueDate: timestamp | null,
  suggestedAssignee: 'sender' | 'recipient' | null
}
```

**Approval Flow**:
1. User selects message action "Create Task with AI"
2. Brief loading (1-2 seconds)
3. Shows pre-filled form with AI suggestions
4. User can edit all fields
5. Confirm creates the reminder

**Firestore Write**:
- Creates `aiSuggestions/{id}` for audit
- On confirm: creates `reminders/{id}`

**Guardrails**:
- Always show editable preview, never auto-create
- Limit to 20 conversions per user per day
- Clear "AI suggested" label on created items
- Sensitive data filtering (see Section 5.11)

**Complexity**: Low - Synchronous, user-initiated, direct feedback loop.

---

### Feature 3: Misunderstanding Helper (Phase 2)

**Purpose**: When user opens "Clear the Air" flow, AI can help articulate feelings.

**Trigger**: User clicks "Help me express this" in misunderstanding form (explicit user action).

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
  explanation: string
}
```

**Approval Flow**:
1. User starts misunderstanding marker
2. User explicitly clicks "Help me express this"
3. AI offers 2-3 phrasing options
4. User selects one or writes their own
5. Continues with form submission

**Firestore Write**: None for AI assistance. Normal misunderstanding document on submit.

**Guardrails**:
- Always offer multiple options, not single "right" answer
- Include "None of these, I'll write my own" option
- Gentle, non-clinical language

**Complexity**: Low - Synchronous, optional enhancement, no background processing.

---

### Feature 4: Gentle Follow-up Generator (Phase 2)

**Purpose**: Generate thoughtful follow-up message text for pending promises/reminders.

**Trigger**: User clicks "Suggest follow-up" on a follow-up item (explicit user action).

**Input**:
```javascript
{
  originalItem: Promise | Reminder,
  daysSinceDue: number,
  partnerName: string,
  recentMood: string | null
}
```

**Output**:
```javascript
{
  suggestedMessages: string[],  // 2-3 options
  tone: 'gentle' | 'casual' | 'direct'
}
```

**Approval Flow**:
1. User views pending follow-up
2. User explicitly clicks "Suggest message"
3. AI generates 2-3 gentle options
4. User selects or edits
5. User sends manually

**Firestore Write**:
- Creates `aiSuggestions/{id}` for audit
- On send: creates normal message

**Guardrails**:
- Always editable, never auto-send
- Vary phrasing to avoid patterns
- Limit suggestions: 3 per follow-up item

**Complexity**: Low - Synchronous, user-initiated.

---

### Feature 5: Memory Assistant (Phase 2)

**Purpose**: Help capture and enhance shared memories with richer descriptions.

**Trigger**: User creates memory and clicks "Help me describe this" (explicit user action).

**Input**:
```javascript
{
  memoryTitle: string,
  userDescription: string,
  memoryDate: timestamp
}
```

**Output**:
```javascript
{
  enhancedDescription: string,
  suggestedTags: string[],
  alternativeTitles: string[]
}
```

**Approval Flow**:
1. User creates memory with basic info
2. User explicitly clicks "Enhance description"
3. AI suggests richer description
4. User edits and confirms
5. Saved to memory document

**Firestore Write**: 
- Creates `aiSuggestions/{id}` for audit
- Updates `memories/{id}` with enhanced content

**Guardrails**:
- Never auto-enhance, always preview
- Don't analyze photo content
- Preserve original as "userOriginal" field
- Clear "AI enhanced" indicator

**Complexity**: Low - Synchronous enhancement, user-controlled.

---

### Feature 6: Promise Detector (Phase 3 - Background)

**Purpose**: Automatically detect when a message contains a promise and suggest creating a Promise Tracker entry.

**Trigger**: Firestore trigger on new message creation (background, not MVP).

**Input**:
```javascript
{
  messageText: string,
  senderName: string,
  timestamp: timestamp,
  recentContext: Message[]
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
2. Background function analyzes (async)
3. If promise detected (confidence > 0.7), creates suggestion
4. User sees notification: "Track this promise?"
5. User can: Create Promise, Edit & Create, Dismiss

**Guardrails**:
- Confidence threshold: 0.7 minimum
- Rate limit: 100 messages per chat per day
- Exclude short messages (< 20 chars)
- User can disable globally
- Sensitive data filtering

**Complexity**: Medium - Background trigger, deferred to Phase 3.

---

### Feature 7: Decision Detector (Phase 3 - Background)

**Purpose**: Identify when a decision has been made in conversation and suggest logging it.

**Trigger**: Firestore trigger on message creation (background, not MVP).

**Input**:
```javascript
{
  messageText: string,
  conversationContext: Message[],
  existingDecisions: Decision[]
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
    decisionType: 'agreement' | 'choice' | 'plan'
  }
}
```

**Approval Flow**:
1. Decision language detected (confidence > 0.75)
2. Creates suggestion for chat members
3. User sees notification
4. Accept creates decision document

**Guardrails**:
- Higher confidence threshold (0.75)
- Deduplicate suggestions
- Max 5 decision suggestions per chat per day
- Sensitive data filtering

**Complexity**: Medium - Background trigger, deferred to Phase 3.

---

### Feature 8: Daily Summary (Phase 3 - Scheduled)

**Purpose**: Generate end-of-day summary of conversation highlights.

**Trigger**: Scheduled function (not MVP).

**Input**:
```javascript
{
  todaysMessages: Message[],
  newDecisions: Decision[],
  newPromises: Promise[],
  dueReminders: Reminder[]
}
```

**Output**:
```javascript
{
  summary: string,
  highlights: [{
    type: string,
    preview: string,
    sourceId: string
  }],
  actionItems: string[]
}
```

**Guardrails**:
- Only generate if > 10 messages that day
- User can disable or change time
- Summary auto-expires after 7 days
- Sensitive data filtering

**Complexity**: Medium - Scheduled, deferred to Phase 3.

---

### Feature 9: Context Capsule Suggestions (Phase 3 - Background)

**Purpose**: Suggest relevant items to link when user creates/opens a capsule.

**Trigger**: User clicks "Find related items" in capsule (user-initiated, but complex query).

**Deferred Reason**: Requires cross-collection queries and tuning.

**Complexity**: Medium - Deferred to Phase 3.

---

### Feature 10: Vault Extractor (Phase 3 - Background)

**Purpose**: Identify important documents/info in messages and suggest saving to vault.

**Trigger**: Background scan of messages (not MVP).

**Deferred Reason**: Background processing, pattern recognition complexity.

**Complexity**: Medium - Deferred to Phase 3.

---

### 5.11 Sensitive Data Policy

**AI must never extract, suggest storing, or include in suggestions:**
- Passwords or authentication credentials
- Social Security Numbers (SSN) or national ID numbers
- Credit card numbers or CVV codes
- Bank account numbers or routing numbers
- Government-issued ID numbers (passport, driver's license)
- Highly sensitive medical information (diagnoses, prescriptions)
- Legal case numbers or confidential legal information
- Financial account credentials or PINs

**Implementation**:
- Pre-filter input before sending to AI
- Post-filter AI responses before displaying
- Log and alert on sensitive data detection attempts
- Never store detected sensitive data in suggestions

---

## 6. Recommended Implementation Order

### MVP: User-Triggered Only (Weeks 1-3)

**Rule: No background processing in MVP. AI is invoked only when user explicitly taps an AI action.**

| Order | Component | Description |
|-------|-----------|-------------|
| 1 | AI Settings & Consent | User preferences, master toggle, feature toggles |
| 2 | Backend AI Provider Wrapper | Configurable wrapper for AI API calls |
| 3 | Rate Limiting | Per-user, per-feature rate limits |
| 4 | AI Tone Repair | Extend existing tone repair with AI option |
| 5 | Message-to-Task | Convert message to reminder with AI extraction |

### Phase 2: Additional User-Triggered (Weeks 4-5)

| Order | Component | Description |
|-------|-----------|-------------|
| 6 | Misunderstanding Helper | AI phrasing suggestions in Clear the Air |
| 7 | Follow-up Generator | AI-suggested follow-up messages |
| 8 | Memory Assistant | AI-enhanced memory descriptions |

### Phase 3: Background Features (Weeks 6-8)

| Order | Component | Description |
|-------|-----------|-------------|
| 9 | Promise Detector | Background detection on new messages |
| 10 | Decision Detector | Background detection on new messages |
| 11 | Daily Summary | Scheduled summary generation |
| 12 | Capsule Suggestions | Cross-collection AI suggestions |
| 13 | Vault Extractor | Background document detection |

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
  // Read: only target user or requester can see
  allow read: if isChatMember(chatId) 
    && (resource.data.targetUserId == request.auth.uid 
        || resource.data.requestedByUserId == request.auth.uid);
  
  // Update: only review fields, only by target user
  allow update: if isChatMember(chatId)
    && request.auth.uid == resource.data.targetUserId
    && onlyReviewFields(request.resource.data, resource.data)
    && validateReviewFields(request.resource.data);
  
  // Delete: only by target user
  allow delete: if isChatMember(chatId)
    && request.auth.uid == resource.data.targetUserId;
  
  // Create: Cloud Functions only (no client create)
  allow create: if false;
}

// Daily Summaries (Phase 3)
match /chats/{chatId}/summaries/{summaryId} {
  allow read: if isChatMember(chatId);
  allow write: if false;  // Cloud Functions only
}
```

### Validation Functions

```javascript
function validateAISettings(data) {
  return data.keys().hasOnly(['aiEnabled', 'features', 'dataSharing', 'consentedAt', 'consentVersion'])
    && data.aiEnabled is bool
    && validateFeatureToggles(data.features)
    && validateDataSharing(data.dataSharing);
}

function validateFeatureToggles(features) {
  return features.keys().hasOnly([
    'toneRepair', 'messageToTask', 'misunderstandingHelper',
    'followUpGenerator', 'memoryAssistant',
    'promiseDetection', 'decisionDetection', 'capsuleSuggestions',
    'dailySummary', 'vaultExtractor'
  ]);
}

function validateDataSharing(dataSharing) {
  return dataSharing.keys().hasOnly(['allowMessageAnalysis'])
    && dataSharing.allowMessageAnalysis is bool;
}

// Ensure only review fields can be updated (suggestedPayload is immutable)
function onlyReviewFields(newData, existingData) {
  let immutableFields = ['id', 'type', 'requestedByUserId', 'targetUserId',
    'sourceMessageId', 'sourceTextPreview', 'generatedBy', 'generatedByFunction',
    'suggestedPayload', 'confidence', 'createdAt', 'expiresAt'];
  
  return immutableFields.toSet().hasAll(
    newData.diff(existingData).affectedKeys().removeAll(
      ['status', 'acceptedPayload', 'reviewedBy', 'reviewedAt', 'dismissReason'].toSet()
    )
  ) == false;
}

function validateReviewFields(data) {
  return (!('status' in data) || data.status in ['pending', 'accepted', 'rejected', 'expired', 'dismissed'])
    && (!('dismissReason' in data) || (data.dismissReason is string && data.dismissReason.size() <= 500));
}
```

---

## 8. Cloud Functions / Backend Plan

### MVP Functions (User-Triggered Only)

```javascript
// AI Provider Wrapper - uses environment config
const aiConfig = {
  provider: process.env.AI_PROVIDER,
  modelFast: process.env.AI_MODEL_FAST,
  modelSmart: process.env.AI_MODEL_SMART,
  apiKey: process.env.AI_API_KEY
};

// Callable Functions (MVP - user-initiated)
exports.aiToneRepair = onCall(async (request) => { /* ... */ });
exports.aiMessageToTask = onCall(async (request) => { /* ... */ });

// Phase 2 Callable Functions
exports.aiMisunderstandingHelper = onCall(async (request) => { /* ... */ });
exports.aiFollowUpGenerator = onCall(async (request) => { /* ... */ });
exports.aiMemoryAssistant = onCall(async (request) => { /* ... */ });
```

### Phase 3 Functions (Background - Post-MVP)

```javascript
// Firestore Triggers (Phase 3 - background)
exports.analyzeNewMessage = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => { /* Promise/Decision detection */ }
);

// Scheduled Functions (Phase 3)
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
async function callAI(systemPrompt, userMessage, options = {}) {
  const model = options.complex ? aiConfig.modelSmart : aiConfig.modelFast;
  const maxTokens = options.maxTokens || 500;
  
  // Pre-filter sensitive data
  const sanitizedMessage = filterSensitiveData(userMessage);
  
  try {
    const response = await getAIClient().messages.create({
      model: model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: sanitizedMessage }]
    });
    
    // Post-filter response
    const sanitizedResponse = filterSensitiveData(response.content[0].text);
    
    return { success: true, content: sanitizedResponse };
  } catch (error) {
    console.error('AI API error:', error);
    return { success: false, error: error.message };
  }
}

function getAIClient() {
  // Return appropriate client based on AI_PROVIDER config
  switch (aiConfig.provider) {
    case 'anthropic':
      return new Anthropic({ apiKey: aiConfig.apiKey });
    case 'openai':
      return new OpenAI({ apiKey: aiConfig.apiKey });
    default:
      throw new Error(`Unknown AI provider: ${aiConfig.provider}`);
  }
}
```

### Rate Limiting

```javascript
const rateLimit = {
  toneRepair: { max: 10, window: '1h' },
  messageToTask: { max: 20, window: '24h' },
  misunderstandingHelper: { max: 10, window: '24h' },
  followUpGenerator: { max: 10, window: '24h' },
  memoryAssistant: { max: 10, window: '24h' }
};
```

---

## 9. UI/UX Plan

### AI Settings Screen
- Location: Profile, Settings, AI Features
- Master toggle at top (default OFF)
- Feature list with individual toggles
- "Learn more" links for each feature
- Privacy notice with link to AI provider's terms

### Suggestion Display Patterns

**Inline Suggestion (Toast)**
- For: Tone repair result, task suggestions
- Appears above message input
- Auto-dismiss after 10 seconds
- Actions: Accept, Edit, Dismiss

**Preview Modal**
- For: Task creation, memory enhancement
- Shows AI suggestion with edit capability
- Actions: Accept, Edit & Accept, Cancel

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
| False positives annoy users | High | Medium | Confidence thresholds, easy dismissal |
| API outage | Low | Medium | Graceful degradation, local alternatives |
| Sensitive data leakage | Medium | High | Pre/post filtering, never store sensitive data |

### Privacy Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Sensitive data sent to AI | Medium | High | Pre-filtering, user consent, data minimization |
| AI suggestions reveal private info | Medium | High | Target suggestions to relevant user only |
| Data retention by AI provider | Medium | Medium | Clear privacy notice, user must opt in |

### User Experience Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI feels intrusive | Medium | High | Opt-in only, user-triggered only in MVP |
| Over-reliance on AI | Medium | Medium | Position as assistant, not replacement |
| Partner discovers AI use | Low | Medium | Transparent "AI suggested" labels |

---

## 11. Minimum Viable AI Version (MVP)

### MVP Scope (2-3 weeks)

**MVP Rule: No background processing. AI is invoked only when user explicitly taps an AI action.**

**Include:**
1. AI Settings & Consent system
2. Backend AI provider wrapper (configurable)
3. Rate limiting infrastructure
4. AI Tone Repair (user-triggered)
5. Message-to-Task (user-triggered)

**Explicitly Exclude from MVP:**
- Background Promise Detector
- Background Decision Detector
- Daily Summary (scheduled)
- Vault Extractor (background)
- Context Capsule Suggestions (background)
- Any automatic/background AI processing

### MVP Success Metrics
- 50% of users enable at least one AI feature
- AI Tone Repair used at least once by 30% of enabled users
- < 5% disable AI features after trying
- Zero privacy complaints
- API costs < $50/month for first 100 users

### MVP Architecture
- 2 new Cloud Functions (aiToneRepair, aiMessageToTask)
- 1 new Firestore collection (users/{}/settings/ai)
- 1 new subcollection (chats/{}/aiSuggestions)
- No background processing
- No scheduled functions
- No Firestore triggers for AI

---

## 12. Implementation Approval Gate

**Before any code is written, the following must be produced and approved:**

### 12.1 Exact Firestore Schema

Document the complete schema for:
- `users/{userId}/settings/ai` - all fields, types, defaults
- `chats/{chatId}/aiSuggestions/{suggestionId}` - all fields, types, constraints

### 12.2 Exact Cloud Function Names

List all functions with:
- Function name (e.g., `aiToneRepair`)
- Trigger type (callable, document, schedule)
- Input parameters
- Output format
- Error responses

### 12.3 Exact Security Rule Changes

Provide:
- Complete rule additions (copy-paste ready)
- Validation functions
- Test cases for each rule

### 12.4 Exact UI Components

List all new components:
- Component name and file path
- Props interface
- Integration points with existing components
- User flow diagrams

### 12.5 Rollback Plan

Document:
- How to disable AI features without deployment
- How to revert Firestore rules
- How to delete AI-generated data
- How to refund users if needed (N/A for free tier)
- Communication plan for users if rollback needed

---

## 13. Final Recommendation

### Recommended Approach: MVP-First, User-Triggered Only

**Start with MVP** focusing exclusively on user-initiated features where:
- User explicitly taps an AI action
- AI output is always previewed before action
- Easy to understand and control
- No background processing

**Add background features only after**:
- MVP is stable for 4+ weeks
- User trust is established
- Detection accuracy is validated in testing
- Cost patterns are understood

### Key Principles

1. **Consent First**: Default everything off, require explicit opt-in
2. **Human in Loop**: AI suggests, human decides
3. **User-Triggered Only (MVP)**: No background AI processing
4. **Graceful Degradation**: App works fully without AI
5. **Transparent**: Clear "AI" labeling, no hidden automation
6. **Private**: Minimize data sent, clear privacy notice
7. **No Learning**: Version 1 has no cross-chat learning, pattern learning, or personalization

### Not Supported in Version 1

- Auto-sending any message without user confirmation
- Background processing of messages
- Cross-chat learning or pattern recognition
- Long-term personalization or user profiling
- Training AI models on user data
- Real-time analysis of keystrokes

### Architecture Decision

Use configurable AI provider via Firebase Cloud Functions with:
- Environment-configured model selection (`AI_MODEL_FAST`, `AI_MODEL_SMART`)
- Local fallbacks for all features
- Per-user rate limiting
- Pre/post filtering for sensitive data
- Audit trail via aiSuggestions collection

---

*Document Version: 2.0*
*Last Updated: 2026-05-08*
*Target MVP Implementation: 2-3 weeks*
*Requires: AI API key, Cloud Functions billing enabled*
*Next Step: Produce Implementation Approval Gate artifacts before coding*

# AI Features Implementation Approval Gate

**Version**: 1.0
**Date**: 2026-05-08
**Source**: AI Features Design Document v2.0
**Status**: PENDING APPROVAL

---

## 1. Exact Firestore Schema

### 1.1 users/{uid}/settings/ai

```javascript
{
  // Master toggle - default false
  aiEnabled: boolean,
  
  // Per-feature toggles - all default false
  features: {
    toneRepair: boolean,
    messageToTask: boolean,
    misunderstandingHelper: boolean,
    followUpGenerator: boolean,
    memoryAssistant: boolean,
    promiseDetection: boolean,
    decisionDetection: boolean,
    capsuleSuggestions: boolean,
    dailySummary: boolean,
    vaultExtractor: boolean
  },
  
  // Data sharing consent
  dataSharing: {
    allowMessageAnalysis: boolean
  },
  
  // Consent tracking
  consentedAt: timestamp | null,      // When aiEnabled was first set to true
  consentVersion: string,             // e.g., "1.0" - for legal tracking
  
  // Metadata
  updatedAt: timestamp
}
```

**Constraints**:
- All boolean fields default to `false`
- `consentVersion` max length: 20 characters
- `consentedAt` set only when `aiEnabled` transitions from `false` to `true`

---

### 1.2 chats/{chatId}/aiSuggestions/{suggestionId}

```javascript
{
  // === IMMUTABLE FIELDS (set by Cloud Function only) ===
  
  // Identity
  type: string,                       // enum: see below
  
  // Request Origin
  requestedByUserId: string,          // uid who triggered the AI request
  targetUserId: string,               // uid who should see/act on suggestion
  
  // Source Context
  sourceMessageId: string | null,     // message ID if applicable
  sourceTextPreview: string,          // first 100 chars, sanitized
  
  // AI Generation
  generatedBy: string,                // AI provider identifier
  generatedByFunction: string,        // Cloud Function name
  suggestedPayload: object,           // AI-generated suggestion (type-specific)
  confidence: number,                 // 0.0 to 1.0
  
  // Timestamps
  createdAt: timestamp,
  expiresAt: timestamp,
  
  // === MUTABLE FIELDS (user can update) ===
  
  // Review status
  status: string,                     // enum: pending, accepted, rejected, dismissed, expired
  
  // User modifications
  acceptedPayload: object | null,     // user-edited version (type-specific, bounded)
  
  // Review audit
  reviewedBy: string | null,          // uid who acted
  reviewedAt: timestamp | null,       // when user acted
  dismissReason: string | null        // optional, max 200 chars
}
```

**Type enum values**:
- `tone_repair`
- `task_suggestion`
- `misunderstanding_helper`
- `follow_up_suggestion`
- `memory_suggestion`
- `promise_detected`
- `decision_detected`
- `capsule_suggestion`
- `vault_suggestion`
- `daily_summary`

**Status enum values**:
- `pending` - initial state, set by Cloud Function
- `accepted` - user accepted suggestion
- `rejected` - user explicitly rejected
- `dismissed` - user dismissed without action
- `expired` - set by backend cleanup only

**suggestedPayload by type**:

For `tone_repair`:
```javascript
{
  originalText: string,           // max 2000 chars
  rewrittenText: string,          // max 2000 chars
  toneGoal: string,               // softer|clearer|more_caring|less_angry
  explanation: string             // max 500 chars
}
```

For `task_suggestion`:
```javascript
{
  sourceText: string,             // max 500 chars
  taskTitle: string,              // max 200 chars
  taskDescription: string,        // max 1000 chars
  suggestedDueDate: string | null, // ISO date string or null
  suggestedAssignee: string | null // sender|recipient|null
}
```

**acceptedPayload by type** (user-editable subset):

For `tone_repair`:
```javascript
{
  finalText: string               // max 2000 chars
}
```

For `task_suggestion`:
```javascript
{
  taskTitle: string,              // max 200 chars
  taskDescription: string,        // max 1000 chars
  dueDate: string | null,         // ISO date string or null
  assignedTo: string | null       // uid or null
}
```

---

### 1.3 users/{uid}/aiUsage/{windowId}

Rate limiting tracking per user.

```javascript
{
  // Window identifier (e.g., "toneRepair_2026-05-08_14" for hourly window)
  windowId: string,
  
  // Feature being tracked
  feature: string,                // toneRepair|messageToTask|etc.
  
  // Usage count
  count: number,
  
  // Window boundaries
  windowStart: timestamp,
  windowEnd: timestamp,
  
  // Last request
  lastRequestAt: timestamp
}
```

**Window ID format**: `{feature}_{date}_{hour}` for hourly limits, `{feature}_{date}` for daily limits.

**Constraints**:
- `windowId` max length: 50 characters
- `feature` must be valid feature name
- `count` must be >= 0

---

### 1.4 chats/{chatId}/aiRuns/{runId}

Audit log for AI invocations (backend-only collection).

```javascript
{
  // Request info
  requestedByUserId: string,
  feature: string,
  functionName: string,
  
  // Input (sanitized, no sensitive data)
  inputTokenCount: number,
  inputPreview: string,           // max 100 chars, sanitized
  
  // Output
  outputTokenCount: number,
  success: boolean,
  errorCode: string | null,
  
  // AI provider info
  provider: string,
  model: string,
  
  // Timing
  requestedAt: timestamp,
  completedAt: timestamp,
  latencyMs: number,
  
  // Cost tracking
  estimatedCostUsd: number,
  
  // Result reference
  suggestionId: string | null     // created aiSuggestion ID
}
```

**Constraints**:
- Client cannot read or write this collection
- Backend-only for audit and cost tracking

---

## 2. Exact Cloud Function Contracts

### 2.1 aiToneRepair

**Function Name**: `aiToneRepair`
**Trigger Type**: Callable (`onCall`)
**Region**: us-central1 (or configured region)

#### Input JSON

```javascript
{
  chatId: string,                 // required, chat document ID
  originalText: string,           // required, 10-2000 chars
  toneGoal: string,               // required, enum: softer|clearer|more_caring|less_angry
  contextMessageIds: string[],    // optional, max 5 message IDs for context
  partnerMood: string | null      // optional, from check-in
}
```

#### Auth Checks

1. `request.auth` must exist (user authenticated)
2. `request.auth.uid` must be defined

#### Chat Membership Check

```javascript
const chatDoc = await db.doc(`chats/${chatId}`).get();
if (!chatDoc.exists) throw new HttpsError('not-found', 'CHAT_NOT_FOUND');
const members = chatDoc.data().members || [];
if (!members.includes(request.auth.uid)) {
  throw new HttpsError('permission-denied', 'NOT_CHAT_MEMBER');
}
```

#### AI Consent Checks

```javascript
const aiSettings = await db.doc(`users/${request.auth.uid}/settings/ai`).get();
const settings = aiSettings.data() || {};

if (!settings.aiEnabled) {
  throw new HttpsError('failed-precondition', 'AI_NOT_ENABLED');
}
if (!settings.features?.toneRepair) {
  throw new HttpsError('failed-precondition', 'FEATURE_NOT_ENABLED');
}
if (!settings.dataSharing?.allowMessageAnalysis) {
  throw new HttpsError('failed-precondition', 'MESSAGE_ANALYSIS_NOT_ALLOWED');
}
```

#### Rate Limit Check

```javascript
const now = new Date();
const hourKey = `toneRepair_${now.toISOString().slice(0,13)}`;
const usageRef = db.doc(`users/${request.auth.uid}/aiUsage/${hourKey}`);
const usage = await usageRef.get();
const count = usage.exists ? usage.data().count : 0;

if (count >= 10) {
  throw new HttpsError('resource-exhausted', 'RATE_LIMIT_EXCEEDED');
}

// Increment after successful call
```

#### Sensitive Data Check

```javascript
function containsSensitiveData(text) {
  const patterns = [
    /\b\d{3}-\d{2}-\d{4}\b/,           // SSN
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
    /\b\d{9,12}\b/,                     // Bank account (basic)
    /password\s*[:=]\s*\S+/i,           // Password pattern
  ];
  return patterns.some(p => p.test(text));
}

if (containsSensitiveData(originalText)) {
  throw new HttpsError('invalid-argument', 'SENSITIVE_DATA_DETECTED');
}
```

#### Output JSON (Success)

```javascript
{
  success: true,
  suggestionId: string,           // created aiSuggestion document ID
  suggestion: {
    rewrittenText: string,
    explanation: string,
    confidence: number            // 0.0 to 1.0
  }
}
```

#### Output JSON (No Suggestion)

```javascript
{
  success: true,
  suggestionId: null,
  suggestion: null,
  reason: "NO_SUGGESTION"         // AI couldn't provide useful rewrite
}
```

#### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `CHAT_NOT_FOUND` | 404 | Chat document doesn't exist |
| `NOT_CHAT_MEMBER` | 403 | User not in chat.members |
| `AI_NOT_ENABLED` | 412 | User hasn't enabled AI |
| `FEATURE_NOT_ENABLED` | 412 | toneRepair feature not enabled |
| `MESSAGE_ANALYSIS_NOT_ALLOWED` | 412 | dataSharing.allowMessageAnalysis is false |
| `RATE_LIMIT_EXCEEDED` | 429 | Exceeded 10 requests/hour |
| `SENSITIVE_DATA_DETECTED` | 400 | Input contains sensitive patterns |
| `INVALID_INPUT` | 400 | Missing/invalid required fields |
| `TEXT_TOO_SHORT` | 400 | originalText < 10 chars |
| `TEXT_TOO_LONG` | 400 | originalText > 2000 chars |
| `INVALID_TONE_GOAL` | 400 | toneGoal not in allowed enum |
| `AI_PROVIDER_ERROR` | 500 | AI API call failed |
| `AI_TIMEOUT` | 504 | AI API didn't respond in 10s |

#### Firestore Writes

On success:
1. Create `chats/{chatId}/aiSuggestions/{newId}` with:
   - All immutable fields set
   - `status: 'pending'`
   - `acceptedPayload: null`
   - `reviewedBy: null`, `reviewedAt: null`, `dismissReason: null`

2. Create/update `users/{uid}/aiUsage/{hourKey}` with:
   - Increment `count`
   - Update `lastRequestAt`

3. Create `chats/{chatId}/aiRuns/{newId}` with audit data

---

### 2.2 aiMessageToTask

**Function Name**: `aiMessageToTask`
**Trigger Type**: Callable (`onCall`)
**Region**: us-central1 (or configured region)

#### Input JSON

```javascript
{
  chatId: string,                 // required, chat document ID
  messageId: string,              // required, source message ID
  contextMessageIds: string[]     // optional, max 5 surrounding message IDs
}
```

#### Auth Checks

Same as aiToneRepair.

#### Chat Membership Check

Same as aiToneRepair.

#### AI Consent Checks

```javascript
const aiSettings = await db.doc(`users/${request.auth.uid}/settings/ai`).get();
const settings = aiSettings.data() || {};

if (!settings.aiEnabled) {
  throw new HttpsError('failed-precondition', 'AI_NOT_ENABLED');
}
if (!settings.features?.messageToTask) {
  throw new HttpsError('failed-precondition', 'FEATURE_NOT_ENABLED');
}
if (!settings.dataSharing?.allowMessageAnalysis) {
  throw new HttpsError('failed-precondition', 'MESSAGE_ANALYSIS_NOT_ALLOWED');
}
```

#### Rate Limit Check

```javascript
const now = new Date();
const dayKey = `messageToTask_${now.toISOString().slice(0,10)}`;
const usageRef = db.doc(`users/${request.auth.uid}/aiUsage/${dayKey}`);
const usage = await usageRef.get();
const count = usage.exists ? usage.data().count : 0;

if (count >= 20) {
  throw new HttpsError('resource-exhausted', 'RATE_LIMIT_EXCEEDED');
}
```

#### Message Fetch & Validation

```javascript
const messageDoc = await db.doc(`chats/${chatId}/messages/${messageId}`).get();
if (!messageDoc.exists) {
  throw new HttpsError('not-found', 'MESSAGE_NOT_FOUND');
}

const messageText = messageDoc.data().text || '';
if (messageText.length < 5) {
  throw new HttpsError('invalid-argument', 'MESSAGE_TOO_SHORT');
}
if (messageText.length > 2000) {
  throw new HttpsError('invalid-argument', 'MESSAGE_TOO_LONG');
}
```

#### Sensitive Data Check

Same as aiToneRepair, applied to message text.

#### Output JSON (Success)

```javascript
{
  success: true,
  suggestionId: string,
  suggestion: {
    taskTitle: string,            // max 200 chars
    taskDescription: string,      // max 1000 chars
    suggestedDueDate: string | null, // ISO date or null
    suggestedAssignee: string | null, // 'sender'|'recipient'|null
    confidence: number
  }
}
```

#### Output JSON (No Suggestion)

```javascript
{
  success: true,
  suggestionId: null,
  suggestion: null,
  reason: "NO_TASK_DETECTED"      // Message doesn't contain actionable task
}
```

#### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `CHAT_NOT_FOUND` | 404 | Chat document doesn't exist |
| `MESSAGE_NOT_FOUND` | 404 | Message document doesn't exist |
| `NOT_CHAT_MEMBER` | 403 | User not in chat.members |
| `AI_NOT_ENABLED` | 412 | User hasn't enabled AI |
| `FEATURE_NOT_ENABLED` | 412 | messageToTask feature not enabled |
| `MESSAGE_ANALYSIS_NOT_ALLOWED` | 412 | dataSharing.allowMessageAnalysis is false |
| `RATE_LIMIT_EXCEEDED` | 429 | Exceeded 20 requests/day |
| `SENSITIVE_DATA_DETECTED` | 400 | Message contains sensitive patterns |
| `MESSAGE_TOO_SHORT` | 400 | Message < 5 chars |
| `MESSAGE_TOO_LONG` | 400 | Message > 2000 chars |
| `AI_PROVIDER_ERROR` | 500 | AI API call failed |
| `AI_TIMEOUT` | 504 | AI API didn't respond in 10s |

#### Firestore Writes

On success:
1. Create `chats/{chatId}/aiSuggestions/{newId}`
2. Create/update `users/{uid}/aiUsage/{dayKey}`
3. Create `chats/{chatId}/aiRuns/{newId}`

---

## 3. Exact Firestore Security Rules

### 3.1 Copy-Paste Ready Rule Additions

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // AI SETTINGS RULES
    // ============================================
    
    match /users/{userId}/settings/ai {
      allow read: if request.auth != null && request.auth.uid == userId;
      
      allow create: if request.auth != null 
        && request.auth.uid == userId
        && validateAiSettingsCreate(request.resource.data);
      
      allow update: if request.auth != null 
        && request.auth.uid == userId
        && validateAiSettingsUpdate(request.resource.data);
      
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // ============================================
    // AI SUGGESTIONS RULES
    // ============================================
    
    match /chats/{chatId}/aiSuggestions/{suggestionId} {
      // Read: only target user or requester, must be chat member
      allow read: if request.auth != null
        && isChatMember(chatId)
        && (resource.data.targetUserId == request.auth.uid 
            || resource.data.requestedByUserId == request.auth.uid);
      
      // Create: backend only (Cloud Functions)
      allow create: if false;
      
      // Update: only review fields, only by target user
      allow update: if request.auth != null
        && isChatMember(chatId)
        && resource.data.targetUserId == request.auth.uid
        && isValidAiSuggestionUpdate(request.resource.data, resource.data);
      
      // Delete: only by target user
      allow delete: if request.auth != null
        && isChatMember(chatId)
        && resource.data.targetUserId == request.auth.uid;
    }
    
    // ============================================
    // AI USAGE RULES (rate limit tracking)
    // ============================================
    
    match /users/{userId}/aiUsage/{windowId} {
      // Read: only own usage (for UI display)
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Write: backend only
      allow create, update, delete: if false;
    }
    
    // ============================================
    // AI RUNS RULES (audit log)
    // ============================================
    
    match /chats/{chatId}/aiRuns/{runId} {
      // Backend only - no client access
      allow read, write: if false;
    }
    
    // ============================================
    // VALIDATION HELPER FUNCTIONS
    // ============================================
    
    function validateAiSettingsCreate(data) {
      return data.keys().hasOnly(['aiEnabled', 'features', 'dataSharing', 'consentedAt', 'consentVersion', 'updatedAt'])
        && data.aiEnabled is bool
        && validateAiFeatures(data.features)
        && validateAiDataSharing(data.dataSharing)
        && (data.consentedAt == null || data.consentedAt is timestamp)
        && (data.consentVersion is string && data.consentVersion.size() <= 20)
        && data.updatedAt is timestamp;
    }
    
    function validateAiSettingsUpdate(data) {
      return data.keys().hasOnly(['aiEnabled', 'features', 'dataSharing', 'consentedAt', 'consentVersion', 'updatedAt'])
        && data.aiEnabled is bool
        && validateAiFeatures(data.features)
        && validateAiDataSharing(data.dataSharing)
        && (data.consentedAt == null || data.consentedAt is timestamp)
        && (data.consentVersion is string && data.consentVersion.size() <= 20)
        && data.updatedAt is timestamp;
    }
    
    function validateAiFeatures(features) {
      return features is map
        && features.keys().hasOnly([
          'toneRepair', 'messageToTask', 'misunderstandingHelper',
          'followUpGenerator', 'memoryAssistant', 'promiseDetection',
          'decisionDetection', 'capsuleSuggestions', 'dailySummary', 'vaultExtractor'
        ])
        && (features.toneRepair == null || features.toneRepair is bool)
        && (features.messageToTask == null || features.messageToTask is bool)
        && (features.misunderstandingHelper == null || features.misunderstandingHelper is bool)
        && (features.followUpGenerator == null || features.followUpGenerator is bool)
        && (features.memoryAssistant == null || features.memoryAssistant is bool)
        && (features.promiseDetection == null || features.promiseDetection is bool)
        && (features.decisionDetection == null || features.decisionDetection is bool)
        && (features.capsuleSuggestions == null || features.capsuleSuggestions is bool)
        && (features.dailySummary == null || features.dailySummary is bool)
        && (features.vaultExtractor == null || features.vaultExtractor is bool);
    }
    
    function validateAiDataSharing(dataSharing) {
      return dataSharing is map
        && dataSharing.keys().hasOnly(['allowMessageAnalysis'])
        && (dataSharing.allowMessageAnalysis == null || dataSharing.allowMessageAnalysis is bool);
    }
    
    function isValidAiSuggestionUpdate(newData, existingData) {
      // Only these fields can change
      let allowedFields = ['status', 'acceptedPayload', 'reviewedBy', 'reviewedAt', 'dismissReason'];
      
      // Check that only allowed fields are being modified
      let changedFields = newData.diff(existingData).affectedKeys();
      
      return changedFields.hasOnly(allowedFields)
        // Status must be user-settable values only (not 'expired' or 'pending')
        && (newData.status == existingData.status 
            || newData.status in ['accepted', 'rejected', 'dismissed'])
        // reviewedBy must be current user if being set
        && (newData.reviewedBy == existingData.reviewedBy 
            || newData.reviewedBy == request.auth.uid)
        // reviewedAt must be current timestamp if being set
        && (newData.reviewedAt == existingData.reviewedAt 
            || newData.reviewedAt == request.time)
        // dismissReason length check
        && (newData.dismissReason == existingData.dismissReason 
            || newData.dismissReason == null 
            || (newData.dismissReason is string && newData.dismissReason.size() <= 200))
        // acceptedPayload validation
        && validateAcceptedPayload(newData.acceptedPayload, existingData.type);
    }
    
    function validateAcceptedPayload(payload, suggestionType) {
      // null is always valid
      return payload == null
        // tone_repair accepted payload
        || (suggestionType == 'tone_repair' 
            && payload is map
            && payload.keys().hasOnly(['finalText'])
            && payload.finalText is string
            && payload.finalText.size() <= 2000)
        // task_suggestion accepted payload
        || (suggestionType == 'task_suggestion'
            && payload is map
            && payload.keys().hasOnly(['taskTitle', 'taskDescription', 'dueDate', 'assignedTo'])
            && payload.taskTitle is string
            && payload.taskTitle.size() <= 200
            && payload.taskDescription is string
            && payload.taskDescription.size() <= 1000
            && (payload.dueDate == null || payload.dueDate is string)
            && (payload.assignedTo == null || payload.assignedTo is string));
    }
    
  }
}
```

---

## 4. Exact UI Component Plan

### 4.1 AiSettingsPanel

**File Path**: `src/components/settings/AiSettingsPanel.jsx`

**Props**:
```javascript
{
  // No props - reads from current user context
}
```

**State**:
```javascript
{
  loading: boolean,
  saving: boolean,
  error: string | null,
  settings: {
    aiEnabled: boolean,
    features: { [key]: boolean },
    dataSharing: { allowMessageAnalysis: boolean },
    consentVersion: string
  }
}
```

**Integration Point**: 
- Render inside `src/components/settings/SettingsPage.jsx`
- Add new section after existing settings sections
- Add route if needed: `/settings/ai`

**Key Behaviors**:
- Fetch settings from `users/{uid}/settings/ai` on mount
- Show master toggle at top
- Show individual feature toggles (disabled if master is off)
- Show privacy notice with link to AI provider terms
- On first enable, set `consentedAt` and `consentVersion`
- Save on each toggle change with debounce

---

### 4.2 AiSuggestionCard

**File Path**: `src/components/ai/AiSuggestionCard.jsx`

**Props**:
```javascript
{
  suggestion: {
    id: string,
    type: string,
    suggestedPayload: object,
    confidence: number,
    status: string,
    createdAt: timestamp
  },
  onAccept: (suggestionId, acceptedPayload?) => void,
  onReject: (suggestionId) => void,
  onDismiss: (suggestionId, reason?) => void,
  onEdit: (suggestionId) => void   // opens review modal
}
```

**State**:
```javascript
{
  expanded: boolean,
  processing: boolean
}
```

**Integration Point**:
- Used by `AiSuggestionReviewModal`
- Can be rendered in message actions area
- Can be rendered in a suggestions list view

**Key Behaviors**:
- Display suggestion preview based on type
- Show confidence indicator (low/medium/high)
- Show sparkle icon to indicate AI-generated
- Quick accept/reject buttons
- "Edit" button opens review modal

---

### 4.3 AiSuggestionReviewModal

**File Path**: `src/components/ai/AiSuggestionReviewModal.jsx`

**Props**:
```javascript
{
  isOpen: boolean,
  suggestion: {
    id: string,
    type: string,
    suggestedPayload: object,
    sourceTextPreview: string,
    confidence: number
  },
  onClose: () => void,
  onAccept: (suggestionId, acceptedPayload) => void,
  onReject: (suggestionId) => void,
  onDismiss: (suggestionId, reason?) => void
}
```

**State**:
```javascript
{
  editedPayload: object,          // user's edits
  dismissReason: string,
  processing: boolean,
  validationErrors: { [field]: string }
}
```

**Integration Point**:
- Rendered at app root level (modal)
- Triggered by `AiSuggestionCard.onEdit`
- Triggered by inline tone repair flow

**Key Behaviors**:
- Show original source text preview
- Show AI suggestion with editable fields
- Validate edited payload against type-specific constraints
- Show confidence level
- Accept (with edits), Reject, Dismiss buttons
- Optional dismiss reason input

---

### 4.4 ToneRepairAiButton

**File Path**: `src/components/chat/ToneRepairAiButton.jsx`

**Props**:
```javascript
{
  draftText: string,
  onSuggestionReady: (suggestion) => void,
  onApply: (finalText) => void,
  disabled: boolean
}
```

**State**:
```javascript
{
  isOpen: boolean,                // dropdown/menu open
  isLoading: boolean,
  suggestion: object | null,
  error: string | null,
  selectedTone: string | null
}
```

**Integration Point**:
- Render inside `src/components/chat/MessageInput.jsx`
- Add alongside existing tone repair button (if exists)
- Or replace existing tone button with AI-enhanced version

**Key Behaviors**:
- Check if AI tone repair is enabled before showing
- Show tone options dropdown: Softer, Clearer, More Caring, Less Angry
- On selection, call `aiToneRepair` Cloud Function
- Show loading spinner (1-3 seconds typical)
- Show suggestion in inline preview or modal
- Accept applies to draft, Cancel restores original
- Handle rate limit errors gracefully

---

### 4.5 MessageToTaskAiAction

**File Path**: `src/components/chat/MessageToTaskAiAction.jsx`

**Props**:
```javascript
{
  message: {
    id: string,
    text: string,
    senderId: string,
    timestamp: timestamp
  },
  chatId: string,
  onTaskCreated: (reminder) => void,
  onClose: () => void
}
```

**State**:
```javascript
{
  isLoading: boolean,
  suggestion: object | null,
  editedTask: {
    title: string,
    description: string,
    dueDate: Date | null,
    assignedTo: string | null
  },
  error: string | null,
  creating: boolean
}
```

**Integration Point**:
- Add to message long-press/context menu in `src/components/chat/MessageActions.jsx`
- New menu item: "Create Task with AI"
- Opens as modal or slide-up panel

**Key Behaviors**:
- Check if AI messageToTask is enabled before showing menu item
- On trigger, call `aiMessageToTask` Cloud Function
- Show loading state
- Display editable form with AI suggestions pre-filled
- User can edit all fields
- "Create Reminder" button creates reminder document
- Show "AI suggested" badge on created reminder
- Handle errors and rate limits gracefully

---

## 5. Backend AI Prompt Templates

### 5.1 Tone Repair Prompt

**System Prompt**:
```
You are a helpful assistant that rewrites messages to have a gentler, clearer tone while preserving the original meaning. Your goal is to help people communicate more effectively in personal relationships.

RULES:
1. Return ONLY valid JSON, no other text
2. Preserve the core message and intent
3. Do not add new information or assumptions
4. Do not give medical, legal, or financial advice
5. Do not extract or mention sensitive data (passwords, SSNs, credit cards, account numbers)
6. If the message is already appropriate or you cannot improve it, return no_suggestion
7. Keep rewrites similar in length to the original (within 50%)
8. Avoid blame, judgment, or taking sides
9. Use warm, caring language appropriate for close relationships

TONE GOALS:
- softer: Remove harshness, add gentleness, use "I" statements
- clearer: Improve clarity, remove ambiguity, be direct but kind
- more_caring: Add warmth, show empathy, acknowledge feelings
- less_angry: Reduce intensity, remove accusatory language, stay calm

OUTPUT FORMAT (JSON only):
{
  "rewrittenText": "the improved message text",
  "explanation": "brief note on what was changed",
  "confidence": 0.0 to 1.0
}

If you cannot provide a useful suggestion:
{
  "rewrittenText": null,
  "explanation": "reason",
  "confidence": 0,
  "no_suggestion": true
}
```

**User Prompt Template**:
```
Rewrite this message with a {toneGoal} tone.

ORIGINAL MESSAGE:
{originalText}

CONTEXT (recent messages, if available):
{contextMessages}

PARTNER'S CURRENT MOOD (if known): {partnerMood}

Return JSON only.
```

---

### 5.2 Message-to-Task Prompt

**System Prompt**:
```
You are a helpful assistant that extracts actionable tasks from conversation messages. Your goal is to help people track commitments and to-dos mentioned in their chats.

RULES:
1. Return ONLY valid JSON, no other text
2. Only extract tasks that are clearly actionable
3. Do not invent tasks not present in the message
4. Do not give medical, legal, or financial advice
5. Do not extract or include sensitive data (passwords, SSNs, credit cards, account numbers, medical details)
6. If no clear task exists, return no_suggestion
7. Task titles should be concise (under 100 characters)
8. Descriptions should summarize the task context
9. Only suggest due dates if explicitly mentioned or clearly implied
10. Assignee is "sender" if they're committing to do something, "recipient" if asking the other person

OUTPUT FORMAT (JSON only):
{
  "taskTitle": "concise task title",
  "taskDescription": "brief context and details",
  "suggestedDueDate": "YYYY-MM-DD" or null,
  "suggestedAssignee": "sender" or "recipient" or null,
  "confidence": 0.0 to 1.0
}

If no actionable task is detected:
{
  "taskTitle": null,
  "taskDescription": null,
  "suggestedDueDate": null,
  "suggestedAssignee": null,
  "confidence": 0,
  "no_suggestion": true
}
```

**User Prompt Template**:
```
Extract an actionable task from this message, if one exists.

MESSAGE:
{messageText}

MESSAGE SENDER: {senderRole} (the person who wrote this message)
MESSAGE TIMESTAMP: {timestamp}
TODAY'S DATE: {today}

CONTEXT (surrounding messages, if available):
{contextMessages}

Return JSON only.
```

---

## 6. Rollback Plan

### 6.1 Disable AI Through Config

**Step 1: Environment Variable Kill Switch**

Add to Cloud Functions environment:
```bash
AI_ENABLED=false
```

Cloud Functions check this before any AI call:
```javascript
if (process.env.AI_ENABLED !== 'true') {
  throw new HttpsError('unavailable', 'AI_TEMPORARILY_DISABLED');
}
```

**Step 2: Firestore Config Document**

Create `config/ai` document:
```javascript
{
  enabled: false,
  disabledAt: timestamp,
  disabledReason: "string"
}
```

Cloud Functions and clients check this document.

### 6.2 Hide AI UI

**Client-side check**:
```javascript
// In React context or hook
const { data: aiConfig } = useDocument('config/ai');
const aiAvailable = aiConfig?.enabled !== false;

// Components check aiAvailable before rendering AI features
if (!aiAvailable) return null;
```

**Components to conditionally hide**:
- `AiSettingsPanel` - show disabled message
- `ToneRepairAiButton` - hide completely
- `MessageToTaskAiAction` - remove from menu
- Any AI suggestion cards - hide

### 6.3 Stop Cloud Functions

**Option A: Disable in Firebase Console**
1. Go to Firebase Console → Functions
2. Click on each AI function
3. Click "Disable" or delete

**Option B: Deploy Empty Functions**
```javascript
exports.aiToneRepair = onCall(async () => {
  throw new HttpsError('unavailable', 'AI_TEMPORARILY_DISABLED');
});
```

**Option C: Set Environment Variable**
```bash
firebase functions:config:set ai.enabled=false
firebase deploy --only functions
```

### 6.4 Preserve Existing Chat Functionality

**Verification Checklist**:
- [ ] Messages can still be sent/received
- [ ] Existing tone repair (local) still works
- [ ] Reminders can be created manually
- [ ] All other features unaffected
- [ ] No errors in console related to AI
- [ ] App loads normally without AI enabled

**Isolation Principle**:
- AI features are additive only
- No existing functionality depends on AI
- AI components lazy-loaded, not in critical path

### 6.5 Delete aiSuggestions Safely

**Step 1: Notify Users** (if applicable)
```javascript
// Optional: mark suggestions as expired first
const batch = db.batch();
suggestions.forEach(doc => {
  batch.update(doc.ref, { 
    status: 'expired',
    expiredReason: 'feature_disabled'
  });
});
await batch.commit();
```

**Step 2: Delete in Batches**
```javascript
async function deleteAiSuggestions(chatId) {
  const suggestions = await db
    .collection(`chats/${chatId}/aiSuggestions`)
    .limit(500)
    .get();
  
  if (suggestions.empty) return;
  
  const batch = db.batch();
  suggestions.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  
  // Recurse for more
  if (suggestions.size === 500) {
    await deleteAiSuggestions(chatId);
  }
}
```

**Step 3: Delete aiUsage and aiRuns** (optional, for complete cleanup)
```javascript
// Similar batch delete pattern for:
// - users/{uid}/aiUsage/*
// - chats/{chatId}/aiRuns/*
```

---

## 7. Testing Plan

### 7.1 Unit Tests

**Location**: `test/ai/`

**Test Files**:
- `test/ai/toneRepair.test.js`
- `test/ai/messageToTask.test.js`
- `test/ai/sensitiveDataFilter.test.js`
- `test/ai/rateLimiter.test.js`

**Tone Repair Unit Tests**:
```javascript
describe('aiToneRepair', () => {
  test('rejects unauthenticated requests');
  test('rejects non-chat-members');
  test('rejects when AI not enabled');
  test('rejects when feature not enabled');
  test('rejects when message analysis not allowed');
  test('rejects text shorter than 10 chars');
  test('rejects text longer than 2000 chars');
  test('rejects invalid toneGoal');
  test('detects and rejects SSN patterns');
  test('detects and rejects credit card patterns');
  test('detects and rejects password patterns');
  test('enforces rate limit of 10/hour');
  test('returns suggestion on valid input');
  test('returns no_suggestion when AI cannot improve');
  test('creates aiSuggestion document on success');
  test('creates aiRun document on success');
  test('increments aiUsage count on success');
});
```

**Message-to-Task Unit Tests**:
```javascript
describe('aiMessageToTask', () => {
  test('rejects unauthenticated requests');
  test('rejects non-chat-members');
  test('rejects when AI not enabled');
  test('rejects when feature not enabled');
  test('rejects non-existent message');
  test('rejects message shorter than 5 chars');
  test('rejects sensitive data in message');
  test('enforces rate limit of 20/day');
  test('returns task suggestion on valid input');
  test('returns no_suggestion when no task detected');
  test('extracts due date when mentioned');
  test('identifies assignee correctly');
});
```

**Sensitive Data Filter Tests**:
```javascript
describe('sensitiveDataFilter', () => {
  test('detects SSN format XXX-XX-XXXX');
  test('detects SSN format XXXXXXXXX');
  test('detects credit card 16 digits');
  test('detects credit card with spaces');
  test('detects credit card with dashes');
  test('detects password: patterns');
  test('detects password= patterns');
  test('does not false positive on phone numbers');
  test('does not false positive on dates');
  test('does not false positive on zip codes');
});
```

### 7.2 Firebase Emulator Security Tests

**Location**: `test/rules/ai.rules.test.js`

**AI Settings Rules Tests**:
```javascript
describe('AI Settings Security Rules', () => {
  test('user can read own AI settings');
  test('user cannot read other user AI settings');
  test('user can create own AI settings with valid data');
  test('user can update own AI settings');
  test('user cannot create settings for other user');
  test('rejects invalid aiEnabled type');
  test('rejects unknown feature keys');
  test('rejects unknown dataSharing keys');
  test('rejects consentVersion over 20 chars');
});
```

**AI Suggestions Rules Tests**:
```javascript
describe('AI Suggestions Security Rules', () => {
  test('target user can read suggestion');
  test('requester user can read suggestion');
  test('other chat member cannot read suggestion');
  test('non-member cannot read suggestion');
  test('client cannot create suggestion');
  test('target user can update status to accepted');
  test('target user can update status to rejected');
  test('target user can update status to dismissed');
  test('target user cannot update status to expired');
  test('target user cannot update status to pending');
  test('non-target user cannot update suggestion');
  test('cannot modify immutable fields (type)');
  test('cannot modify immutable fields (suggestedPayload)');
  test('cannot modify immutable fields (requestedByUserId)');
  test('cannot modify immutable fields (createdAt)');
  test('reviewedBy must equal auth.uid');
  test('acceptedPayload validated for tone_repair');
  test('acceptedPayload validated for task_suggestion');
  test('acceptedPayload rejects unknown fields');
  test('acceptedPayload rejects oversized strings');
  test('dismissReason limited to 200 chars');
  test('target user can delete suggestion');
  test('non-target user cannot delete suggestion');
});
```

**AI Usage Rules Tests**:
```javascript
describe('AI Usage Security Rules', () => {
  test('user can read own usage');
  test('user cannot read other user usage');
  test('client cannot write usage');
});
```

**AI Runs Rules Tests**:
```javascript
describe('AI Runs Security Rules', () => {
  test('client cannot read aiRuns');
  test('client cannot write aiRuns');
});
```

### 7.3 Two-User Manual Tests

**Test Environment Setup**:
- Two test accounts (User A, User B)
- Shared chat between them
- Both have AI enabled
- Firebase emulator or staging environment

**Tone Repair Flow**:
```
1. User A enables AI and toneRepair feature
2. User A opens chat with User B
3. User A types: "Why didn't you do this?"
4. User A clicks Tone → Soften with AI
5. VERIFY: Loading indicator appears
6. VERIFY: Suggestion appears with softer text
7. User A clicks Accept
8. VERIFY: Draft updates to suggested text
9. User A sends message
10. VERIFY: Message appears in chat
11. User B receives message
12. VERIFY: No AI indicator on received message (suggestion was private)
```

**Message-to-Task Flow**:
```
1. User B sends: "Can you pick up groceries tomorrow?"
2. User A long-presses message
3. User A selects "Create Task with AI"
4. VERIFY: Loading indicator appears
5. VERIFY: Task form appears with AI suggestions
6. VERIFY: Title is reasonable (e.g., "Pick up groceries")
7. VERIFY: Due date is tomorrow
8. VERIFY: Assignee is User A (recipient)
9. User A edits title slightly
10. User A clicks Create Reminder
11. VERIFY: Reminder created with "AI suggested" badge
12. VERIFY: Reminder appears in reminders list
```

**Rate Limit Test**:
```
1. User A uses Tone Repair 10 times within an hour
2. User A tries 11th time
3. VERIFY: Error message about rate limit
4. VERIFY: Error is user-friendly, not technical
5. Wait 1 hour
6. User A tries again
7. VERIFY: Works normally
```

**Consent Flow Test**:
```
1. New user signs up
2. User navigates to Settings → AI
3. VERIFY: All toggles are OFF by default
4. User enables master toggle
5. VERIFY: Consent timestamp recorded
6. User tries to use Tone Repair
7. VERIFY: Error - feature not enabled
8. User enables toneRepair feature
9. VERIFY: Error - message analysis not allowed
10. User enables allowMessageAnalysis
11. User uses Tone Repair
12. VERIFY: Works now
```

### 7.4 Abuse Tests

**Rapid Fire Requests**:
```
1. Script sends 20 toneRepair requests in 1 second
2. VERIFY: First 10 succeed
3. VERIFY: Remaining get RATE_LIMIT_EXCEEDED
4. VERIFY: No server errors or crashes
5. VERIFY: Other users unaffected
```

**Sensitive Data Injection**:
```
1. User tries Tone Repair with SSN in text
2. VERIFY: SENSITIVE_DATA_DETECTED error
3. User tries with credit card number
4. VERIFY: SENSITIVE_DATA_DETECTED error
5. User tries with "password: secret123"
6. VERIFY: SENSITIVE_DATA_DETECTED error
```

**Payload Tampering**:
```
1. User accepts suggestion via API
2. Attempt to set status to 'expired'
3. VERIFY: Rejected by security rules
4. Attempt to modify suggestedPayload
5. VERIFY: Rejected by security rules
6. Attempt to set reviewedBy to different user
7. VERIFY: Rejected by security rules
```

**Large Payload Attack**:
```
1. User tries Tone Repair with 10000 char text
2. VERIFY: TEXT_TOO_LONG error
3. User tries to set acceptedPayload.finalText to 10000 chars
4. VERIFY: Rejected by security rules
```

**Cross-Chat Access**:
```
1. User A is member of Chat 1
2. User A tries to call aiToneRepair for Chat 2
3. VERIFY: NOT_CHAT_MEMBER error
4. User A tries to read aiSuggestions from Chat 2
5. VERIFY: Permission denied
```

### 7.5 No-Regression Tests

**Existing Feature Verification**:
```
After AI implementation, verify:

Chat:
- [ ] Messages send correctly
- [ ] Messages receive in real-time
- [ ] Message reactions work
- [ ] Reply-to works
- [ ] File attachments work
- [ ] Emoji/stickers work

Local Tone Repair (if exists):
- [ ] Still accessible
- [ ] Still functions without AI
- [ ] No errors when AI disabled

Reminders:
- [ ] Manual reminder creation works
- [ ] Reminder notifications work
- [ ] Reminder completion works

Other Features:
- [ ] Decisions work
- [ ] Promises work
- [ ] Capsules work
- [ ] Follow-ups work
- [ ] Memories work
- [ ] Check-ins work
- [ ] Vault items work
- [ ] Dashboard loads
- [ ] Settings save correctly

Performance:
- [ ] App startup time unchanged
- [ ] Chat scrolling smooth
- [ ] No memory leaks
- [ ] No console errors
```

**Build Verification**:
```bash
# Must pass before deployment
npm run build
npm run test
npm run lint
firebase emulators:exec "npm run test:rules"
```

---

## Approval Checklist

Before implementation begins, the following must be reviewed and approved:

- [ ] **Firestore Schema** - All collections, fields, and constraints reviewed
- [ ] **Cloud Function Contracts** - All inputs, outputs, and error codes reviewed
- [ ] **Security Rules** - All rules tested in emulator, no privilege escalation possible
- [ ] **UI Components** - Integration points identified, no breaking changes
- [ ] **AI Prompts** - Reviewed for safety, no harmful outputs possible
- [ ] **Rollback Plan** - Tested in staging, can disable within 5 minutes
- [ ] **Testing Plan** - All test cases written before implementation

**Approver**: _________________
**Date**: _________________
**Notes**: _________________

---

*Document Version: 1.0*
*Created: 2026-05-08*
*Status: PENDING APPROVAL*

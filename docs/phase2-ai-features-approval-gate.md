# Phase 2 AI Features - Implementation Approval Gate (Revised)

## Overview

| Feature | Purpose | Trigger |
|---------|---------|---------|
| Misunderstanding Helper | Suggests clarification message for conflict | User clicks "✨ AI Help" on misunderstanding item |
| Gentle Follow-up Generator | Drafts polite follow-up for pending item | User clicks "✨ AI Follow-up" on promise/reminder/followUp |
| Memory Assistant | Suggests title/description from caption/text | User clicks "✨ AI Describe" when creating memory |

### Critical Constraints (All Features)

- User-triggered only
- No background scanning
- No scheduled summaries
- No auto-send
- No auto-save without user approval
- No raw content in aiRuns
- No AI API key in frontend
- Existing MVP AI features must keep working
- Existing non-AI features must keep working

---

## Shared Schemas (MVP-Compatible)

### AI Settings Schema (Existing - Do Not Change)

```
/users/{userId}/settings/ai
{
  aiEnabled: boolean,                        // master toggle
  consentedAt: timestamp,                    // when user consented
  consentVersion: string,                    // "1.0"
  features: {
    toneRepair: boolean,                     // MVP
    messageToTask: boolean,                  // MVP
    misunderstandingHelper: boolean,         // Phase 2
    gentleFollowup: boolean,                 // Phase 2
    memoryAssistant: boolean,                // Phase 2
  },
  dataSharing: {
    allowMessageAnalysis: boolean,           // required for AI
  },
  updatedAt: timestamp,
}
```

### AI Usage Schema (Flat - MVP Pattern)

```
/users/{userId}/aiUsage/{windowId}
{
  windowId: string,                          // e.g., "misunderstandingHelper_hourly_2026-05-09T16"
  feature: string,                           // "misunderstandingHelper" | "gentleFollowup" | "memoryAssistant"
  count: number,                             // requests in window
  windowStart: timestamp,                    // window start time
  windowEnd: timestamp,                      // window end time
  lastRequestAt: timestamp,                  // last request time
}
```

### AI Runs Schema (No Raw Content)

```
/chats/{chatId}/aiRuns/{runId}
{
  requestedByUserId: string,
  feature: string,                           // feature name
  functionName: string,                      // Cloud Function name
  inputTokenCount: number,
  outputTokenCount: number,
  success: boolean,
  errorCode: string | null,
  provider: "anthropic",
  model: string,
  requestedAt: timestamp,
  completedAt: timestamp,
  latencyMs: number,
  estimatedCostUsd: number,
  suggestionId: string | null,
  // NO raw content - no messageText, no description, no caption
}
```

### AI Suggestions Security Model (MVP Pattern)

```javascript
match /chats/{chatId}/aiSuggestions/{suggestionId} {
  // Only targetUserId or requestedByUserId can read
  allow read: if request.auth != null
    && isChatMember(chatId)
    && (resource.data.targetUserId == request.auth.uid
        || resource.data.requestedByUserId == request.auth.uid);

  // Client cannot create (server only)
  allow create: if false;

  // Client cannot delete
  allow delete: if false;

  // Only targetUserId can update, only review fields
  allow update: if request.auth != null
    && isChatMember(chatId)
    && resource.data.targetUserId == request.auth.uid
    && onlyReviewFieldsChanged()
    && validStatusTransition()
    && validReviewerFields();

  function onlyReviewFieldsChanged() {
    return request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['status', 'acceptedPayload', 'reviewedBy', 'reviewedAt', 'dismissReason']);
  }

  function validStatusTransition() {
    // Cannot set to pending or expired (server only)
    return request.resource.data.status in ['accepted', 'dismissed'];
  }

  function validReviewerFields() {
    // reviewedBy must equal auth.uid when status changes
    // reviewedAt must be a timestamp when status changes
    return request.resource.data.reviewedBy == request.auth.uid
      && request.resource.data.reviewedAt is timestamp;
  }
}
```

---

## Feature 1: Misunderstanding Helper

### 1.1 Firestore Schema

```
/chats/{chatId}/aiSuggestions/{suggestionId}
{
  type: "misunderstanding_helper",           // immutable
  requestedByUserId: string,                 // UID of requester
  targetUserId: string,                      // same as requester
  sourceMessageId: string | null,            // optional linked message
  sourceTextPreview: string,                 // sanitized preview (max 100 chars)
  generatedBy: "anthropic",
  generatedByFunction: "aiMisunderstandingHelper",
  suggestedPayload: {
    clarificationText: string,               // max 2000 chars
    issueIdentified: string,                 // max 500 chars
    suggestedApproach: string,               // max 500 chars
  },
  confidence: number,                        // 0.0-1.0
  status: "pending" | "accepted" | "dismissed" | "expired",
  acceptedPayload: {                         // set by client on accept
    clarificationText: string,               // may be edited by user
  } | null,
  reviewedBy: string | null,                 // UID, set on status change
  reviewedAt: timestamp | null,              // set on status change
  dismissReason: string | null,              // optional
  createdAt: timestamp,
  expiresAt: timestamp,                      // +10 minutes
}
```

**acceptedPayload Validation (Security Rules):**
```javascript
function validMisunderstandingHelperAcceptedPayload() {
  let payload = request.resource.data.acceptedPayload;
  return payload == null
    || (payload.keys().hasOnly(['clarificationText'])
        && payload.clarificationText is string
        && payload.clarificationText.size() <= 2000);
}
```

### 1.2 Cloud Function Contract

```
Function: aiMisunderstandingHelper
Type: onCall (v2)
Secrets: [AI_API_KEY]
Region: us-central1
```

### 1.3 Input JSON

```json
{
  "chatId": "string (required)",
  "misunderstandingId": "string (required)",
  "contextMessageIds": ["string"]            // optional, max 5
}
```

### 1.4 Output JSON

**Success:**
```json
{
  "success": true,
  "suggestionId": "string",
  "suggestion": {
    "clarificationText": "string",
    "issueIdentified": "string",
    "suggestedApproach": "string",
    "confidence": 0.85
  }
}
```

**No suggestion:**
```json
{
  "success": true,
  "suggestionId": null,
  "suggestion": null,
  "reason": "NO_SUGGESTION" | "AI_OUTPUT_FILTERED"
}
```

### 1.5 Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `AI_TEMPORARILY_DISABLED` | 503 | Server kill switch active |
| `INVALID_INPUT` | 400 | Missing/invalid chatId or misunderstandingId |
| `MISUNDERSTANDING_NOT_FOUND` | 404 | Document doesn't exist |
| `NOT_CHAT_MEMBER` | 403 | User not in chat members |
| `AI_NOT_ENABLED` | 412 | aiEnabled=false or dataSharing.allowMessageAnalysis=false |
| `FEATURE_NOT_ENABLED` | 412 | features.misunderstandingHelper=false |
| `RATE_LIMIT_EXCEEDED` | 429 | Exceeded 10/hour |
| `SENSITIVE_DATA_DETECTED` | 400 | PII in input |
| `AI_TIMEOUT` | 504 | Provider timeout |
| `AI_PROVIDER_ERROR` | 500 | Provider failure |

### 1.6 Auth Checks

```javascript
if (!request.auth) {
  throw new HttpsError('unauthenticated', 'Must be logged in');
}
const uid = request.auth.uid;
```

### 1.7 Chat Membership Checks

```javascript
const chatDoc = await db.doc(`chats/${chatId}`).get();
if (!chatDoc.exists) {
  throw new HttpsError('not-found', 'CHAT_NOT_FOUND');
}
const members = chatDoc.data().members || [];
if (!members.includes(uid)) {
  throw new HttpsError('permission-denied', 'NOT_CHAT_MEMBER');
}
```

### 1.8 AI Consent Checks

```javascript
async function verifyAIEnabled(uid, feature) {
  const settingsDoc = await db.doc(`users/${uid}/settings/ai`).get();
  if (!settingsDoc.exists) {
    return { enabled: false, reason: 'AI_NOT_ENABLED' };
  }
  const settings = settingsDoc.data();
  if (!settings.aiEnabled) {
    return { enabled: false, reason: 'AI_NOT_ENABLED' };
  }
  if (!settings.dataSharing?.allowMessageAnalysis) {
    return { enabled: false, reason: 'AI_NOT_ENABLED' };
  }
  if (settings.features?.[feature] === false) {
    return { enabled: false, reason: 'FEATURE_NOT_ENABLED' };
  }
  return { enabled: true };
}

const aiCheck = await verifyAIEnabled(uid, 'misunderstandingHelper');
if (!aiCheck.enabled) {
  throw new HttpsError('failed-precondition', aiCheck.reason);
}
```

### 1.9 Rate Limit Checks

```javascript
// 10 requests per hour per user
const hourKey = new Date().toISOString().slice(0, 13); // "2026-05-09T16"
const windowId = `misunderstandingHelper_hourly_${hourKey}`;

await db.runTransaction(async (tx) => {
  const usageRef = db.doc(`users/${uid}/aiUsage/${windowId}`);
  const usageDoc = await tx.get(usageRef);
  
  const now = new Date();
  const windowStart = new Date(hourKey + ':00:00.000Z');
  const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);
  
  if (usageDoc.exists) {
    const data = usageDoc.data();
    if (data.count >= 10) {
      throw new HttpsError('resource-exhausted', 'RATE_LIMIT_EXCEEDED');
    }
    tx.update(usageRef, {
      count: FieldValue.increment(1),
      lastRequestAt: FieldValue.serverTimestamp(),
    });
  } else {
    tx.set(usageRef, {
      windowId,
      feature: 'misunderstandingHelper',
      count: 1,
      windowStart,
      windowEnd,
      lastRequestAt: FieldValue.serverTimestamp(),
    });
  }
});
```

### 1.10 Sensitive Data Checks

```javascript
const SENSITIVE_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/,                   // SSN
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
  /\bpassword\s*[:=]\s*\S+/i,                // Password
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email (optional)
];

function containsSensitiveData(text) {
  if (!text) return false;
  return SENSITIVE_PATTERNS.some(p => p.test(text));
}

// Check misunderstanding description
const misDoc = await db.doc(`chats/${chatId}/misunderstandings/${misunderstandingId}`).get();
if (!misDoc.exists) {
  throw new HttpsError('not-found', 'MISUNDERSTANDING_NOT_FOUND');
}
const description = misDoc.data().description || '';
if (containsSensitiveData(description)) {
  throw new HttpsError('invalid-argument', 'SENSITIVE_DATA_DETECTED');
}
```

### 1.11 Firestore Writes

1. `/chats/{chatId}/aiRuns/{runId}` - always (metadata only, no raw content)
2. `/chats/{chatId}/aiSuggestions/{suggestionId}` - on success only
3. `/users/{uid}/aiUsage/{windowId}` - rate limit counter

### 1.12 Security Rule Additions

```javascript
// Add to existing aiSuggestions rules
function validAcceptedPayload() {
  let type = resource.data.type;
  let payload = request.resource.data.acceptedPayload;
  
  return payload == null
    || (type == 'misunderstanding_helper' && validMisunderstandingHelperAcceptedPayload())
    || (type == 'gentle_followup' && validGentleFollowupAcceptedPayload())
    || (type == 'memory_assistant' && validMemoryAssistantAcceptedPayload())
    || (type == 'tone_repair' && validToneRepairAcceptedPayload())
    || (type == 'message_to_task' && validMessageToTaskAcceptedPayload());
}

function validMisunderstandingHelperAcceptedPayload() {
  let payload = request.resource.data.acceptedPayload;
  return payload.keys().hasOnly(['clarificationText'])
    && payload.clarificationText is string
    && payload.clarificationText.size() <= 2000;
}
```

### 1.13 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MisunderstandingAiButton` | `src/chat/MisunderstandingAiButton.jsx` | Trigger button |
| `MisunderstandingAiSuggestion` | `src/chat/MisunderstandingAiSuggestion.jsx` | Display/edit suggestion |

**Integration:** `src/chat/Misunderstandings.jsx` - add button to unresolved items

**Flow:**
1. User clicks "✨ AI Help" on misunderstanding
2. Loading indicator shown
3. Suggestion panel appears
4. User can Edit -> Accept (copies to message input) or Dismiss
5. User must manually click Send - NO auto-send

### 1.14 AI Prompt Template

```javascript
const MISUNDERSTANDING_HELPER_SYSTEM = `You are a caring relationship communication assistant.
Help people resolve misunderstandings through gentle, empathetic clarification.

RULES:
1. Return ONLY valid JSON
2. Never take sides or assign blame
3. Use "I" statements and non-violent communication
4. Acknowledge both perspectives
5. Focus on feelings, not accusations
6. Do not give medical, legal, or financial advice
7. Do not include sensitive data in output
8. If content is inappropriate or contains sensitive data, return no_suggestion
9. Keep clarification under 300 words
10. Be warm but not saccharine

OUTPUT FORMAT:
{
  "clarificationText": "the suggested message to send",
  "issueIdentified": "brief summary of the core issue",
  "suggestedApproach": "why this approach may help",
  "confidence": 0.0 to 1.0
}

If cannot help:
{
  "clarificationText": null,
  "issueIdentified": null,
  "suggestedApproach": null,
  "confidence": 0,
  "no_suggestion": true
}`;

function buildMisunderstandingHelperPrompt({ description, contextMessages, today }) {
  return `Help resolve this misunderstanding between partners.

MISUNDERSTANDING DESCRIPTION:
${description}

${contextMessages?.length ? `RECENT CONTEXT:\n${contextMessages.join('\n')}` : ''}

TODAY: ${today}

Suggest a gentle clarification message. Return JSON only.`;
}
```

### 1.15 Unit Tests

```javascript
describe('aiMisunderstandingHelper', () => {
  // Input validation
  it('throws INVALID_INPUT for missing chatId');
  it('throws INVALID_INPUT for missing misunderstandingId');
  it('throws MISUNDERSTANDING_NOT_FOUND for nonexistent doc');
  
  // Auth & membership
  it('throws unauthenticated when not logged in');
  it('throws NOT_CHAT_MEMBER for non-member');
  
  // AI consent
  it('throws AI_NOT_ENABLED when aiEnabled=false');
  it('throws AI_NOT_ENABLED when dataSharing.allowMessageAnalysis=false');
  it('throws FEATURE_NOT_ENABLED when features.misunderstandingHelper=false');
  
  // Rate limiting
  it('throws RATE_LIMIT_EXCEEDED after 10 requests/hour');
  it('resets rate limit in new hour window');
  
  // Sensitive data
  it('throws SENSITIVE_DATA_DETECTED for SSN in description');
  it('throws SENSITIVE_DATA_DETECTED for credit card');
  it('filters AI output containing sensitive data');
  
  // Success cases
  it('returns suggestion for valid misunderstanding');
  it('returns NO_SUGGESTION when AI cannot help');
  
  // Firestore writes
  it('creates aiRun document on every call');
  it('creates aiSuggestion only on success');
  it('does not store raw description in aiRuns');
  it('updates aiUsage with flat schema');
  
  // Kill switch
  it('throws AI_TEMPORARILY_DISABLED when AI_ENABLED=false');
});
```

### 1.16 Emulator Security Tests

```javascript
describe('AI Misunderstanding Helper Rules', () => {
  // Read access
  it('targetUserId can read own suggestion');
  it('requestedByUserId can read suggestion they requested');
  it('other chat member cannot read suggestion');
  it('non-member cannot read suggestion');
  
  // Create/delete
  it('client cannot create aiSuggestion');
  it('client cannot delete aiSuggestion');
  
  // Update - valid
  it('targetUserId can update status to accepted');
  it('targetUserId can update status to dismissed');
  it('targetUserId can set acceptedPayload with clarificationText');
  it('targetUserId can set dismissReason');
  
  // Update - invalid
  it('client cannot set status to pending');
  it('client cannot set status to expired');
  it('client cannot modify suggestedPayload');
  it('client cannot modify type');
  it('client cannot modify createdAt');
  it('requestedByUserId (non-target) cannot update');
  it('reviewedBy must equal auth.uid');
  it('reviewedAt must be timestamp');
  
  // acceptedPayload validation
  it('rejects acceptedPayload with extra fields');
  it('rejects acceptedPayload.clarificationText > 2000 chars');
  it('rejects acceptedPayload.clarificationText non-string');
});
```

### 1.17 Manual Two-User Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Button hidden when AI disabled | User A: Settings -> AI off -> Clear the Air | No ✨ button |
| 2 | Button hidden when feature disabled | User A: AI on, misunderstandingHelper off | No ✨ button |
| 3 | Button shown when enabled | User A: AI on, feature on -> Clear the Air | ✨ AI Help visible |
| 4 | Generate suggestion | Click ✨ AI Help | Loading -> suggestion appears |
| 5 | Edit suggestion | Modify clarificationText | Edit reflected |
| 6 | Accept copies to input | Click Accept | Text in message input, NOT sent |
| 7 | Manual send required | After Accept, click Send | Message sent |
| 8 | User B sees normal message | User A sends | User B sees normal message |
| 9 | Dismiss closes panel | Click Dismiss | Panel closes |
| 10 | Rate limit error | Use 11 times in 1 hour | Error on 11th |
| 11 | Sensitive data rejected | Misunderstanding with SSN | Error shown |

### 1.18 Rollback Plan

1. **Immediate kill switch:** Set `AI_ENABLED=false` in environment
2. **Feature-specific:** Set `features.misunderstandingHelper=false` in user settings
3. **Full rollback:** Revert frontend deployment, functions remain (harmless if not called)

---

## Feature 2: Gentle Follow-up Generator

### Phase 2 Scope

- Generate follow-up for **pending promises, reminders, or followUp items only**
- User selects a pending item and clicks "✨ AI Follow-up"
- No automatic unanswered-message detection
- No inference of hidden intent
- User-triggered only

### 2.1 Firestore Schema

```
/chats/{chatId}/aiSuggestions/{suggestionId}
{
  type: "gentle_followup",                   // immutable
  requestedByUserId: string,
  targetUserId: string,                      // same as requester
  sourceMessageId: string | null,            // optional
  sourceItemType: "promise" | "reminder" | "followUp", // required
  sourceItemId: string,                      // ID of the pending item
  sourceTextPreview: string,                 // max 100 chars
  generatedBy: "anthropic",
  generatedByFunction: "aiGentleFollowup",
  suggestedPayload: {
    followupText: string,                    // max 1000 chars
    tone: "gentle" | "caring" | "patient",
    itemContext: string,                     // brief context about the pending item
  },
  confidence: number,
  status: "pending" | "accepted" | "dismissed" | "expired",
  acceptedPayload: {
    followupText: string,                    // may be edited
  } | null,
  reviewedBy: string | null,
  reviewedAt: timestamp | null,
  dismissReason: string | null,
  createdAt: timestamp,
  expiresAt: timestamp,                      // +5 minutes
}
```

**acceptedPayload Validation:**
```javascript
function validGentleFollowupAcceptedPayload() {
  let payload = request.resource.data.acceptedPayload;
  return payload.keys().hasOnly(['followupText'])
    && payload.followupText is string
    && payload.followupText.size() <= 1000;
}
```

### 2.2 Cloud Function Contract

```
Function: aiGentleFollowup
Type: onCall (v2)
Secrets: [AI_API_KEY]
Region: us-central1
```

### 2.3 Input JSON

```json
{
  "chatId": "string (required)",
  "itemType": "promise" | "reminder" | "followUp" (required),
  "itemId": "string (required)",
  "tone": "gentle" | "caring" | "patient"    // optional, default "gentle"
}
```

### 2.4 Output JSON

**Success:**
```json
{
  "success": true,
  "suggestionId": "string",
  "suggestion": {
    "followupText": "string",
    "tone": "gentle",
    "itemContext": "string",
    "confidence": 0.9
  }
}
```

**No suggestion:**
```json
{
  "success": true,
  "suggestionId": null,
  "suggestion": null,
  "reason": "NO_FOLLOWUP_NEEDED" | "ITEM_COMPLETED" | "AI_OUTPUT_FILTERED"
}
```

### 2.5 Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `AI_TEMPORARILY_DISABLED` | 503 | Kill switch active |
| `INVALID_INPUT` | 400 | Missing/invalid parameters |
| `ITEM_NOT_FOUND` | 404 | Promise/reminder/followUp not found |
| `ITEM_COMPLETED` | 400 | Item already completed |
| `NOT_CHAT_MEMBER` | 403 | Not in chat |
| `AI_NOT_ENABLED` | 412 | No AI consent |
| `FEATURE_NOT_ENABLED` | 412 | gentleFollowup=false |
| `RATE_LIMIT_EXCEEDED` | 429 | Exceeded 15/day |
| `SENSITIVE_DATA_DETECTED` | 400 | PII in item |
| `AI_TIMEOUT` | 504 | Timeout |
| `AI_PROVIDER_ERROR` | 500 | Failure |

### 2.6 Auth Checks

```javascript
if (!request.auth) {
  throw new HttpsError('unauthenticated', 'Must be logged in');
}
const uid = request.auth.uid;
```

### 2.7 Chat Membership Checks

```javascript
const chatDoc = await db.doc(`chats/${chatId}`).get();
if (!chatDoc.exists) {
  throw new HttpsError('not-found', 'CHAT_NOT_FOUND');
}
if (!chatDoc.data().members?.includes(uid)) {
  throw new HttpsError('permission-denied', 'NOT_CHAT_MEMBER');
}
```

### 2.8 AI Consent Checks

```javascript
const aiCheck = await verifyAIEnabled(uid, 'gentleFollowup');
if (!aiCheck.enabled) {
  throw new HttpsError('failed-precondition', aiCheck.reason);
}
```

### 2.9 Rate Limit Checks

```javascript
// 15 requests per day per user
const dateKey = new Date().toISOString().slice(0, 10); // "2026-05-09"
const windowId = `gentleFollowup_daily_${dateKey}`;
// Transaction: check count < 15, increment
```

### 2.10 Sensitive Data Checks

```javascript
// Get item text based on type
let itemText = '';
if (itemType === 'promise') {
  const doc = await db.doc(`chats/${chatId}/promises/${itemId}`).get();
  itemText = doc.data()?.text || '';
} else if (itemType === 'reminder') {
  const doc = await db.doc(`chats/${chatId}/reminders/${itemId}`).get();
  itemText = doc.data()?.title || '';
} else if (itemType === 'followUp') {
  const doc = await db.doc(`chats/${chatId}/followUps/${itemId}`).get();
  itemText = doc.data()?.text || '';
}

if (containsSensitiveData(itemText)) {
  throw new HttpsError('invalid-argument', 'SENSITIVE_DATA_DETECTED');
}
```

### 2.11 Firestore Writes

1. `/chats/{chatId}/aiRuns/{runId}` - always
2. `/chats/{chatId}/aiSuggestions/{suggestionId}` - on success
3. `/users/{uid}/aiUsage/{windowId}` - rate limit

### 2.12 Security Rule Additions

```javascript
function validGentleFollowupAcceptedPayload() {
  let payload = request.resource.data.acceptedPayload;
  return payload.keys().hasOnly(['followupText'])
    && payload.followupText is string
    && payload.followupText.size() <= 1000;
}
```

### 2.13 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `FollowupAiButton` | `src/chat/FollowupAiButton.jsx` | Button on pending items |
| `FollowupAiSuggestion` | `src/chat/FollowupAiSuggestion.jsx` | Display/edit panel |

**Integration points:**
- `src/chat/Promises.jsx` - add button to pending promises
- `src/chat/Reminders.jsx` - add button to pending reminders
- `src/chat/FollowUps.jsx` - add button to pending follow-ups

**Flow:**
1. User opens Promises/Reminders/Follow-ups
2. On pending item, clicks "✨ AI Follow-up"
3. Loading indicator
4. Suggestion panel appears
5. User can Edit -> Accept (copies to input) or Dismiss
6. User must manually Send - NO auto-send

### 2.14 AI Prompt Template

```javascript
const GENTLE_FOLLOWUP_SYSTEM = `You are a thoughtful communication assistant.
Help people follow up on pending commitments in a kind, non-pressuring way.

RULES:
1. Return ONLY valid JSON
2. Never guilt-trip or pressure
3. Acknowledge the other person may be busy
4. Keep followups brief (under 150 words)
5. Do not include sensitive data
6. If no followup is appropriate, return no_suggestion
7. Match casual relationship tone

TONES:
- gentle: soft reminder, very low pressure
- caring: shows concern, checks in
- patient: explicitly non-urgent, understanding

OUTPUT FORMAT:
{
  "followupText": "suggested followup message",
  "tone": "gentle|caring|patient",
  "itemContext": "brief context about what's pending",
  "confidence": 0.0 to 1.0
}

If no followup needed:
{
  "followupText": null,
  "tone": null,
  "itemContext": null,
  "confidence": 0,
  "no_suggestion": true
}`;

function buildGentleFollowupPrompt({ itemType, itemText, createdAt, tone, today }) {
  const timeSince = getHumanReadableTimeSince(createdAt);
  
  return `Suggest a ${tone} follow-up for this pending ${itemType}.

PENDING ITEM (created ${timeSince}):
${itemText}

TODAY: ${today}

Return JSON only.`;
}
```

### 2.15 Unit Tests

```javascript
describe('aiGentleFollowup', () => {
  // Input validation
  it('throws INVALID_INPUT for missing chatId');
  it('throws INVALID_INPUT for missing itemType');
  it('throws INVALID_INPUT for invalid itemType');
  it('throws INVALID_INPUT for missing itemId');
  it('throws ITEM_NOT_FOUND for nonexistent item');
  it('throws ITEM_COMPLETED for completed item');
  
  // Auth & membership
  it('throws unauthenticated when not logged in');
  it('throws NOT_CHAT_MEMBER for non-member');
  
  // AI consent
  it('throws AI_NOT_ENABLED when aiEnabled=false');
  it('throws FEATURE_NOT_ENABLED when features.gentleFollowup=false');
  
  // Rate limiting
  it('throws RATE_LIMIT_EXCEEDED after 15 requests/day');
  
  // Sensitive data
  it('throws SENSITIVE_DATA_DETECTED for SSN in item text');
  
  // Success cases
  it('returns suggestion for pending promise');
  it('returns suggestion for pending reminder');
  it('returns suggestion for pending followUp');
  it('respects tone parameter');
  
  // Firestore
  it('does not store item text in aiRuns');
  it('uses flat aiUsage schema');
});
```

### 2.16 Emulator Security Tests

```javascript
describe('AI Gentle Followup Rules', () => {
  it('targetUserId can read own suggestion');
  it('non-target cannot read');
  it('client cannot create');
  it('client cannot delete');
  it('targetUserId can update status to accepted/dismissed');
  it('cannot set status to pending/expired');
  it('cannot modify suggestedPayload');
  it('acceptedPayload must have only followupText');
  it('acceptedPayload.followupText max 1000 chars');
});
```

### 2.17 Manual Two-User Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Button on pending promise | User A creates promise -> views Promises | ✨ button on pending item |
| 2 | Button hidden on completed | Complete a promise | No ✨ button |
| 3 | Button hidden when AI off | Disable AI | No ✨ button |
| 4 | Generate for promise | Click ✨ on pending promise | Suggestion appears |
| 5 | Generate for reminder | Click ✨ on pending reminder | Suggestion appears |
| 6 | Generate for followUp | Click ✨ on pending followUp | Suggestion appears |
| 7 | Accept copies to input | Accept suggestion | Text in input, NOT sent |
| 8 | Manual send | Send message | Message appears normally |
| 9 | Rate limit | 16 uses in 1 day | Error on 16th |

### 2.18 Rollback Plan

1. Kill switch: `AI_ENABLED=false`
2. Feature toggle: `features.gentleFollowup=false`
3. Full rollback: Revert frontend

---

## Feature 3: Memory Assistant

### Phase 2 Scope

- Generate title/description from **caption and selected message text only**
- **NO image URLs sent to AI** (vision deferred to later phase)
- User provides caption or selects messages for context
- User-triggered only

### 3.1 Firestore Schema

```
/chats/{chatId}/aiSuggestions/{suggestionId}
{
  type: "memory_assistant",                  // immutable
  requestedByUserId: string,
  targetUserId: string,                      // same as requester
  sourceMessageId: string | null,            // optional linked message
  sourceTextPreview: string,                 // max 100 chars
  generatedBy: "anthropic",
  generatedByFunction: "aiMemoryAssistant",
  suggestedPayload: {
    title: string,                           // max 100 chars
    description: string,                     // max 500 chars
    suggestedDate: string | null,            // "YYYY-MM-DD"
    mood: string | null,                     // "happy", "romantic", etc.
  },
  confidence: number,
  status: "pending" | "accepted" | "dismissed" | "expired",
  acceptedPayload: {
    title: string,                           // may be edited
    description: string,                     // may be edited
  } | null,
  reviewedBy: string | null,
  reviewedAt: timestamp | null,
  dismissReason: string | null,
  createdAt: timestamp,
  expiresAt: timestamp,                      // +10 minutes
}
```

**acceptedPayload Validation:**
```javascript
function validMemoryAssistantAcceptedPayload() {
  let payload = request.resource.data.acceptedPayload;
  return payload.keys().hasOnly(['title', 'description'])
    && payload.title is string
    && payload.title.size() <= 100
    && payload.description is string
    && payload.description.size() <= 500;
}
```

### 3.2 Cloud Function Contract

```
Function: aiMemoryAssistant
Type: onCall (v2)
Secrets: [AI_API_KEY]
Region: us-central1
```

### 3.3 Input JSON

```json
{
  "chatId": "string (required)",
  "caption": "string (optional) - user-provided context",
  "messageIds": ["string"]                   // optional, max 5
}
```

**Note:** No `imageUrl` parameter in Phase 2.

### 3.4 Output JSON

**Success:**
```json
{
  "success": true,
  "suggestionId": "string",
  "suggestion": {
    "title": "string",
    "description": "string",
    "suggestedDate": "2026-05-09" | null,
    "mood": "happy" | null,
    "confidence": 0.85
  }
}
```

**No suggestion:**
```json
{
  "success": true,
  "suggestionId": null,
  "suggestion": null,
  "reason": "NO_SUGGESTION" | "INSUFFICIENT_CONTEXT" | "AI_OUTPUT_FILTERED"
}
```

### 3.5 Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `AI_TEMPORARILY_DISABLED` | 503 | Kill switch |
| `INVALID_INPUT` | 400 | No caption and no messageIds |
| `INSUFFICIENT_CONTEXT` | 400 | Caption too short and no messages |
| `MESSAGE_NOT_FOUND` | 404 | Referenced message doesn't exist |
| `NOT_CHAT_MEMBER` | 403 | Not in chat |
| `AI_NOT_ENABLED` | 412 | No consent |
| `FEATURE_NOT_ENABLED` | 412 | memoryAssistant=false |
| `RATE_LIMIT_EXCEEDED` | 429 | Exceeded 20/day |
| `SENSITIVE_DATA_DETECTED` | 400 | PII in caption/messages |
| `AI_TIMEOUT` | 504 | Timeout |
| `AI_PROVIDER_ERROR` | 500 | Failure |

### 3.6 Auth Checks

```javascript
if (!request.auth) {
  throw new HttpsError('unauthenticated', 'Must be logged in');
}
```

### 3.7 Chat Membership Checks

```javascript
const chatDoc = await db.doc(`chats/${chatId}`).get();
if (!chatDoc.exists || !chatDoc.data().members?.includes(uid)) {
  throw new HttpsError('permission-denied', 'NOT_CHAT_MEMBER');
}
```

### 3.8 AI Consent Checks

```javascript
const aiCheck = await verifyAIEnabled(uid, 'memoryAssistant');
if (!aiCheck.enabled) {
  throw new HttpsError('failed-precondition', aiCheck.reason);
}
```

### 3.9 Rate Limit Checks

```javascript
// 20 requests per day
const dateKey = new Date().toISOString().slice(0, 10);
const windowId = `memoryAssistant_daily_${dateKey}`;
// Transaction: check count < 20, increment
```

### 3.10 Sensitive Data Checks

```javascript
// Check caption
if (caption && containsSensitiveData(caption)) {
  throw new HttpsError('invalid-argument', 'SENSITIVE_DATA_DETECTED');
}

// Check messages
for (const msgId of messageIds || []) {
  const msgDoc = await db.doc(`chats/${chatId}/messages/${msgId}`).get();
  if (msgDoc.exists && containsSensitiveData(msgDoc.data().text || '')) {
    throw new HttpsError('invalid-argument', 'SENSITIVE_DATA_DETECTED');
  }
}
```

### 3.11 Firestore Writes

1. `/chats/{chatId}/aiRuns/{runId}` - always (no caption/messages stored)
2. `/chats/{chatId}/aiSuggestions/{suggestionId}` - on success
3. `/users/{uid}/aiUsage/{windowId}` - rate limit

### 3.12 Security Rule Additions

```javascript
function validMemoryAssistantAcceptedPayload() {
  let payload = request.resource.data.acceptedPayload;
  return payload.keys().hasOnly(['title', 'description'])
    && payload.title is string
    && payload.title.size() <= 100
    && payload.description is string
    && payload.description.size() <= 500;
}
```

### 3.13 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MemoryAiButton` | `src/chat/MemoryAiButton.jsx` | Button in create form |
| `MemoryAiSuggestion` | `src/chat/MemoryAiSuggestion.jsx` | Display/edit suggestion |

**Integration:** `src/chat/Memories.jsx` - add button in "Create Memory" form

**Flow:**
1. User opens Create Memory
2. Enters caption OR selects messages for context
3. Clicks "✨ AI Describe"
4. Loading indicator
5. Suggestion fills title/description
6. User can edit before clicking Save
7. User must click Save - NO auto-save

### 3.14 AI Prompt Template

```javascript
const MEMORY_ASSISTANT_SYSTEM = `You are a thoughtful assistant helping people document meaningful memories.

RULES:
1. Return ONLY valid JSON
2. Create warm, personal titles (not generic)
3. Descriptions should capture emotional essence
4. Do not include sensitive data
5. Do not make assumptions about relationship status
6. If insufficient context, return no_suggestion
7. Keep titles under 50 characters
8. Keep descriptions under 200 characters
9. Only suggest dates if clearly mentioned
10. Be sentimental but not dramatic

OUTPUT FORMAT:
{
  "title": "short evocative title",
  "description": "warm description",
  "suggestedDate": "YYYY-MM-DD" or null,
  "mood": "happy|romantic|peaceful|adventurous|cozy|celebratory" or null,
  "confidence": 0.0 to 1.0
}

If cannot help:
{
  "title": null,
  "description": null,
  "suggestedDate": null,
  "mood": null,
  "confidence": 0,
  "no_suggestion": true
}`;

function buildMemoryAssistantPrompt({ caption, contextMessages, today }) {
  let prompt = `Help describe this memory for a couple's shared memory book.

${caption ? `USER CAPTION: ${caption}` : 'No caption provided.'}

${contextMessages?.length ? `RELATED MESSAGES:\n${contextMessages.join('\n')}` : ''}

TODAY: ${today}

Generate a warm title and description. Return JSON only.`;
  return prompt;
}
```

### 3.15 Unit Tests

```javascript
describe('aiMemoryAssistant', () => {
  // Input validation
  it('throws INVALID_INPUT when no caption and no messageIds');
  it('throws INSUFFICIENT_CONTEXT for very short caption with no messages');
  it('throws MESSAGE_NOT_FOUND for invalid messageId');
  
  // Auth & membership
  it('throws unauthenticated when not logged in');
  it('throws NOT_CHAT_MEMBER for non-member');
  
  // AI consent
  it('throws AI_NOT_ENABLED when aiEnabled=false');
  it('throws FEATURE_NOT_ENABLED when features.memoryAssistant=false');
  
  // Rate limiting
  it('throws RATE_LIMIT_EXCEEDED after 20 requests/day');
  
  // Sensitive data
  it('throws SENSITIVE_DATA_DETECTED for SSN in caption');
  it('throws SENSITIVE_DATA_DETECTED for credit card in message');
  
  // Success cases
  it('returns suggestion from caption only');
  it('returns suggestion from messages only');
  it('returns suggestion from caption + messages');
  
  // Firestore
  it('does not store caption in aiRuns');
  it('does not store message text in aiRuns');
  it('uses flat aiUsage schema');
  
  // Phase 2 scope
  it('does not accept imageUrl parameter');
});
```

### 3.16 Emulator Security Tests

```javascript
describe('AI Memory Assistant Rules', () => {
  it('targetUserId can read own suggestion');
  it('non-target cannot read');
  it('client cannot create');
  it('client cannot delete');
  it('targetUserId can update status');
  it('cannot modify suggestedPayload');
  it('acceptedPayload must have only title and description');
  it('acceptedPayload.title max 100 chars');
  it('acceptedPayload.description max 500 chars');
});
```

### 3.17 Manual Two-User Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Button in create form | Open Memories -> Create | ✨ AI Describe visible |
| 2 | Button hidden when AI off | Disable AI | No ✨ button |
| 3 | Generate from caption | Enter caption -> ✨ | Title/description filled |
| 4 | Generate from messages | Select messages -> ✨ | Title/description filled |
| 5 | User edits before save | Modify title -> Save | Edited version saved |
| 6 | No auto-save | Generate suggestion | Memory NOT created |
| 7 | Manual save required | Click Save | Memory created |
| 8 | Both users see memory | User A saves | User B sees in Memories |
| 9 | Rate limit | 21 uses in 1 day | Error on 21st |

### 3.18 Rollback Plan

1. Kill switch: `AI_ENABLED=false`
2. Feature toggle: `features.memoryAssistant=false`
3. Full rollback: Revert frontend

---

## Rate Limit Summary

| Feature | Limit | Window | windowId Pattern |
|---------|-------|--------|------------------|
| toneRepair (MVP) | 10 | hour | `toneRepair_hourly_{YYYY-MM-DDTHH}` |
| messageToTask (MVP) | 20 | day | `messageToTask_daily_{YYYY-MM-DD}` |
| misunderstandingHelper | 10 | hour | `misunderstandingHelper_hourly_{YYYY-MM-DDTHH}` |
| gentleFollowup | 15 | day | `gentleFollowup_daily_{YYYY-MM-DD}` |
| memoryAssistant | 20 | day | `memoryAssistant_daily_{YYYY-MM-DD}` |

---

## Approval Checklist

| Item | Approved | Notes |
|------|----------|-------|
| Uses existing AI settings schema (aiEnabled, features, dataSharing) | [ ] | |
| Uses flat aiUsage schema (windowId, feature, count, etc.) | [ ] | |
| Reuses MVP aiSuggestions security model | [ ] | |
| acceptedPayload validation per type | [ ] | |
| Standardized type names (snake_case) | [ ] | |
| User-triggered only (no background) | [ ] | |
| No auto-send | [ ] | |
| No auto-save | [ ] | |
| No raw content in aiRuns | [ ] | |
| Memory Assistant: no image URLs to AI | [ ] | |
| Gentle Follow-up: from pending items only | [ ] | |
| Rate limits appropriate | [ ] | |
| Kill switch works | [ ] | |
| MVP features unaffected | [ ] | |
| Non-AI features unaffected | [ ] | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Security Reviewer | | | |
| Product Owner | | | |

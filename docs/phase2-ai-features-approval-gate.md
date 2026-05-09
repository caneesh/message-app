# Phase 2 AI Features - Implementation Approval Gate

## Overview

| Feature | Purpose | Trigger |
|---------|---------|---------|
| Misunderstanding Helper | Suggests clarification message when conflict detected | User clicks "✨ AI Help" in Clear the Air |
| Gentle Follow-up Generator | Drafts polite follow-up for unanswered messages | User clicks "✨ AI Follow-up" on message |
| Memory Assistant | Suggests memory title/description from photos/messages | User clicks "✨ AI Describe" when creating memory |

---

## Feature 1: Misunderstanding Helper

### 1.1 Firestore Schema

```
/chats/{chatId}/aiSuggestions/{suggestionId}
{
  type: "misunderstanding_helper",           // string, immutable
  requestedByUserId: string,                 // UID of requester
  targetUserId: string,                      // same as requester
  sourceMessageId: string | null,            // optional linked message
  sourceTextPreview: string,                 // sanitized preview (max 100 chars)
  generatedBy: "anthropic",                  // provider
  generatedByFunction: "aiMisunderstandingHelper",
  suggestedPayload: {
    clarificationText: string,               // max 2000 chars
    issueIdentified: string,                 // max 500 chars
    suggestedApproach: string,               // max 500 chars
  },
  confidence: number,                        // 0.0-1.0
  status: "pending" | "accepted" | "dismissed" | "expired",
  acceptedPayload: object | null,            // user-modified version
  reviewedBy: string | null,                 // UID
  reviewedAt: timestamp | null,
  dismissReason: string | null,
  createdAt: timestamp,
  expiresAt: timestamp,                      // +10 minutes
}

/chats/{chatId}/aiRuns/{runId}
{
  requestedByUserId: string,
  feature: "misunderstandingHelper",
  functionName: "aiMisunderstandingHelper",
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
  // NO raw content stored
}

/users/{userId}/aiUsage/{windowId}
{
  misunderstandingHelper: {
    count: number,
    firstRequestAt: timestamp,
  },
  // existing fields preserved
}
```

### 1.2 Cloud Function Contract

```
Function: aiMisunderstandingHelper
Type: onCall (v2)
Secrets: [AI_API_KEY]
```

### 1.3 Input JSON

```json
{
  "chatId": "string (required)",
  "misunderstandingId": "string (required) - ID from misunderstandings collection",
  "contextMessageIds": ["string"] // optional, max 5
}
```

### 1.4 Output JSON

**Success:**
```json
{
  "success": true,
  "suggestionId": "string",
  "suggestion": {
    "clarificationText": "string (max 2000)",
    "issueIdentified": "string (max 500)",
    "suggestedApproach": "string (max 500)",
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
| `AI_TEMPORARILY_DISABLED` | 503 | Server-side kill switch active |
| `INVALID_INPUT` | 400 | Missing/invalid chatId or misunderstandingId |
| `MISUNDERSTANDING_NOT_FOUND` | 404 | Misunderstanding document doesn't exist |
| `NOT_CHAT_MEMBER` | 403 | User not in chat members array |
| `AI_NOT_ENABLED` | 412 | User hasn't consented to AI |
| `FEATURE_NOT_ENABLED` | 412 | misunderstandingHelper feature disabled |
| `RATE_LIMIT_EXCEEDED` | 429 | Exceeded 10/hour limit |
| `SENSITIVE_DATA_DETECTED` | 400 | Input contains PII |
| `AI_TIMEOUT` | 504 | AI provider timeout |
| `AI_PROVIDER_ERROR` | 500 | AI provider failure |

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
const settingsDoc = await db.doc(`users/${uid}/settings/ai`).get();
if (!settingsDoc.exists || !settingsDoc.data().enabled) {
  throw new HttpsError('failed-precondition', 'AI_NOT_ENABLED');
}
if (settingsDoc.data().features?.misunderstandingHelper === false) {
  throw new HttpsError('failed-precondition', 'FEATURE_NOT_ENABLED');
}
```

### 1.9 Rate Limit Checks

```javascript
// 10 requests per hour per user
const windowId = `misunderstandingHelper_${uid}_${hourKey}`;
const usageRef = db.doc(`users/${uid}/aiUsage/${windowId}`);
// Transaction: check count < 10, increment
```

### 1.10 Sensitive Data Checks

```javascript
const SENSITIVE_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/,        // SSN
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
  /\bpassword\s*[:=]\s*\S+/i,     // Password
];
function containsSensitiveData(text) {
  return SENSITIVE_PATTERNS.some(p => p.test(text));
}
// Check: misunderstanding description + context messages
```

### 1.11 Firestore Writes

1. `/chats/{chatId}/aiRuns/{runId}` - always (metadata only)
2. `/chats/{chatId}/aiSuggestions/{suggestionId}` - on success
3. `/users/{uid}/aiUsage/{windowId}` - rate limit counter

### 1.12 Security Rule Additions

```javascript
match /chats/{chatId}/misunderstandings/{misId} {
  // Existing rules - no change needed
}

// aiSuggestions already has rules from MVP
// Add type validation for misunderstanding_helper:
match /chats/{chatId}/aiSuggestions/{suggestionId} {
  allow read: if isChatMember(chatId);
  allow create: if false; // server only
  allow update: if isChatMember(chatId)
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['status', 'acceptedPayload', 'reviewedBy', 'reviewedAt', 'dismissReason'])
    && request.resource.data.status in ['accepted', 'dismissed']
    && resource.data.type == request.resource.data.type;
  allow delete: if false;
}
```

### 1.13 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MisunderstandingAiButton` | `src/chat/MisunderstandingAiButton.jsx` | Trigger button in Clear the Air |
| `MisunderstandingAiSuggestion` | `src/chat/MisunderstandingAiSuggestion.jsx` | Display suggestion with Accept/Edit/Dismiss |

**Integration point:** `src/chat/Misunderstandings.jsx` - add button to unresolved items

**State flow:**
1. User clicks "✨ AI Help" on misunderstanding
2. Loading state shown
3. Suggestion panel appears with clarificationText
4. User can Accept (copies to input), Edit, or Dismiss
5. No auto-send - user must manually send

### 1.14 AI Prompt Template

```javascript
const MISUNDERSTANDING_HELPER_SYSTEM = `You are a caring relationship communication assistant. 
Your role is to help people resolve misunderstandings with their partner through gentle, empathetic clarification.

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

Suggest a gentle clarification message the user could send. Return JSON only.`;
}
```

### 1.15 Unit Tests

```javascript
// functions/test/aiMisunderstandingHelper.test.js
describe('aiMisunderstandingHelper', () => {
  it('returns suggestion for valid misunderstanding');
  it('throws INVALID_INPUT for missing chatId');
  it('throws INVALID_INPUT for missing misunderstandingId');
  it('throws MISUNDERSTANDING_NOT_FOUND for nonexistent misunderstanding');
  it('throws NOT_CHAT_MEMBER for non-member');
  it('throws AI_NOT_ENABLED when consent not given');
  it('throws FEATURE_NOT_ENABLED when feature toggled off');
  it('throws RATE_LIMIT_EXCEEDED after 10 requests/hour');
  it('throws SENSITIVE_DATA_DETECTED for SSN in description');
  it('returns NO_SUGGESTION when AI cannot help');
  it('filters AI output containing sensitive data');
  it('creates aiRun document on every call');
  it('creates aiSuggestion only on success');
  it('does not store raw description in aiRuns');
  it('respects AI_ENABLED=false kill switch');
});
```

### 1.16 Emulator Security Tests

```javascript
// test/firestore.rules.test.js - additions
describe('AI Misunderstanding Helper Rules', () => {
  it('chat member can read aiSuggestion with type misunderstanding_helper');
  it('non-member cannot read aiSuggestion');
  it('client cannot create aiSuggestion');
  it('client cannot delete aiSuggestion');
  it('member can update status to accepted');
  it('member can update status to dismissed');
  it('member cannot update status to expired');
  it('member cannot modify suggestedPayload');
  it('member cannot modify type');
});
```

### 1.17 Manual Two-User Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Button hidden when AI disabled | User A disables AI -> opens Clear the Air | No ✨ button |
| 2 | Button shown when AI enabled | User A enables AI -> opens Clear the Air | ✨ AI Help button visible |
| 3 | Extract suggestion | Click ✨ AI Help on misunderstanding | Loading -> suggestion appears |
| 4 | Accept suggestion | Click Accept | Text copied to message input |
| 5 | User must send manually | After Accept | Message NOT auto-sent |
| 6 | Dismiss suggestion | Click Dismiss | Panel closes, suggestion marked dismissed |
| 7 | Edit before accept | Modify text -> Accept | Modified text used |
| 8 | Rate limit | Use 11 times in 1 hour | Error on 11th |
| 9 | Sensitive data rejected | Misunderstanding with SSN | Error shown |
| 10 | User B sees sent message | User A accepts + sends | User B sees normal message |

### 1.18 Rollback Plan

1. **Immediate:** Set `AI_ENABLED=false` in Firebase config -> all AI features disabled
2. **Feature-specific:** 
   - Remove `misunderstandingHelper` from user's `features` object
   - UI button won't render
3. **Full rollback:**
   - Revert frontend deployment to pre-Phase-2
   - Functions continue to run (harmless if not called)
   - No data migration needed

---

## Feature 2: Gentle Follow-up Generator

### 2.1 Firestore Schema

```
/chats/{chatId}/aiSuggestions/{suggestionId}
{
  type: "gentle_followup",
  requestedByUserId: string,
  targetUserId: string,
  sourceMessageId: string,                   // required - message to follow up on
  sourceTextPreview: string,                 // max 100 chars
  generatedBy: "anthropic",
  generatedByFunction: "aiGentleFollowup",
  suggestedPayload: {
    followupText: string,                    // max 1000 chars
    tone: "gentle" | "caring" | "patient",
    timeSinceOriginal: string,               // "2 days ago"
  },
  confidence: number,
  status: "pending" | "accepted" | "dismissed" | "expired",
  acceptedPayload: object | null,
  reviewedBy: string | null,
  reviewedAt: timestamp | null,
  dismissReason: string | null,
  createdAt: timestamp,
  expiresAt: timestamp,                      // +5 minutes
}

/chats/{chatId}/aiRuns/{runId}
{
  requestedByUserId: string,
  feature: "gentleFollowup",
  functionName: "aiGentleFollowup",
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
}

/users/{userId}/aiUsage/{windowId}
{
  gentleFollowup: {
    count: number,
    firstRequestAt: timestamp,
  },
}
```

### 2.2 Cloud Function Contract

```
Function: aiGentleFollowup
Type: onCall (v2)
Secrets: [AI_API_KEY]
```

### 2.3 Input JSON

```json
{
  "chatId": "string (required)",
  "messageId": "string (required) - message to follow up on",
  "tone": "gentle" | "caring" | "patient" // optional, default "gentle"
}
```

### 2.4 Output JSON

**Success:**
```json
{
  "success": true,
  "suggestionId": "string",
  "suggestion": {
    "followupText": "string (max 1000)",
    "tone": "gentle",
    "timeSinceOriginal": "2 days ago",
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
  "reason": "NO_FOLLOWUP_NEEDED" | "MESSAGE_TOO_RECENT" | "AI_OUTPUT_FILTERED"
}
```

### 2.5 Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `AI_TEMPORARILY_DISABLED` | 503 | Kill switch active |
| `INVALID_INPUT` | 400 | Missing chatId/messageId |
| `MESSAGE_NOT_FOUND` | 404 | Message doesn't exist |
| `NOT_YOUR_MESSAGE` | 403 | Can only follow up on own messages |
| `NOT_CHAT_MEMBER` | 403 | User not in chat |
| `AI_NOT_ENABLED` | 412 | No AI consent |
| `FEATURE_NOT_ENABLED` | 412 | gentleFollowup disabled |
| `RATE_LIMIT_EXCEEDED` | 429 | Exceeded 15/day |
| `SENSITIVE_DATA_DETECTED` | 400 | PII in message |
| `AI_TIMEOUT` | 504 | Provider timeout |
| `AI_PROVIDER_ERROR` | 500 | Provider failure |

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
const settings = await db.doc(`users/${uid}/settings/ai`).get();
if (!settings.exists || !settings.data().enabled) {
  throw new HttpsError('failed-precondition', 'AI_NOT_ENABLED');
}
if (settings.data().features?.gentleFollowup === false) {
  throw new HttpsError('failed-precondition', 'FEATURE_NOT_ENABLED');
}
```

### 2.9 Rate Limit Checks

```javascript
// 15 requests per day per user
const windowId = `gentleFollowup_${uid}_${dateKey}`;
// Transaction: check count < 15, increment
```

### 2.10 Sensitive Data Checks

```javascript
// Check original message text
if (containsSensitiveData(messageData.text)) {
  throw new HttpsError('invalid-argument', 'SENSITIVE_DATA_DETECTED');
}
```

### 2.11 Firestore Writes

1. `/chats/{chatId}/aiRuns/{runId}` - always
2. `/chats/{chatId}/aiSuggestions/{suggestionId}` - on success
3. `/users/{uid}/aiUsage/{windowId}` - rate limit

### 2.12 Security Rule Additions

```javascript
// Same pattern as misunderstanding_helper
// Type validation for gentle_followup in aiSuggestions update rule
```

### 2.13 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `FollowupAiButton` | `src/chat/FollowupAiButton.jsx` | Button in message context menu |
| `FollowupAiSuggestion` | `src/chat/FollowupAiSuggestion.jsx` | Suggestion display panel |

**Integration point:** `src/chat/MessageList.jsx` - add to message action menu for user's own messages older than 1 hour

**Visibility rules:**
- Only on user's own messages
- Only when message is > 1 hour old
- Only when no reply received after that message

### 2.14 AI Prompt Template

```javascript
const GENTLE_FOLLOWUP_SYSTEM = `You are a thoughtful communication assistant helping people follow up on unanswered messages in a kind, non-pressuring way.

RULES:
1. Return ONLY valid JSON
2. Never guilt-trip or pressure
3. Acknowledge the other person may be busy
4. Keep followups brief (under 150 words)
5. Do not repeat the original message verbatim
6. Do not include sensitive data
7. If the original message doesn't warrant a followup, return no_suggestion
8. Match the relationship tone (casual for friends/partners)

TONES:
- gentle: soft reminder, very low pressure
- caring: shows concern, checks in
- patient: explicitly non-urgent, understanding

OUTPUT FORMAT:
{
  "followupText": "suggested followup message",
  "tone": "gentle|caring|patient",
  "timeSinceOriginal": "human readable time",
  "confidence": 0.0 to 1.0
}

If no followup needed:
{
  "followupText": null,
  "tone": null,
  "timeSinceOriginal": null,
  "confidence": 0,
  "no_suggestion": true
}`;

function buildGentleFollowupPrompt({ originalText, timeSince, tone, today }) {
  return `Suggest a ${tone} follow-up for this unanswered message.

ORIGINAL MESSAGE (sent ${timeSince}):
${originalText}

TODAY: ${today}

Return JSON only.`;
}
```

### 2.15 Unit Tests

```javascript
describe('aiGentleFollowup', () => {
  it('returns suggestion for valid unanswered message');
  it('throws INVALID_INPUT for missing chatId');
  it('throws MESSAGE_NOT_FOUND for nonexistent message');
  it('throws NOT_YOUR_MESSAGE when following up others message');
  it('throws NOT_CHAT_MEMBER for non-member');
  it('throws AI_NOT_ENABLED without consent');
  it('throws RATE_LIMIT_EXCEEDED after 15/day');
  it('throws SENSITIVE_DATA_DETECTED for credit card');
  it('returns NO_FOLLOWUP_NEEDED for recent messages');
  it('does not store original text in aiRuns');
  it('respects kill switch');
});
```

### 2.16 Emulator Security Tests

```javascript
describe('AI Gentle Followup Rules', () => {
  it('member can read aiSuggestion type gentle_followup');
  it('non-member cannot read');
  it('client cannot create');
  it('member can update status to accepted/dismissed');
  it('member cannot modify suggestedPayload');
});
```

### 2.17 Manual Two-User Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Button on own old message | User A message > 1hr old, no reply | ✨ Follow-up button visible |
| 2 | Button hidden on recent | User A message < 1hr old | No button |
| 3 | Button hidden on partner's | User B's message | No button for User A |
| 4 | Button hidden after reply | User A message, User B replied | No button |
| 5 | Generate followup | Click ✨ Follow-up | Suggestion appears |
| 6 | Accept | Accept suggestion | Text in input, NOT sent |
| 7 | Send manually | After accept, click Send | Message sent normally |
| 8 | Rate limit | 16 followups in 1 day | Error on 16th |

### 2.18 Rollback Plan

Same as Feature 1:
1. Kill switch: `AI_ENABLED=false`
2. Feature toggle: remove `gentleFollowup` from features
3. Full rollback: revert frontend

---

## Feature 3: Memory Assistant

### 3.1 Firestore Schema

```
/chats/{chatId}/aiSuggestions/{suggestionId}
{
  type: "memory_assistant",
  requestedByUserId: string,
  targetUserId: string,
  sourceMessageId: string | null,            // if from message
  sourceTextPreview: string,                 // sanitized
  generatedBy: "anthropic",
  generatedByFunction: "aiMemoryAssistant",
  suggestedPayload: {
    title: string,                           // max 100 chars
    description: string,                     // max 500 chars
    suggestedDate: string | null,            // YYYY-MM-DD
    detectedPeople: string[],                // max 5
    mood: string | null,                     // "happy", "romantic", etc.
  },
  confidence: number,
  status: "pending" | "accepted" | "dismissed" | "expired",
  acceptedPayload: object | null,
  reviewedBy: string | null,
  reviewedAt: timestamp | null,
  dismissReason: string | null,
  createdAt: timestamp,
  expiresAt: timestamp,                      // +10 minutes
}

/chats/{chatId}/aiRuns/{runId}
{
  requestedByUserId: string,
  feature: "memoryAssistant",
  functionName: "aiMemoryAssistant",
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
  // NO image URLs or descriptions stored
}

/users/{userId}/aiUsage/{windowId}
{
  memoryAssistant: {
    count: number,
    firstRequestAt: timestamp,
  },
}
```

### 3.2 Cloud Function Contract

```
Function: aiMemoryAssistant
Type: onCall (v2)
Secrets: [AI_API_KEY]
```

### 3.3 Input JSON

```json
{
  "chatId": "string (required)",
  "imageUrl": "string (optional) - Firebase Storage URL",
  "caption": "string (optional) - user-provided context",
  "messageIds": ["string"] // optional - related messages for context
}
```

### 3.4 Output JSON

**Success:**
```json
{
  "success": true,
  "suggestionId": "string",
  "suggestion": {
    "title": "Beach sunset with Sarah",
    "description": "A beautiful evening watching the sunset at Malibu...",
    "suggestedDate": "2024-03-15",
    "detectedPeople": ["Sarah"],
    "mood": "romantic",
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
  "reason": "NO_SUGGESTION" | "IMAGE_ANALYSIS_FAILED" | "AI_OUTPUT_FILTERED"
}
```

### 3.5 Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `AI_TEMPORARILY_DISABLED` | 503 | Kill switch |
| `INVALID_INPUT` | 400 | No imageUrl or messageIds provided |
| `IMAGE_NOT_FOUND` | 404 | Image URL invalid/inaccessible |
| `IMAGE_TOO_LARGE` | 400 | Image > 10MB |
| `NOT_CHAT_MEMBER` | 403 | Not in chat |
| `AI_NOT_ENABLED` | 412 | No consent |
| `FEATURE_NOT_ENABLED` | 412 | memoryAssistant disabled |
| `RATE_LIMIT_EXCEEDED` | 429 | Exceeded 20/day |
| `SENSITIVE_DATA_DETECTED` | 400 | PII in caption |
| `AI_TIMEOUT` | 504 | Timeout |
| `AI_PROVIDER_ERROR` | 500 | Provider error |

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
const settings = await db.doc(`users/${uid}/settings/ai`).get();
if (!settings.exists || !settings.data().enabled) {
  throw new HttpsError('failed-precondition', 'AI_NOT_ENABLED');
}
if (settings.data().features?.memoryAssistant === false) {
  throw new HttpsError('failed-precondition', 'FEATURE_NOT_ENABLED');
}
```

### 3.9 Rate Limit Checks

```javascript
// 20 requests per day (image analysis is expensive)
const windowId = `memoryAssistant_${uid}_${dateKey}`;
// Transaction: check count < 20, increment
```

### 3.10 Sensitive Data Checks

```javascript
// Check caption text only (can't scan images server-side without vision API)
if (caption && containsSensitiveData(caption)) {
  throw new HttpsError('invalid-argument', 'SENSITIVE_DATA_DETECTED');
}
// Note: AI prompt instructs not to include sensitive details in output
```

### 3.11 Firestore Writes

1. `/chats/{chatId}/aiRuns/{runId}` - always (no image URL stored)
2. `/chats/{chatId}/aiSuggestions/{suggestionId}` - on success
3. `/users/{uid}/aiUsage/{windowId}` - rate limit

### 3.12 Security Rule Additions

```javascript
// Same pattern - type validation for memory_assistant
```

### 3.13 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MemoryAiButton` | `src/chat/MemoryAiButton.jsx` | Button in memory creation form |
| `MemoryAiSuggestion` | `src/chat/MemoryAiSuggestion.jsx` | Suggestion display with fields |

**Integration point:** `src/chat/Memories.jsx` - add button in "Create Memory" form

**Flow:**
1. User opens Create Memory
2. Uploads photo or selects message
3. Clicks "✨ AI Describe"
4. Suggestion fills title/description fields
5. User can edit before saving
6. User must click Save - no auto-save

### 3.14 AI Prompt Template

```javascript
const MEMORY_ASSISTANT_SYSTEM = `You are a thoughtful assistant helping people document meaningful memories with their loved ones.

RULES:
1. Return ONLY valid JSON
2. Create warm, personal titles (not generic)
3. Descriptions should capture the emotional essence
4. Do not include sensitive data (addresses, IDs, etc.)
5. Do not make assumptions about relationship status
6. If you cannot generate meaningful content, return no_suggestion
7. Keep titles under 50 characters
8. Keep descriptions under 200 characters
9. Only suggest dates if clearly evident
10. Be sentimental but not overly dramatic

OUTPUT FORMAT:
{
  "title": "short evocative title",
  "description": "warm description of the moment",
  "suggestedDate": "YYYY-MM-DD" or null,
  "detectedPeople": ["name1", "name2"] or [],
  "mood": "happy|romantic|peaceful|adventurous|cozy|celebratory" or null,
  "confidence": 0.0 to 1.0
}

If cannot help:
{
  "title": null,
  "description": null,
  "suggestedDate": null,
  "detectedPeople": [],
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

**Note:** For image analysis, use Claude's vision capability:
```javascript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 500,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'url', url: imageUrl } },
      { type: 'text', text: prompt }
    ]
  }]
});
```

### 3.15 Unit Tests

```javascript
describe('aiMemoryAssistant', () => {
  it('returns suggestion for image with caption');
  it('returns suggestion for messages without image');
  it('throws INVALID_INPUT when no image or messages');
  it('throws IMAGE_NOT_FOUND for invalid URL');
  it('throws IMAGE_TOO_LARGE for > 10MB');
  it('throws NOT_CHAT_MEMBER for non-member');
  it('throws AI_NOT_ENABLED without consent');
  it('throws RATE_LIMIT_EXCEEDED after 20/day');
  it('throws SENSITIVE_DATA_DETECTED for SSN in caption');
  it('does not store image URL in aiRuns');
  it('respects kill switch');
});
```

### 3.16 Emulator Security Tests

```javascript
describe('AI Memory Assistant Rules', () => {
  it('member can read aiSuggestion type memory_assistant');
  it('non-member cannot read');
  it('client cannot create');
  it('member can update status');
  it('member cannot modify suggestedPayload');
});
```

### 3.17 Manual Two-User Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Button in create form | Open Create Memory | ✨ AI Describe button visible |
| 2 | Generate from photo | Upload photo -> ✨ AI Describe | Title/description populated |
| 3 | Generate from caption | Enter caption -> ✨ AI Describe | Suggestion based on caption |
| 4 | User edits before save | Edit suggestion -> Save | Edited version saved |
| 5 | No auto-save | Generate suggestion | Memory NOT created until Save clicked |
| 6 | Dismiss | Click Dismiss | Fields cleared |
| 7 | Rate limit | 21 uses in 1 day | Error on 21st |
| 8 | Both users see memory | User A saves | User B sees in memories |

### 3.18 Rollback Plan

Same pattern:
1. Kill switch
2. Feature toggle
3. Full rollback

---

## Global Requirements

### AI Settings Panel Updates

Add to `src/chat/AiSettingsPanel.jsx`:
```javascript
features: {
  toneRepair: true,        // existing
  messageToTask: true,     // existing
  misunderstandingHelper: true,  // new
  gentleFollowup: true,          // new
  memoryAssistant: true,         // new
}
```

### Firestore Rules Update Summary

```javascript
// users/{userId}/settings/ai - add new feature fields
allow write: if isOwner(userId)
  && request.resource.data.keys().hasOnly([
    'enabled', 'consentedAt', 'features', 'updatedAt'
  ])
  && request.resource.data.features.keys().hasOnly([
    'toneRepair', 'messageToTask', 
    'misunderstandingHelper', 'gentleFollowup', 'memoryAssistant'
  ]);
```

### Rate Limit Summary

| Feature | Limit | Window |
|---------|-------|--------|
| toneRepair | 10 | hour |
| messageToTask | 20 | day |
| misunderstandingHelper | 10 | hour |
| gentleFollowup | 15 | day |
| memoryAssistant | 20 | day |

### Estimated Token Usage

| Feature | Input | Output | Cost/call |
|---------|-------|--------|-----------|
| misunderstandingHelper | ~500 | ~400 | ~$0.003 |
| gentleFollowup | ~300 | ~200 | ~$0.002 |
| memoryAssistant (text) | ~400 | ~300 | ~$0.002 |
| memoryAssistant (image) | ~1000 | ~300 | ~$0.005 |

---

## Approval Checklist

| Item | Approved | Notes |
|------|----------|-------|
| Firestore schemas reviewed | [ ] | |
| Function contracts reviewed | [ ] | |
| Error handling complete | [ ] | |
| Security rules sufficient | [ ] | |
| Rate limits appropriate | [ ] | |
| No raw content in aiRuns | [ ] | |
| User-triggered only | [ ] | |
| No auto-send | [ ] | |
| No auto-save | [ ] | |
| Kill switch works | [ ] | |
| MVP features unaffected | [ ] | |
| Non-AI features unaffected | [ ] | |
| Rollback plan tested | [ ] | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Security Reviewer | | | |
| Product Owner | | | |

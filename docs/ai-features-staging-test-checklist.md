# MVP AI Features - Manual Staging Test Checklist

## Test Environment Setup

| Item | Value |
|------|-------|
| **User A** | Authenticated chat member (primary tester) |
| **User B** | Authenticated chat member (secondary tester) |
| **Environment** | Staging with Firebase emulators or staging project |
| **Date** | ____________ |
| **Tester** | ____________ |

---

## 1. Baseline Chat Regression

Verify existing features still work before testing AI.

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| 1.1 | Send normal text | User A types "Hello world" and clicks Send | Message appears in chat for both users | ☐ | |
| 1.2 | Send emoji | User A sends "👋🎉" | Emoji renders correctly for both users | ☐ | |
| 1.3 | Reply to message | User A long-presses User B's message → Reply → Types response → Send | Reply shows quoted preview of original message | ☐ | |
| 1.4 | Delete own message | User A sends message → Clicks delete → Confirms | Message removed for both users | ☐ | |
| 1.5 | Cannot delete friend's message | User A attempts to delete User B's message | Delete button not shown OR action blocked | ☐ | |
| 1.6 | File/photo sharing | User A clicks attach → Selects image → Sends | Image uploads and displays for both users | ☐ | Skip if not implemented |
| 1.7 | Manual reminder creation | User A opens Reminders → Creates "Test reminder" with due date | Reminder appears in list for both users | ☐ | |
| 1.8 | Local tone repair (💝) | User A types "Why didn't you do this?" → Clicks 💝 → Make softer | Local suggestion appears (no AI call) | ☐ | |

---

## 2. AI Disabled Behavior

Verify graceful degradation when AI is off.

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| 2.1 | Default AI state | User A opens Settings → AI Features section | AI master toggle is OFF by default | ☐ | |
| 2.2 | AI tone button hidden | With AI disabled, User A types 10+ characters | ✨ AI button does NOT appear (only 💝 local button shows) | ☐ | |
| 2.3 | AI task extraction hidden | With AI disabled, User A opens message menu (⋯) | "✨ AI Extract Tasks" either hidden or shows "Enable AI in Settings" | ☐ | |
| 2.4 | Local tone still works | With AI disabled, User A types harsh message → Clicks 💝 | Local tone suggestions work normally | ☐ | |
| 2.5 | No errors in console | With AI disabled, navigate through app | No AI-related errors in browser console | ☐ | |

---

## 3. AI Settings

Test consent flow and settings persistence.

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| 3.1 | Settings section visible | User A opens Settings | "AI Features" section is visible | ☐ | |
| 3.2 | Default all toggles off | Check initial state | Master toggle OFF, no consent recorded | ☐ | |
| 3.3 | Consent flow appears | User A clicks "Enable AI Features" | Consent dialog appears with privacy explanation | ☐ | |
| 3.4 | Consent lists data usage | Read consent text | Mentions: Anthropic Claude, message processing, no storage after suggestion, sensitive data filtering | ☐ | |
| 3.5 | Cancel consent | User A clicks Cancel on consent dialog | Returns to disabled state, no consent recorded | ☐ | |
| 3.6 | Accept consent | User A clicks "I Agree, Enable AI" | Master toggle turns ON, "AI Features Enabled" badge shows | ☐ | |
| 3.7 | Individual feature toggles | After enabling, check feature toggles | "Tone Repair" and "Message to Task" toggles visible and ON by default | ☐ | |
| 3.8 | Disable individual feature | User A unchecks "Tone Repair" | Toggle saves, ✨ button should hide | ☐ | |
| 3.9 | Re-enable individual feature | User A checks "Tone Repair" again | Toggle saves, ✨ button should reappear | ☐ | |
| 3.10 | Settings persist on refresh | User A refreshes page | AI enabled state and toggle states persist | ☐ | |
| 3.11 | Disable AI entirely | User A clicks "Disable AI Features" | Master toggle OFF, returns to consent-required state | ☐ | |

---

## 4. AI Tone Repair

Test the AI-powered message softening feature.

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| 4.1 | AI button appears | User A enables AI → Types "Why didn't you do this?" (10+ chars) | ✨ button appears next to 💝 button | ☐ | |
| 4.2 | Click AI soften | User A clicks ✨ button | Loading indicator shows briefly | ☐ | |
| 4.3 | Suggestion appears | Wait for AI response | Softened suggestion appears in suggestion box | ☐ | |
| 4.4 | Suggestion is softer | Review suggested text | Text is rephrased more gently (e.g., "Just checking — were you able to...") | ☐ | |
| 4.5 | Accept suggestion | User A clicks "Accept" | Draft input updates to suggested text | ☐ | |
| 4.6 | Send accepted message | User A clicks Send | Message sends successfully | ☐ | |
| 4.7 | User B sees normal message | User B checks chat | Sees the softened message as normal text (no AI indicators) | ☐ | |
| 4.8 | No suggestion leak | User B checks message and any menus | No indication this was AI-assisted, no aiSuggestion visible | ☐ | |
| 4.9 | Keep Original option | User A types harsh message → ✨ → "Keep Original" | Original draft restored, suggestion dismissed | ☐ | |
| 4.10 | Multiple suggestions | User A uses AI soften on different messages multiple times | Each works independently | ☐ | |
| 4.11 | Empty/short message | User A types "Hi" (< 5 chars) | ✨ button does not appear | ☐ | |

---

## 5. Message-to-Task (AI Task Extraction)

Test AI-powered task extraction from messages.

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| 5.1 | Send task-like message | User B sends: "Don't forget to call the doctor tomorrow and pick up groceries" | Message appears normally | ☐ | |
| 5.2 | Open message menu | User A clicks ⋯ on that message | Menu appears with "✨ AI Extract Tasks" option | ☐ | |
| 5.3 | Click AI Extract | User A clicks "✨ AI Extract Tasks" | AI extraction panel opens | ☐ | |
| 5.4 | Extract button | Click "✨ Extract Tasks" in panel | Loading indicator, then suggestions appear | ☐ | |
| 5.5 | Multiple tasks found | Review suggestions | Shows 2 tasks: "Call doctor" and "Pick up groceries" (or similar) | ☐ | |
| 5.6 | Task has title | Check each suggestion | Title field populated | ☐ | |
| 5.7 | Task has due date (if detected) | Check suggestions | "tomorrow" parsed to actual date if AI detected it | ☐ | |
| 5.8 | Assignee dropdown | Check assignee selection | Only shows User A and User B (chat members) | ☐ | |
| 5.9 | Create first reminder | User A clicks "Create Reminder" on first task | Reminder created, task removed from suggestions | ☐ | |
| 5.10 | Reminder appears | User A checks Reminders section | New reminder visible with correct title | ☐ | |
| 5.11 | User B sees reminder | User B checks Reminders section | Same reminder visible | ☐ | |
| 5.12 | Create second reminder | User A creates reminder from second suggestion | Second reminder created | ☐ | |
| 5.13 | Dismiss All | On new message, extract tasks → "Dismiss All" | All suggestions dismissed, panel closes | ☐ | |
| 5.14 | No tasks in message | User A extracts from "Hello how are you?" | "No tasks found in this message" shown | ☐ | |

---

## 6. Security Behavior

Test that security rules are enforced. Requires browser console or Firestore inspection.

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| 6.1 | Non-member cannot read aiSuggestions | In console: attempt to read `/chats/{chatId}/aiSuggestions` as non-member | Permission denied | ☐ | Requires test account not in chat |
| 6.2 | Client cannot create aiSuggestion | In console: `addDoc(collection(db, 'chats', chatId, 'aiSuggestions'), {...})` | Permission denied | ☐ | |
| 6.3 | Client cannot delete aiSuggestion | In console: `deleteDoc(doc(db, 'chats', chatId, 'aiSuggestions', 'xxx'))` | Permission denied | ☐ | |
| 6.4 | Cannot modify suggestion content | In console: `updateDoc(..., { suggestion: 'hacked' })` | Permission denied (immutable field) | ☐ | |
| 6.5 | Cannot modify type | In console: `updateDoc(..., { type: 'other' })` | Permission denied (immutable field) | ☐ | |
| 6.6 | Cannot set status to expired | In console: `updateDoc(..., { status: 'expired' })` | Permission denied (invalid status for client) | ☐ | |
| 6.7 | Can set status to accepted | In console: `updateDoc(..., { status: 'accepted' })` | Succeeds (valid client action) | ☐ | |
| 6.8 | Can set status to dismissed | In console: `updateDoc(..., { status: 'dismissed' })` | Succeeds (valid client action) | ☐ | |
| 6.9 | Cannot write to aiUsage | In console: `setDoc(doc(db, 'users', uid, 'aiUsage', 'xxx'), {...})` | Permission denied (server-only) | ☐ | |
| 6.10 | Cannot read aiRuns | In console: `getDoc(doc(db, 'chats', chatId, 'aiRuns', 'xxx'))` | Permission denied (server-only) | ☐ | |
| 6.11 | assignedTo must be member | Create reminder via AI with non-member assignedTo | Should fail or not allow selection | ☐ | |

---

## 7. Rate Limiting

Test rate limit enforcement and user feedback.

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| 7.1 | Tone repair under limit | User A uses AI tone repair 5 times | All succeed | ☐ | |
| 7.2 | Approach tone limit | User A uses AI tone repair 10 times within 1 hour | All succeed until limit | ☐ | Limit is 10/hour |
| 7.3 | Hit tone limit | User A uses AI tone repair 11th time | User-friendly error: "Rate limit reached" or similar | ☐ | |
| 7.4 | Error is not scary | Review error message | Message is calm, suggests trying later, not technical jargon | ☐ | |
| 7.5 | Task extraction limit | User A uses AI task extraction 20+ times in a day | Eventually shows rate limit message | ☐ | Limit is 20/day |
| 7.6 | Rate limit per user | User B (different user) tries AI tone repair | Succeeds (separate rate limit) | ☐ | |

---

## 8. Privacy & Sensitive Data

Test that sensitive data is handled appropriately.

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| 8.1 | SSN rejected | User A types "My SSN is 123-45-6789" → ✨ AI soften | Either: no suggestion returned, or error message about sensitive data | ☐ | |
| 8.2 | Credit card rejected | User A types "My card is 4111-1111-1111-1111" → ✨ AI soften | Sensitive data blocked | ☐ | |
| 8.3 | Password rejected | User A types "My password is secretpass123" → ✨ AI soften | Sensitive data blocked | ☐ | |
| 8.4 | aiRuns has no raw content | Admin checks Firestore `/chats/{chatId}/aiRuns/{runId}` | Document contains metadata (type, userId, status) but NOT raw messageText | ☐ | Requires admin access |
| 8.5 | aiSuggestions has no source | Check aiSuggestion document | Contains suggestion output, NOT the original input text | ☐ | |
| 8.6 | Normal message works | User A types "Can you pick up milk?" → ✨ AI soften | Suggestion returned normally | ☐ | |

---

## Test Summary

| Section | Total Tests | Passed | Failed | Skipped |
|---------|-------------|--------|--------|---------|
| 1. Baseline Regression | 8 | | | |
| 2. AI Disabled | 5 | | | |
| 3. AI Settings | 11 | | | |
| 4. AI Tone Repair | 11 | | | |
| 5. Message-to-Task | 14 | | | |
| 6. Security | 11 | | | |
| 7. Rate Limiting | 6 | | | |
| 8. Privacy | 6 | | | |
| **TOTAL** | **72** | | | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Developer | | | |
| Reviewer | | | |

---

## Notes & Issues Found

| Test # | Issue Description | Severity | Ticket/Action |
|--------|-------------------|----------|---------------|
| | | | |
| | | | |
| | | | |

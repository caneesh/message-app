const TONE_REPAIR_SYSTEM = `You are a helpful assistant that rewrites messages to have a gentler, clearer tone while preserving the original meaning. Your goal is to help people communicate more effectively in personal relationships.

RULES:
1. Return ONLY valid JSON, no other text
2. Preserve the core message and intent
3. Do not add new information or assumptions
4. Do not give medical, legal, or financial advice
5. Do not extract or mention sensitive data (passwords, SSNs, credit cards, account numbers, PINs, government IDs)
6. If the message contains sensitive data (passwords, SSNs, credit cards, bank accounts, government IDs), return no_suggestion immediately
7. If the message is already appropriate or you cannot improve it, return no_suggestion
8. Keep rewrites similar in length to the original (within 50%)
9. Avoid blame, judgment, or taking sides
10. Use warm, caring language appropriate for close relationships

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

If you cannot provide a useful suggestion OR if sensitive data is present:
{
  "rewrittenText": null,
  "explanation": "reason",
  "confidence": 0,
  "no_suggestion": true
}`;

function buildToneRepairUserPrompt({ originalText, toneGoal, contextMessages, partnerMood }) {
  let prompt = `Rewrite this message with a ${toneGoal} tone.

ORIGINAL MESSAGE:
${originalText}
`;

  if (contextMessages && contextMessages.length > 0) {
    prompt += `
CONTEXT (recent messages):
${contextMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}
`;
  }

  if (partnerMood) {
    prompt += `
PARTNER'S CURRENT MOOD: ${partnerMood}
`;
  }

  prompt += `
IMPORTANT: If the message contains any sensitive data (passwords, SSNs, credit cards, bank accounts, government IDs), return no_suggestion.

Return JSON only.`;

  return prompt;
}

const MESSAGE_TO_TASK_SYSTEM = `You are a helpful assistant that extracts actionable tasks from conversation messages. Your goal is to help people track commitments and to-dos mentioned in their chats.

RULES:
1. Return ONLY valid JSON, no other text
2. Only extract tasks that are clearly actionable
3. Do not invent tasks not present in the message
4. Do not give medical, legal, or financial advice
5. Do not extract or include sensitive data (passwords, SSNs, credit cards, account numbers, PINs, government IDs, medical details)
6. If the message contains sensitive data, return no_suggestion immediately
7. If no clear task exists, return no_suggestion
8. Task titles should be concise (under 100 characters)
9. Descriptions should summarize the task context without sensitive details
10. Only suggest due dates if explicitly mentioned or clearly implied
11. Assignee is "sender" if they're committing to do something, "recipient" if asking the other person

OUTPUT FORMAT (JSON only):
{
  "taskTitle": "concise task title",
  "taskDescription": "brief context and details",
  "suggestedDueDate": "YYYY-MM-DD" or null,
  "suggestedAssignee": "sender" or "recipient" or null,
  "confidence": 0.0 to 1.0
}

If no actionable task is detected OR if sensitive data is present:
{
  "taskTitle": null,
  "taskDescription": null,
  "suggestedDueDate": null,
  "suggestedAssignee": null,
  "confidence": 0,
  "no_suggestion": true
}`;

function buildMessageToTaskUserPrompt({ messageText, senderRole, timestamp, today, contextMessages }) {
  let prompt = `Extract an actionable task from this message, if one exists.

MESSAGE:
${messageText}

MESSAGE SENDER: ${senderRole} (the person who wrote this message)
MESSAGE TIMESTAMP: ${timestamp}
TODAY'S DATE: ${today}
`;

  if (contextMessages && contextMessages.length > 0) {
    prompt += `
CONTEXT (surrounding messages):
${contextMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}
`;
  }

  prompt += `
IMPORTANT: If the message contains any sensitive data (passwords, SSNs, credit cards, bank accounts, government IDs), return no_suggestion.

Return JSON only.`;

  return prompt;
}

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

function buildMisunderstandingHelperPrompt({ whatIMeant, whatIHeard, whatINeed, contextMessages, today }) {
  let prompt = `Help resolve this misunderstanding between partners.

MISUNDERSTANDING DETAILS:`;

  if (whatIMeant) {
    prompt += `\nWhat they meant to say: ${whatIMeant}`;
  }
  if (whatIHeard) {
    prompt += `\nWhat they heard: ${whatIHeard}`;
  }
  if (whatINeed) {
    prompt += `\nWhat they need: ${whatINeed}`;
  }

  if (contextMessages && contextMessages.length > 0) {
    prompt += `\n\nRECENT CONTEXT:\n${contextMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}`;
  }

  prompt += `\n\nTODAY: ${today}

Suggest a gentle clarification message that acknowledges both perspectives and moves toward understanding. Return JSON only.`;

  return prompt;
}

module.exports = {
  TONE_REPAIR_SYSTEM,
  buildToneRepairUserPrompt,
  MESSAGE_TO_TASK_SYSTEM,
  buildMessageToTaskUserPrompt,
  MISUNDERSTANDING_HELPER_SYSTEM,
  buildMisunderstandingHelperPrompt,
};

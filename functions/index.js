const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getStorage } = require('firebase-admin/storage');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');

initializeApp();

const db = getFirestore();
const messaging = getMessaging();
const storage = getStorage();

const MAX_PREVIEW_LENGTH = 80;

function truncateText(text, maxLength = MAX_PREVIEW_LENGTH) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function getNotificationBody(message) {
  if (message.type === 'file') {
    const contentType = message.file?.contentType || '';
    if (contentType.startsWith('image/')) {
      return 'Sent a photo';
    }
    return 'Sent a file';
  }
  return truncateText(message.text || 'New message');
}

exports.sendNewMessageNotification = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('No data in snapshot');
      return;
    }

    const message = snapshot.data();
    const { chatId } = event.params;
    const senderId = message.senderId;

    try {
      const chatDoc = await db.collection('chats').doc(chatId).get();
      if (!chatDoc.exists) {
        logger.warn('Chat not found:', chatId);
        return;
      }

      const chatData = chatDoc.data();
      const members = chatData.members || [];

      const recipientIds = members.filter((uid) => uid !== senderId);

      if (recipientIds.length === 0) {
        logger.info('No recipients to notify');
        return;
      }

      for (const recipientId of recipientIds) {
        const tokensSnapshot = await db
          .collection('users')
          .doc(recipientId)
          .collection('fcmTokens')
          .get();

        if (tokensSnapshot.empty) {
          logger.info('No FCM tokens for user:', recipientId);
          continue;
        }

        const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);
        const notificationBody = getNotificationBody(message);

        const payload = {
          notification: {
            title: 'New Message',
            body: notificationBody,
          },
          data: {
            chatId,
            messageId: event.params.messageId,
          },
        };

        for (const token of tokens) {
          try {
            await messaging.send({
              ...payload,
              token,
            });
            logger.info('Notification sent to:', recipientId);
          } catch (err) {
            if (
              err.code === 'messaging/registration-token-not-registered' ||
              err.code === 'messaging/invalid-registration-token'
            ) {
              logger.info('Removing invalid token for user:', recipientId);
              const tokenDoc = tokensSnapshot.docs.find(
                (doc) => doc.data().token === token
              );
              if (tokenDoc) {
                await tokenDoc.ref.delete();
              }
            } else {
              logger.error('Error sending notification:', err);
            }
          }
        }
      }
    } catch (err) {
      logger.error('Error in sendNewMessageNotification:', err);
    }
  }
);

const DURATION_MS = {
  1: 24 * 60 * 60 * 1000,
  7: 7 * 24 * 60 * 60 * 1000,
  30: 30 * 24 * 60 * 60 * 1000,
};

exports.cleanupOldMessages = onSchedule('every 6 hours', async () => {
  logger.info('Starting message cleanup');

  try {
    const chatsSnapshot = await db.collection('chats').get();

    for (const chatDoc of chatsSnapshot.docs) {
      const chatData = chatDoc.data();
      const autoDelete = chatData.autoDelete;

      if (!autoDelete?.enabled || !autoDelete?.durationDays) {
        continue;
      }

      const durationMs = DURATION_MS[autoDelete.durationDays];
      if (!durationMs) {
        logger.warn('Invalid durationDays:', autoDelete.durationDays);
        continue;
      }

      const cutoffDate = new Date(Date.now() - durationMs);
      logger.info(`Cleaning chat ${chatDoc.id}, cutoff: ${cutoffDate.toISOString()}`);

      const messagesSnapshot = await db
        .collection('chats')
        .doc(chatDoc.id)
        .collection('messages')
        .where('createdAt', '<', cutoffDate)
        .limit(500)
        .get();

      if (messagesSnapshot.empty) {
        logger.info('No old messages to delete in chat:', chatDoc.id);
        continue;
      }

      const batch = db.batch();
      let deleteCount = 0;

      for (const messageDoc of messagesSnapshot.docs) {
        const message = messageDoc.data();

        if (message.type === 'file' && message.file?.storagePath) {
          try {
            const bucket = storage.bucket();
            await bucket.file(message.file.storagePath).delete();
            logger.info('Deleted storage file:', message.file.storagePath);
          } catch (storageErr) {
            logger.warn('Failed to delete storage file:', storageErr.message);
          }
        }

        batch.delete(messageDoc.ref);
        deleteCount++;
      }

      await batch.commit();
      logger.info(`Deleted ${deleteCount} messages from chat:`, chatDoc.id);
    }

    logger.info('Message cleanup complete');
  } catch (err) {
    logger.error('Error in cleanupOldMessages:', err);
  }
});

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const aiApiKey = defineSecret('AI_API_KEY');
const crypto = require('crypto');

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

exports.createInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const { chatId } = request.data;
  if (!chatId) {
    throw new HttpsError('invalid-argument', 'chatId is required');
  }

  const uid = request.auth.uid;

  const chatDoc = await db.collection('chats').doc(chatId).get();
  if (!chatDoc.exists) {
    throw new HttpsError('not-found', 'Chat not found');
  }

  const chatData = chatDoc.data();
  if (!chatData.members?.includes(uid)) {
    throw new HttpsError('permission-denied', 'Not a member of this chat');
  }

  if (chatData.members.length >= 2) {
    throw new HttpsError('failed-precondition', 'Chat already has 2 members');
  }

  const inviteCode = generateInviteCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.collection('invites').doc(inviteCode).set({
    createdBy: uid,
    chatId,
    expiresAt,
    createdAt: new Date(),
    status: 'active',
  });

  logger.info('Invite created:', inviteCode);
  return { inviteCode, expiresAt: expiresAt.toISOString() };
});

exports.redeemInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const { inviteCode } = request.data;
  if (!inviteCode) {
    throw new HttpsError('invalid-argument', 'inviteCode is required');
  }

  const uid = request.auth.uid;
  const inviteRef = db.collection('invites').doc(inviteCode.toUpperCase());

  const result = await db.runTransaction(async (transaction) => {
    const inviteDoc = await transaction.get(inviteRef);
    if (!inviteDoc.exists) {
      throw new HttpsError('not-found', 'Invite not found');
    }

    const invite = inviteDoc.data();
    if (invite.status !== 'active') {
      throw new HttpsError('failed-precondition', 'Invite is no longer active');
    }

    if (new Date() > invite.expiresAt.toDate()) {
      transaction.update(inviteRef, { status: 'expired' });
      throw new HttpsError('failed-precondition', 'Invite has expired');
    }

    if (invite.createdBy === uid) {
      throw new HttpsError('failed-precondition', 'Cannot use your own invite');
    }

    const chatRef = db.collection('chats').doc(invite.chatId);
    const chatDoc = await transaction.get(chatRef);
    if (!chatDoc.exists) {
      throw new HttpsError('not-found', 'Chat not found');
    }

    const chatData = chatDoc.data();
    if (chatData.members?.includes(uid)) {
      throw new HttpsError('failed-precondition', 'Already a member');
    }

    if (chatData.members?.length >= 2) {
      throw new HttpsError('failed-precondition', 'Chat is full');
    }

    transaction.update(chatRef, {
      members: [...(chatData.members || []), uid],
    });

    transaction.update(inviteRef, {
      status: 'used',
      usedBy: uid,
      usedAt: new Date(),
    });

    return { chatId: invite.chatId };
  });

  logger.info('Invite redeemed:', inviteCode, 'by:', uid);
  return result;
});

// ============================================
// AI FEATURES (MVP)
// ============================================

const { FieldValue } = require('firebase-admin/firestore');
const { containsSensitiveData, sanitizeForPreview } = require('./ai/sensitiveDataFilter');
const { callAI, parseJSONResponse } = require('./ai/aiWrapper');
const { checkAndIncrementRateLimit } = require('./ai/rateLimiter');
const {
  TONE_REPAIR_SYSTEM,
  buildToneRepairUserPrompt,
  MESSAGE_TO_TASK_SYSTEM,
  buildMessageToTaskUserPrompt,
} = require('./ai/prompts');

const VALID_TONE_GOALS = ['softer', 'clearer', 'more_caring', 'less_angry'];

function isAIGloballyEnabled() {
  const aiEnabled = process.env.AI_ENABLED;
  return aiEnabled !== 'false' && aiEnabled !== '0';
}

async function verifyAIEnabled(uid, feature) {
  const settingsDoc = await db.doc(`users/${uid}/settings/ai`).get();
  if (!settingsDoc.exists) {
    return { enabled: false, reason: 'AI_NOT_ENABLED' };
  }
  const settings = settingsDoc.data();
  if (!settings.enabled) {
    return { enabled: false, reason: 'AI_NOT_ENABLED' };
  }
  if (!settings.features?.[feature]) {
    return { enabled: false, reason: 'FEATURE_NOT_ENABLED' };
  }
  return { enabled: true };
}

async function verifyChatMembership(chatId, uid) {
  const chatDoc = await db.doc(`chats/${chatId}`).get();
  if (!chatDoc.exists) {
    return { isMember: false, reason: 'CHAT_NOT_FOUND', members: [] };
  }
  const members = chatDoc.data().members || [];
  if (!members.includes(uid)) {
    return { isMember: false, reason: 'NOT_CHAT_MEMBER', members };
  }
  return { isMember: true, members };
}

exports.aiToneRepair = onCall({ secrets: [aiApiKey] }, async (request) => {
  if (!isAIGloballyEnabled()) {
    throw new HttpsError('unavailable', 'AI_TEMPORARILY_DISABLED');
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const uid = request.auth.uid;
  const { chatId, originalText, toneGoal, contextMessageIds, partnerMood } = request.data;

  if (!chatId || typeof chatId !== 'string') {
    throw new HttpsError('invalid-argument', 'INVALID_INPUT');
  }
  if (!originalText || typeof originalText !== 'string') {
    throw new HttpsError('invalid-argument', 'INVALID_INPUT');
  }
  if (originalText.trim().length < 10) {
    throw new HttpsError('invalid-argument', 'TEXT_TOO_SHORT');
  }
  if (originalText.length > 2000) {
    throw new HttpsError('invalid-argument', 'TEXT_TOO_LONG');
  }
  if (!VALID_TONE_GOALS.includes(toneGoal)) {
    throw new HttpsError('invalid-argument', 'INVALID_TONE_GOAL');
  }

  const membershipCheck = await verifyChatMembership(chatId, uid);
  if (!membershipCheck.isMember) {
    throw new HttpsError(
      membershipCheck.reason === 'CHAT_NOT_FOUND' ? 'not-found' : 'permission-denied',
      membershipCheck.reason
    );
  }

  const aiCheck = await verifyAIEnabled(uid, 'toneRepair');
  if (!aiCheck.enabled) {
    throw new HttpsError('failed-precondition', aiCheck.reason);
  }

  if (containsSensitiveData(originalText)) {
    throw new HttpsError('invalid-argument', 'SENSITIVE_DATA_DETECTED');
  }

  const rateLimit = await checkAndIncrementRateLimit(db, uid, 'toneRepair');
  if (!rateLimit.allowed) {
    throw new HttpsError('resource-exhausted', 'RATE_LIMIT_EXCEEDED');
  }

  let contextMessages = [];
  if (contextMessageIds && Array.isArray(contextMessageIds) && contextMessageIds.length > 0) {
    const limitedIds = contextMessageIds.slice(0, 5);
    for (const msgId of limitedIds) {
      const msgDoc = await db.doc(`chats/${chatId}/messages/${msgId}`).get();
      if (msgDoc.exists) {
        const text = msgDoc.data().text || '';
        if (containsSensitiveData(text)) {
          throw new HttpsError('invalid-argument', 'SENSITIVE_DATA_IN_CONTEXT');
        }
        contextMessages.push(text.slice(0, 200));
      }
    }
  }

  const userPrompt = buildToneRepairUserPrompt({
    originalText,
    toneGoal,
    contextMessages,
    partnerMood,
  });

  const aiResult = await callAI(TONE_REPAIR_SYSTEM, userPrompt, { maxTokens: 600 });

  const runId = db.collection(`chats/${chatId}/aiRuns`).doc().id;
  await db.doc(`chats/${chatId}/aiRuns/${runId}`).set({
    requestedByUserId: uid,
    feature: 'toneRepair',
    functionName: 'aiToneRepair',
    inputTokenCount: aiResult.inputTokens || 0,
    outputTokenCount: aiResult.outputTokens || 0,
    success: aiResult.success,
    errorCode: aiResult.error || null,
    provider: 'anthropic',
    model: aiResult.model || 'unknown',
    requestedAt: FieldValue.serverTimestamp(),
    completedAt: FieldValue.serverTimestamp(),
    latencyMs: 0,
    estimatedCostUsd: 0,
    suggestionId: null,
  });

  if (!aiResult.success) {
    if (aiResult.error === 'AI_TIMEOUT') {
      throw new HttpsError('deadline-exceeded', 'AI_TIMEOUT');
    }
    throw new HttpsError('internal', 'AI_PROVIDER_ERROR');
  }

  const parsed = parseJSONResponse(aiResult.content);
  if (!parsed || parsed.no_suggestion || !parsed.rewrittenText) {
    return { success: true, suggestionId: null, suggestion: null, reason: 'NO_SUGGESTION' };
  }

  if (containsSensitiveData(parsed.rewrittenText)) {
    return { success: true, suggestionId: null, suggestion: null, reason: 'AI_OUTPUT_FILTERED' };
  }

  const suggestionId = db.collection(`chats/${chatId}/aiSuggestions`).doc().id;
  const suggestionData = {
    type: 'tone_repair',
    requestedByUserId: uid,
    targetUserId: uid,
    sourceMessageId: null,
    sourceTextPreview: sanitizeForPreview(originalText, 100),
    generatedBy: 'anthropic',
    generatedByFunction: 'aiToneRepair',
    suggestedPayload: {
      originalText: originalText.slice(0, 2000),
      rewrittenText: parsed.rewrittenText.slice(0, 2000),
      toneGoal,
      explanation: (parsed.explanation || '').slice(0, 500),
    },
    confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.7,
    status: 'pending',
    acceptedPayload: null,
    reviewedBy: null,
    reviewedAt: null,
    dismissReason: null,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  };

  await db.doc(`chats/${chatId}/aiSuggestions/${suggestionId}`).set(suggestionData);
  await db.doc(`chats/${chatId}/aiRuns/${runId}`).update({ suggestionId });

  logger.info('AI Tone Repair suggestion created:', suggestionId);

  return {
    success: true,
    suggestionId,
    suggestion: {
      rewrittenText: parsed.rewrittenText.slice(0, 2000),
      explanation: (parsed.explanation || '').slice(0, 500),
      confidence: suggestionData.confidence,
    },
  };
});

exports.aiMessageToTask = onCall({ secrets: [aiApiKey] }, async (request) => {
  if (!isAIGloballyEnabled()) {
    throw new HttpsError('unavailable', 'AI_TEMPORARILY_DISABLED');
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const uid = request.auth.uid;
  const { chatId, messageId, contextMessageIds } = request.data;

  if (!chatId || typeof chatId !== 'string') {
    throw new HttpsError('invalid-argument', 'INVALID_INPUT');
  }
  if (!messageId || typeof messageId !== 'string') {
    throw new HttpsError('invalid-argument', 'INVALID_INPUT');
  }

  const membershipCheck = await verifyChatMembership(chatId, uid);
  if (!membershipCheck.isMember) {
    throw new HttpsError(
      membershipCheck.reason === 'CHAT_NOT_FOUND' ? 'not-found' : 'permission-denied',
      membershipCheck.reason
    );
  }

  const aiCheck = await verifyAIEnabled(uid, 'messageToTask');
  if (!aiCheck.enabled) {
    throw new HttpsError('failed-precondition', aiCheck.reason);
  }

  const messageDoc = await db.doc(`chats/${chatId}/messages/${messageId}`).get();
  if (!messageDoc.exists) {
    throw new HttpsError('not-found', 'MESSAGE_NOT_FOUND');
  }

  const messageData = messageDoc.data();
  const messageText = messageData.text || '';

  if (messageText.length < 5) {
    throw new HttpsError('invalid-argument', 'MESSAGE_TOO_SHORT');
  }
  if (messageText.length > 2000) {
    throw new HttpsError('invalid-argument', 'MESSAGE_TOO_LONG');
  }
  if (containsSensitiveData(messageText)) {
    throw new HttpsError('invalid-argument', 'SENSITIVE_DATA_DETECTED');
  }

  const rateLimit = await checkAndIncrementRateLimit(db, uid, 'messageToTask');
  if (!rateLimit.allowed) {
    throw new HttpsError('resource-exhausted', 'RATE_LIMIT_EXCEEDED');
  }

  let contextMessages = [];
  if (contextMessageIds && Array.isArray(contextMessageIds) && contextMessageIds.length > 0) {
    const limitedIds = contextMessageIds.slice(0, 5);
    for (const msgId of limitedIds) {
      const msgDoc = await db.doc(`chats/${chatId}/messages/${msgId}`).get();
      if (msgDoc.exists) {
        const text = msgDoc.data().text || '';
        if (!containsSensitiveData(text)) {
          contextMessages.push(text.slice(0, 200));
        }
      }
    }
  }

  const senderRole = messageData.senderId === uid ? 'sender (you)' : 'recipient (your partner)';
  const timestamp = messageData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const userPrompt = buildMessageToTaskUserPrompt({
    messageText,
    senderRole,
    timestamp,
    today,
    contextMessages,
  });

  const aiResult = await callAI(MESSAGE_TO_TASK_SYSTEM, userPrompt, { maxTokens: 500 });

  const runId = db.collection(`chats/${chatId}/aiRuns`).doc().id;
  await db.doc(`chats/${chatId}/aiRuns/${runId}`).set({
    requestedByUserId: uid,
    feature: 'messageToTask',
    functionName: 'aiMessageToTask',
    inputTokenCount: aiResult.inputTokens || 0,
    outputTokenCount: aiResult.outputTokens || 0,
    success: aiResult.success,
    errorCode: aiResult.error || null,
    provider: 'anthropic',
    model: aiResult.model || 'unknown',
    requestedAt: FieldValue.serverTimestamp(),
    completedAt: FieldValue.serverTimestamp(),
    latencyMs: 0,
    estimatedCostUsd: 0,
    suggestionId: null,
  });

  if (!aiResult.success) {
    if (aiResult.error === 'AI_TIMEOUT') {
      throw new HttpsError('deadline-exceeded', 'AI_TIMEOUT');
    }
    throw new HttpsError('internal', 'AI_PROVIDER_ERROR');
  }

  const parsed = parseJSONResponse(aiResult.content);
  if (!parsed || parsed.no_suggestion || !parsed.taskTitle) {
    return { success: true, suggestionId: null, suggestion: null, reason: 'NO_TASK_DETECTED', chatMembers: membershipCheck.members };
  }

  if (containsSensitiveData(parsed.taskTitle) || containsSensitiveData(parsed.taskDescription)) {
    return { success: true, suggestionId: null, suggestion: null, reason: 'AI_OUTPUT_FILTERED', chatMembers: membershipCheck.members };
  }

  const suggestionId = db.collection(`chats/${chatId}/aiSuggestions`).doc().id;
  const suggestionData = {
    type: 'task_suggestion',
    requestedByUserId: uid,
    targetUserId: uid,
    sourceMessageId: messageId,
    sourceTextPreview: sanitizeForPreview(messageText, 100),
    generatedBy: 'anthropic',
    generatedByFunction: 'aiMessageToTask',
    suggestedPayload: {
      sourceText: messageText.slice(0, 500),
      taskTitle: parsed.taskTitle.slice(0, 200),
      taskDescription: (parsed.taskDescription || '').slice(0, 1000),
      suggestedDueDate: parsed.suggestedDueDate || null,
      suggestedAssignee: parsed.suggestedAssignee || null,
    },
    confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.7,
    status: 'pending',
    acceptedPayload: null,
    reviewedBy: null,
    reviewedAt: null,
    dismissReason: null,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };

  await db.doc(`chats/${chatId}/aiSuggestions/${suggestionId}`).set(suggestionData);
  await db.doc(`chats/${chatId}/aiRuns/${runId}`).update({ suggestionId });

  logger.info('AI Message-to-Task suggestion created:', suggestionId);

  return {
    success: true,
    suggestionId,
    suggestion: {
      taskTitle: parsed.taskTitle.slice(0, 200),
      taskDescription: (parsed.taskDescription || '').slice(0, 1000),
      suggestedDueDate: parsed.suggestedDueDate || null,
      suggestedAssignee: parsed.suggestedAssignee || null,
      confidence: suggestionData.confidence,
    },
    chatMembers: membershipCheck.members,
  };
});

exports.aiCreateReminderFromSuggestion = onCall({ secrets: [aiApiKey] }, async (request) => {
  if (!isAIGloballyEnabled()) {
    throw new HttpsError('unavailable', 'AI_TEMPORARILY_DISABLED');
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const uid = request.auth.uid;
  const { chatId, suggestionId, acceptedPayload } = request.data;

  if (!chatId || !suggestionId || !acceptedPayload) {
    throw new HttpsError('invalid-argument', 'INVALID_INPUT');
  }

  if (!acceptedPayload.taskTitle || typeof acceptedPayload.taskTitle !== 'string') {
    throw new HttpsError('invalid-argument', 'INVALID_INPUT');
  }
  if (acceptedPayload.taskTitle.length > 200) {
    throw new HttpsError('invalid-argument', 'TITLE_TOO_LONG');
  }
  if (acceptedPayload.taskDescription && acceptedPayload.taskDescription.length > 1000) {
    throw new HttpsError('invalid-argument', 'DESCRIPTION_TOO_LONG');
  }

  const membershipCheck = await verifyChatMembership(chatId, uid);
  if (!membershipCheck.isMember) {
    throw new HttpsError(
      membershipCheck.reason === 'CHAT_NOT_FOUND' ? 'not-found' : 'permission-denied',
      membershipCheck.reason
    );
  }

  if (acceptedPayload.assignedTo !== null && acceptedPayload.assignedTo !== undefined) {
    if (!membershipCheck.members.includes(acceptedPayload.assignedTo)) {
      throw new HttpsError('invalid-argument', 'ASSIGNEE_NOT_CHAT_MEMBER');
    }
  }

  const result = await db.runTransaction(async (transaction) => {
    const suggestionRef = db.doc(`chats/${chatId}/aiSuggestions/${suggestionId}`);
    const suggestionDoc = await transaction.get(suggestionRef);

    if (!suggestionDoc.exists) {
      throw new HttpsError('not-found', 'SUGGESTION_NOT_FOUND');
    }

    const suggestion = suggestionDoc.data();

    if (suggestion.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'SUGGESTION_ALREADY_PROCESSED');
    }
    if (suggestion.type !== 'task_suggestion') {
      throw new HttpsError('invalid-argument', 'WRONG_SUGGESTION_TYPE');
    }
    if (suggestion.targetUserId !== uid) {
      throw new HttpsError('permission-denied', 'NOT_TARGET_USER');
    }

    const reminderRef = db.collection(`chats/${chatId}/reminders`).doc();
    const reminderData = {
      title: acceptedPayload.taskTitle,
      notes: acceptedPayload.taskDescription || '',
      dueAt: acceptedPayload.dueDate ? new Date(acceptedPayload.dueDate) : null,
      assignedTo: acceptedPayload.assignedTo || null,
      completed: false,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      sourceMessageId: suggestion.sourceMessageId || null,
    };

    transaction.set(reminderRef, reminderData);

    transaction.update(suggestionRef, {
      status: 'accepted',
      acceptedPayload: {
        taskTitle: acceptedPayload.taskTitle,
        taskDescription: acceptedPayload.taskDescription || '',
        dueDate: acceptedPayload.dueDate || null,
        assignedTo: acceptedPayload.assignedTo || null,
      },
      reviewedBy: uid,
      reviewedAt: FieldValue.serverTimestamp(),
    });

    return { reminderId: reminderRef.id };
  });

  logger.info('Reminder created from AI suggestion:', result.reminderId, 'suggestion:', suggestionId);

  return { success: true, reminderId: result.reminderId };
});

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

// Auto-delete disabled - messages are kept forever
// To re-enable, uncomment the cleanupOldMessages function below

/*
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
*/

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const aiApiKey = defineSecret('AI_API_KEY');

// ============================================
// SECURE FILE ACCESS
// ============================================

exports.getSecureFileUrl = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const { chatId, storagePath } = request.data;

  if (!chatId || typeof chatId !== 'string') {
    throw new HttpsError('invalid-argument', 'chatId is required');
  }
  if (!storagePath || typeof storagePath !== 'string') {
    throw new HttpsError('invalid-argument', 'storagePath is required');
  }

  // Validate storage path format and matches chatId
  const pathMatch = storagePath.match(/^(chatFiles|chatVoice)\/([^/]+)\/[^/]+\/[^/]+$/);
  if (!pathMatch) {
    throw new HttpsError('invalid-argument', 'Invalid storage path format');
  }

  const pathChatId = pathMatch[2];
  if (pathChatId !== chatId) {
    throw new HttpsError('permission-denied', 'Storage path does not match chat');
  }

  const uid = request.auth.uid;

  // Verify user is a member of the chat
  const chatDoc = await db.collection('chats').doc(chatId).get();
  if (!chatDoc.exists) {
    throw new HttpsError('not-found', 'Chat not found');
  }

  const chatData = chatDoc.data();
  if (!chatData.members?.includes(uid)) {
    throw new HttpsError('permission-denied', 'Not a member of this chat');
  }

  // Generate a signed URL that expires in 15 minutes
  try {
    const bucket = storage.bucket();
    const file = bucket.file(storagePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError('not-found', 'File not found');
    }

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    logger.info('Generated secure URL for:', storagePath, 'user:', uid);
    return { url: signedUrl, expiresIn: 15 * 60 };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.error('Error generating signed URL:', err);
    throw new HttpsError('internal', 'Failed to generate secure URL');
  }
});
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

// ============================================
// PHASE 2 AI FEATURES
// ============================================

const {
  MISUNDERSTANDING_HELPER_SYSTEM,
  buildMisunderstandingHelperPrompt,
} = require('./ai/prompts');

exports.aiMisunderstandingHelper = onCall({ secrets: [aiApiKey] }, async (request) => {
  if (!isAIGloballyEnabled()) {
    throw new HttpsError('unavailable', 'AI_TEMPORARILY_DISABLED');
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const uid = request.auth.uid;
  const { chatId, misunderstandingId, contextMessageIds } = request.data;

  if (!chatId || typeof chatId !== 'string') {
    throw new HttpsError('invalid-argument', 'INVALID_INPUT');
  }
  if (!misunderstandingId || typeof misunderstandingId !== 'string') {
    throw new HttpsError('invalid-argument', 'INVALID_INPUT');
  }

  const membershipCheck = await verifyChatMembership(chatId, uid);
  if (!membershipCheck.isMember) {
    throw new HttpsError(
      membershipCheck.reason === 'CHAT_NOT_FOUND' ? 'not-found' : 'permission-denied',
      membershipCheck.reason
    );
  }

  const aiCheck = await verifyAIEnabled(uid, 'misunderstandingHelper');
  if (!aiCheck.enabled) {
    throw new HttpsError('failed-precondition', aiCheck.reason);
  }

  const misDoc = await db.doc(`chats/${chatId}/misunderstandings/${misunderstandingId}`).get();
  if (!misDoc.exists) {
    throw new HttpsError('not-found', 'MISUNDERSTANDING_NOT_FOUND');
  }

  const misData = misDoc.data();
  const whatIMeant = misData.whatIMeant || '';
  const whatIHeard = misData.whatIHeard || '';
  const whatINeed = misData.whatINeed || '';
  const combinedText = `${whatIMeant} ${whatIHeard} ${whatINeed}`;

  if (combinedText.trim().length < 10) {
    throw new HttpsError('invalid-argument', 'TEXT_TOO_SHORT');
  }

  if (containsSensitiveData(whatIMeant) || containsSensitiveData(whatIHeard) || containsSensitiveData(whatINeed)) {
    throw new HttpsError('invalid-argument', 'SENSITIVE_DATA_DETECTED');
  }

  const rateLimit = await checkAndIncrementRateLimit(db, uid, 'misunderstandingHelper');
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

  const today = new Date().toISOString().slice(0, 10);
  const userPrompt = buildMisunderstandingHelperPrompt({
    whatIMeant,
    whatIHeard,
    whatINeed,
    contextMessages,
    today,
  });

  const aiResult = await callAI(MISUNDERSTANDING_HELPER_SYSTEM, userPrompt, { maxTokens: 800 });

  const runId = db.collection(`chats/${chatId}/aiRuns`).doc().id;
  await db.doc(`chats/${chatId}/aiRuns/${runId}`).set({
    requestedByUserId: uid,
    feature: 'misunderstandingHelper',
    functionName: 'aiMisunderstandingHelper',
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
  if (!parsed || parsed.no_suggestion || !parsed.clarificationText) {
    return { success: true, suggestionId: null, suggestion: null, reason: 'NO_SUGGESTION' };
  }

  if (containsSensitiveData(parsed.clarificationText) ||
      containsSensitiveData(parsed.issueIdentified) ||
      containsSensitiveData(parsed.suggestedApproach)) {
    return { success: true, suggestionId: null, suggestion: null, reason: 'AI_OUTPUT_FILTERED' };
  }

  const suggestionId = db.collection(`chats/${chatId}/aiSuggestions`).doc().id;
  const suggestionData = {
    type: 'misunderstanding_helper',
    requestedByUserId: uid,
    targetUserId: uid,
    sourceMessageId: null,
    sourceTextPreview: sanitizeForPreview(combinedText, 100),
    generatedBy: 'anthropic',
    generatedByFunction: 'aiMisunderstandingHelper',
    suggestedPayload: {
      clarificationText: parsed.clarificationText.slice(0, 2000),
      issueIdentified: (parsed.issueIdentified || '').slice(0, 500),
      suggestedApproach: (parsed.suggestedApproach || '').slice(0, 500),
    },
    confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.7,
    status: 'pending',
    acceptedPayload: null,
    reviewedBy: null,
    reviewedAt: null,
    dismissReason: null,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  };

  await db.doc(`chats/${chatId}/aiSuggestions/${suggestionId}`).set(suggestionData);
  await db.doc(`chats/${chatId}/aiRuns/${runId}`).update({ suggestionId });

  logger.info('AI Misunderstanding Helper suggestion created:', suggestionId);

  return {
    success: true,
    suggestionId,
    suggestion: {
      clarificationText: parsed.clarificationText.slice(0, 2000),
      issueIdentified: (parsed.issueIdentified || '').slice(0, 500),
      suggestedApproach: (parsed.suggestedApproach || '').slice(0, 500),
      confidence: suggestionData.confidence,
    },
  };
});

// ============================================
// SCHEDULED CHAT BACKUP
// ============================================

const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);

const BACKUP_CONFIG = {
  // Subcollections to include in backup
  SUBCOLLECTIONS: [
    'messages',
    'reminders',
    'notes',
    'promises',
    'decisions',
    'memories',
    'pinnedMessages',
    'reactions',
    'checkIns',
    'specialMessages',
    'importantDates',
    'lists',
    'events',
    'capsules',
    'followUps',
    'misunderstandings',
  ],
  // Subcollections to exclude (audit/cost metadata)
  EXCLUDED_SUBCOLLECTIONS: ['aiRuns'],
  // Default values
  DEFAULT_RETENTION_DAYS: 30,
  DEFAULT_MESSAGE_DAYS: 90,
  BACKUP_VERSION: '1.0.0',
};

function isBackupEnabled() {
  const enabled = process.env.CHAT_BACKUP_ENABLED;
  return enabled === 'true' || enabled === '1';
}

function getBackupRetentionDays() {
  const days = parseInt(process.env.CHAT_BACKUP_RETENTION_DAYS, 10);
  return isNaN(days) ? BACKUP_CONFIG.DEFAULT_RETENTION_DAYS : days;
}

function getBackupMessageDays() {
  const days = parseInt(process.env.CHAT_BACKUP_MESSAGE_DAYS, 10);
  return isNaN(days) ? BACKUP_CONFIG.DEFAULT_MESSAGE_DAYS : days;
}

function getBackupBucket() {
  return process.env.CHAT_BACKUP_BUCKET || null;
}

function formatBackupPath(chatId, date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  return `backups/chats/${year}/${month}/${day}/${hour}/chat-${chatId}.json.gz`;
}

function formatManifestPath(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  return `backups/chats/${year}/${month}/${day}/${hour}/manifest.json`;
}

async function backupSubcollection(chatId, subcollectionName, messageDays) {
  const docs = [];
  let query = db.collection(`chats/${chatId}/${subcollectionName}`);

  // For messages, only get last N days to avoid huge backups
  if (subcollectionName === 'messages' && messageDays > 0) {
    const cutoffDate = new Date(Date.now() - messageDays * 24 * 60 * 60 * 1000);
    query = query.where('createdAt', '>=', cutoffDate);
  }

  try {
    const snapshot = await query.get();
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Convert Firestore timestamps to ISO strings for JSON serialization
      const serializedData = serializeFirestoreData(data);
      docs.push({
        id: doc.id,
        ...serializedData,
      });
    });
  } catch (err) {
    // Subcollection might not exist, which is fine
    if (err.code !== 5) { // NOT_FOUND
      logger.warn(`Error reading subcollection ${subcollectionName} for chat ${chatId}:`, err.message);
    }
  }

  return docs;
}

function serializeFirestoreData(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (data.toDate && typeof data.toDate === 'function') {
    // Firestore Timestamp
    return data.toDate().toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(serializeFirestoreData);
  }

  if (typeof data === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeFirestoreData(value);
    }
    return result;
  }

  return data;
}

async function backupSingleChat(chatId, bucket, backupDate, messageDays) {
  const startTime = Date.now();
  const result = {
    chatId,
    path: null,
    messageCount: 0,
    status: 'success',
    error: null,
    subcollectionCounts: {},
  };

  try {
    // Get chat document
    const chatDoc = await db.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) {
      result.status = 'skipped';
      result.error = 'Chat document not found';
      return result;
    }

    const chatData = serializeFirestoreData(chatDoc.data());

    // Build backup object
    const backupData = {
      backupVersion: BACKUP_CONFIG.BACKUP_VERSION,
      backupCreatedAt: backupDate.toISOString(),
      chatId,
      chatMetadata: chatData,
      subcollections: {},
    };

    // Backup each subcollection
    for (const subcollection of BACKUP_CONFIG.SUBCOLLECTIONS) {
      const docs = await backupSubcollection(chatId, subcollection, messageDays);
      backupData.subcollections[subcollection] = docs;
      result.subcollectionCounts[subcollection] = docs.length;

      if (subcollection === 'messages') {
        result.messageCount = docs.length;
      }
    }

    // For lists, also backup list items
    if (backupData.subcollections.lists && backupData.subcollections.lists.length > 0) {
      for (const list of backupData.subcollections.lists) {
        try {
          const itemsSnapshot = await db
            .collection(`chats/${chatId}/lists/${list.id}/items`)
            .get();
          list.items = itemsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...serializeFirestoreData(doc.data()),
          }));
        } catch (err) {
          list.items = [];
        }
      }
    }

    // Compress and upload
    const jsonString = JSON.stringify(backupData);
    const compressed = await gzip(Buffer.from(jsonString, 'utf8'));

    const backupPath = formatBackupPath(chatId, backupDate);
    const file = bucket.file(backupPath);

    await file.save(compressed, {
      metadata: {
        contentType: 'application/gzip',
        contentEncoding: 'gzip',
        metadata: {
          backupVersion: BACKUP_CONFIG.BACKUP_VERSION,
          chatId,
          messageCount: String(result.messageCount),
          createdAt: backupDate.toISOString(),
        },
      },
    });

    result.path = backupPath;
    result.durationMs = Date.now() - startTime;

    // Log only metadata, not content
    logger.info('Chat backup completed', {
      chatId,
      path: backupPath,
      messageCount: result.messageCount,
      durationMs: result.durationMs,
    });

  } catch (err) {
    result.status = 'failed';
    result.error = err.message;
    logger.error('Chat backup failed', { chatId, error: err.message });
  }

  return result;
}

exports.scheduledChatBackup = onSchedule(
  {
    schedule: process.env.CHAT_BACKUP_SCHEDULE || 'every 6 hours',
    timeoutSeconds: 540, // 9 minutes max
    memory: '1GiB',
  },
  async () => {
    const startedAt = new Date();

    // Check if backup is enabled
    if (!isBackupEnabled()) {
      logger.info('Chat backup disabled');
      return;
    }

    const bucketName = getBackupBucket();
    if (!bucketName) {
      logger.error('CHAT_BACKUP_BUCKET not configured');
      return;
    }

    const messageDays = getBackupMessageDays();
    logger.info('Starting scheduled chat backup', {
      messageDays,
      backupVersion: BACKUP_CONFIG.BACKUP_VERSION,
    });

    const bucket = storage.bucket(bucketName);
    const backupResults = [];

    try {
      // Get all chats
      const chatsSnapshot = await db.collection('chats').get();
      const chatCount = chatsSnapshot.size;

      logger.info(`Found ${chatCount} chats to backup`);

      // Backup each chat
      for (const chatDoc of chatsSnapshot.docs) {
        const result = await backupSingleChat(
          chatDoc.id,
          bucket,
          startedAt,
          messageDays
        );
        backupResults.push(result);
      }

      // Create manifest
      const completedAt = new Date();
      const successCount = backupResults.filter((r) => r.status === 'success').length;
      const failureCount = backupResults.filter((r) => r.status === 'failed').length;

      const manifest = {
        backupVersion: BACKUP_CONFIG.BACKUP_VERSION,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt - startedAt,
        chatCount,
        successCount,
        failureCount,
        skippedCount: chatCount - successCount - failureCount,
        messageDaysIncluded: messageDays,
        backupFiles: backupResults.map((r) => ({
          chatId: r.chatId,
          path: r.path,
          messageCount: r.messageCount,
          status: r.status,
          error: r.error,
          subcollectionCounts: r.subcollectionCounts,
        })),
      };

      // Upload manifest
      const manifestPath = formatManifestPath(startedAt);
      const manifestFile = bucket.file(manifestPath);
      await manifestFile.save(JSON.stringify(manifest, null, 2), {
        metadata: {
          contentType: 'application/json',
        },
      });

      logger.info('Chat backup completed', {
        manifestPath,
        chatCount,
        successCount,
        failureCount,
        durationMs: manifest.durationMs,
      });

    } catch (err) {
      logger.error('Scheduled chat backup failed', { error: err.message });
    }
  }
);

exports.cleanupOldChatBackups = onSchedule(
  {
    schedule: 'every 24 hours',
    timeoutSeconds: 300, // 5 minutes max
    memory: '512MiB',
  },
  async () => {
    // Check if backup is enabled
    if (!isBackupEnabled()) {
      logger.info('Chat backup disabled, skipping cleanup');
      return;
    }

    const bucketName = getBackupBucket();
    if (!bucketName) {
      logger.error('CHAT_BACKUP_BUCKET not configured');
      return;
    }

    const retentionDays = getBackupRetentionDays();
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    logger.info('Starting backup cleanup', {
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
    });

    const bucket = storage.bucket(bucketName);
    let deletedCount = 0;
    let errorCount = 0;

    try {
      // List all files in backups/chats/
      const [files] = await bucket.getFiles({
        prefix: 'backups/chats/',
      });

      for (const file of files) {
        try {
          // Get file metadata
          const [metadata] = await file.getMetadata();
          const createdAt = metadata.timeCreated ? new Date(metadata.timeCreated) : null;

          if (createdAt && createdAt < cutoffDate) {
            await file.delete();
            deletedCount++;
          }
        } catch (err) {
          errorCount++;
          logger.warn('Failed to process backup file', {
            file: file.name,
            error: err.message,
          });
        }
      }

      logger.info('Backup cleanup completed', {
        deletedCount,
        errorCount,
        totalFilesChecked: files.length,
      });

    } catch (err) {
      logger.error('Backup cleanup failed', { error: err.message });
    }
  }
);

// ============================================
// CHAT EXPORT (DOWNLOAD ALL DATA)
// ============================================

const gunzip = promisify(zlib.gunzip);

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function generateExportHtml(chatId, currentData, backupData, userNames) {
  const allMessages = new Map();
  const allReminders = new Map();
  const allNotes = new Map();
  const allPromises = new Map();
  const allDecisions = new Map();
  const allMemories = new Map();
  const allSpecialMessages = new Map();
  const allImportantDates = new Map();

  // Helper to merge data, marking backup-only items as "deleted"
  function mergeData(map, items, fromBackup = false) {
    for (const item of items || []) {
      if (!map.has(item.id)) {
        map.set(item.id, { ...item, _fromBackupOnly: fromBackup });
      }
    }
  }

  // Add current data first
  mergeData(allMessages, currentData.messages, false);
  mergeData(allReminders, currentData.reminders, false);
  mergeData(allNotes, currentData.notes, false);
  mergeData(allPromises, currentData.promises, false);
  mergeData(allDecisions, currentData.decisions, false);
  mergeData(allMemories, currentData.memories, false);
  mergeData(allSpecialMessages, currentData.specialMessages, false);
  mergeData(allImportantDates, currentData.importantDates, false);

  // Add backup data (marks items not in current as deleted)
  if (backupData) {
    mergeData(allMessages, backupData.subcollections?.messages, true);
    mergeData(allReminders, backupData.subcollections?.reminders, true);
    mergeData(allNotes, backupData.subcollections?.notes, true);
    mergeData(allPromises, backupData.subcollections?.promises, true);
    mergeData(allDecisions, backupData.subcollections?.decisions, true);
    mergeData(allMemories, backupData.subcollections?.memories, true);
    mergeData(allSpecialMessages, backupData.subcollections?.specialMessages, true);
    mergeData(allImportantDates, backupData.subcollections?.importantDates, true);
  }

  // Sort messages by date
  const sortedMessages = Array.from(allMessages.values()).sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateA - dateB;
  });

  // Group messages by date
  const messagesByDate = new Map();
  for (const msg of sortedMessages) {
    const dateStr = msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) : 'Unknown Date';
    if (!messagesByDate.has(dateStr)) {
      messagesByDate.set(dateStr, []);
    }
    messagesByDate.get(dateStr).push(msg);
  }

  // Build HTML
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coffee Club - Chat Export</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      margin: 0;
      padding: 20px;
      line-height: 1.5;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #6F4E37; border-bottom: 2px solid #6F4E37; padding-bottom: 10px; }
    h2 { color: #8B4513; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    h3 { color: #666; margin-top: 20px; }
    .meta { color: #888; font-size: 0.9em; margin-bottom: 20px; }
    .date-header {
      background: #6F4E37;
      color: white;
      padding: 8px 15px;
      margin: 20px 0 10px;
      border-radius: 5px;
      font-weight: bold;
    }
    .message {
      background: white;
      padding: 12px 15px;
      margin: 8px 0;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .message.deleted {
      background: #fff3f3;
      border-left: 3px solid #ff6b6b;
    }
    .message .sender {
      font-weight: bold;
      color: #6F4E37;
    }
    .message .time {
      color: #999;
      font-size: 0.8em;
      margin-left: 10px;
    }
    .message .text { margin-top: 5px; }
    .message .attachment {
      color: #666;
      font-style: italic;
      margin-top: 5px;
    }
    .deleted-badge {
      background: #ff6b6b;
      color: white;
      font-size: 0.7em;
      padding: 2px 6px;
      border-radius: 3px;
      margin-left: 8px;
    }
    .item {
      background: white;
      padding: 12px 15px;
      margin: 8px 0;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .item.deleted { background: #fff3f3; border-left: 3px solid #ff6b6b; }
    .item-title { font-weight: bold; color: #333; }
    .item-meta { color: #888; font-size: 0.85em; margin-top: 3px; }
    .item-content { margin-top: 8px; color: #555; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 20px 0; }
    .stat-box { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-number { font-size: 2em; font-weight: bold; color: #6F4E37; }
    .stat-label { color: #888; font-size: 0.9em; }
    .toc { background: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; }
    .toc a { color: #6F4E37; text-decoration: none; display: block; padding: 5px 0; }
    .toc a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>☕ Coffee Club Chat Export</h1>
    <p class="meta">
      Exported: ${formatDate(new Date().toISOString())}<br>
      Chat ID: ${escapeHtml(chatId)}<br>
      ${backupData ? '<span style="color: #6F4E37;">✓ Includes data from backups (deleted items marked in red)</span>' : ''}
    </p>

    <div class="stats">
      <div class="stat-box">
        <div class="stat-number">${allMessages.size}</div>
        <div class="stat-label">Messages</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${allReminders.size}</div>
        <div class="stat-label">Reminders</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${allNotes.size}</div>
        <div class="stat-label">Notes</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${allMemories.size}</div>
        <div class="stat-label">Memories</div>
      </div>
    </div>

    <div class="toc">
      <strong>Contents:</strong>
      <a href="#messages">Messages (${allMessages.size})</a>
      <a href="#reminders">Reminders (${allReminders.size})</a>
      <a href="#notes">Notes (${allNotes.size})</a>
      <a href="#promises">Promises (${allPromises.size})</a>
      <a href="#decisions">Decisions (${allDecisions.size})</a>
      <a href="#memories">Memories (${allMemories.size})</a>
      <a href="#special">Special Messages (${allSpecialMessages.size})</a>
      <a href="#dates">Important Dates (${allImportantDates.size})</a>
    </div>

    <h2 id="messages">Messages</h2>`;

  // Add messages grouped by date
  for (const [dateStr, messages] of messagesByDate) {
    html += `\n    <div class="date-header">${escapeHtml(dateStr)}</div>`;
    for (const msg of messages) {
      const senderName = userNames[msg.senderId] || msg.senderId || 'Unknown';
      const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }) : '';
      const deletedClass = msg._fromBackupOnly ? ' deleted' : '';
      const deletedBadge = msg._fromBackupOnly ? '<span class="deleted-badge">DELETED</span>' : '';

      html += `
    <div class="message${deletedClass}">
      <span class="sender">${escapeHtml(senderName)}</span>
      <span class="time">${time}</span>
      ${deletedBadge}`;

      if (msg.text) {
        html += `\n      <div class="text">${escapeHtml(msg.text)}</div>`;
      }

      if (msg.type === 'file' || msg.type === 'voice') {
        const fileType = msg.type === 'voice' ? 'Voice Note' :
                        (msg.file?.contentType?.startsWith('image/') ? 'Photo' : 'File');
        html += `\n      <div class="attachment">📎 ${fileType}${msg.file?.storagePath ? ` (${escapeHtml(msg.file.storagePath)})` : ''}</div>`;
      }

      html += `\n    </div>`;
    }
  }

  // Helper to render a collection
  function renderCollection(id, title, items, renderItem) {
    html += `\n    <h2 id="${id}">${title}</h2>`;
    const sortedItems = Array.from(items.values()).sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
    if (sortedItems.length === 0) {
      html += `\n    <p style="color: #888;">No ${title.toLowerCase()} found.</p>`;
    } else {
      for (const item of sortedItems) {
        html += renderItem(item);
      }
    }
  }

  // Reminders
  renderCollection('reminders', 'Reminders', allReminders, (r) => {
    const deletedClass = r._fromBackupOnly ? ' deleted' : '';
    const deletedBadge = r._fromBackupOnly ? '<span class="deleted-badge">DELETED</span>' : '';
    const status = r.completed ? '✅ Completed' : '⏳ Pending';
    return `
    <div class="item${deletedClass}">
      <div class="item-title">${escapeHtml(r.title || 'Untitled')} ${deletedBadge}</div>
      <div class="item-meta">${status} | Created: ${formatDate(r.createdAt)}${r.dueAt ? ` | Due: ${formatDate(r.dueAt)}` : ''}</div>
      ${r.notes ? `<div class="item-content">${escapeHtml(r.notes)}</div>` : ''}
    </div>`;
  });

  // Notes
  renderCollection('notes', 'Notes', allNotes, (n) => {
    const deletedClass = n._fromBackupOnly ? ' deleted' : '';
    const deletedBadge = n._fromBackupOnly ? '<span class="deleted-badge">DELETED</span>' : '';
    return `
    <div class="item${deletedClass}">
      <div class="item-title">${escapeHtml(n.title || 'Untitled')} ${deletedBadge}</div>
      <div class="item-meta">Created: ${formatDate(n.createdAt)}</div>
      ${n.content ? `<div class="item-content">${escapeHtml(n.content)}</div>` : ''}
    </div>`;
  });

  // Promises
  renderCollection('promises', 'Promises', allPromises, (p) => {
    const deletedClass = p._fromBackupOnly ? ' deleted' : '';
    const deletedBadge = p._fromBackupOnly ? '<span class="deleted-badge">DELETED</span>' : '';
    const status = p.fulfilled ? '✅ Fulfilled' : '🤝 Active';
    return `
    <div class="item${deletedClass}">
      <div class="item-title">${escapeHtml(p.text || p.title || 'Promise')} ${deletedBadge}</div>
      <div class="item-meta">${status} | Created: ${formatDate(p.createdAt)}</div>
    </div>`;
  });

  // Decisions
  renderCollection('decisions', 'Decisions', allDecisions, (d) => {
    const deletedClass = d._fromBackupOnly ? ' deleted' : '';
    const deletedBadge = d._fromBackupOnly ? '<span class="deleted-badge">DELETED</span>' : '';
    return `
    <div class="item${deletedClass}">
      <div class="item-title">${escapeHtml(d.title || d.text || 'Decision')} ${deletedBadge}</div>
      <div class="item-meta">Decided: ${formatDate(d.createdAt)}</div>
      ${d.context ? `<div class="item-content">${escapeHtml(d.context)}</div>` : ''}
    </div>`;
  });

  // Memories
  renderCollection('memories', 'Memories', allMemories, (m) => {
    const deletedClass = m._fromBackupOnly ? ' deleted' : '';
    const deletedBadge = m._fromBackupOnly ? '<span class="deleted-badge">DELETED</span>' : '';
    return `
    <div class="item${deletedClass}">
      <div class="item-title">${escapeHtml(m.title || 'Memory')} ${deletedBadge}</div>
      <div class="item-meta">Created: ${formatDate(m.createdAt)}</div>
      ${m.content || m.text ? `<div class="item-content">${escapeHtml(m.content || m.text)}</div>` : ''}
    </div>`;
  });

  // Special Messages
  renderCollection('special', 'Special Messages', allSpecialMessages, (s) => {
    const deletedClass = s._fromBackupOnly ? ' deleted' : '';
    const deletedBadge = s._fromBackupOnly ? '<span class="deleted-badge">DELETED</span>' : '';
    const typeEmoji = { love_note: '💝', appreciation: '🌟', apology: '💐', encouragement: '💪' };
    return `
    <div class="item${deletedClass}">
      <div class="item-title">${typeEmoji[s.type] || '💌'} ${escapeHtml(s.type || 'Special Message')} ${deletedBadge}</div>
      <div class="item-meta">Created: ${formatDate(s.createdAt)}</div>
      ${s.message ? `<div class="item-content">${escapeHtml(s.message)}</div>` : ''}
    </div>`;
  });

  // Important Dates
  renderCollection('dates', 'Important Dates', allImportantDates, (d) => {
    const deletedClass = d._fromBackupOnly ? ' deleted' : '';
    const deletedBadge = d._fromBackupOnly ? '<span class="deleted-badge">DELETED</span>' : '';
    return `
    <div class="item${deletedClass}">
      <div class="item-title">${escapeHtml(d.title || d.name || 'Important Date')} ${deletedBadge}</div>
      <div class="item-meta">Date: ${formatDate(d.date)}</div>
      ${d.notes ? `<div class="item-content">${escapeHtml(d.notes)}</div>` : ''}
    </div>`;
  });

  html += `
  </div>
</body>
</html>`;

  return html;
}

exports.exportChatHistory = onCall(
  {
    timeoutSeconds: 300,
    memory: '1GiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const uid = request.auth.uid;
    const { chatId, includeBackups = true } = request.data;

    if (!chatId || typeof chatId !== 'string') {
      throw new HttpsError('invalid-argument', 'chatId is required');
    }

    // Verify membership
    const chatDoc = await db.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) {
      throw new HttpsError('not-found', 'Chat not found');
    }

    const chatData = chatDoc.data();
    if (!chatData.members?.includes(uid)) {
      throw new HttpsError('permission-denied', 'Not a member of this chat');
    }

    logger.info('Starting chat export', { chatId, uid, includeBackups });

    // Collect current data from Firestore
    const currentData = {
      messages: [],
      reminders: [],
      notes: [],
      promises: [],
      decisions: [],
      memories: [],
      specialMessages: [],
      importantDates: [],
    };

    // Fetch all current subcollections
    for (const [key, _] of Object.entries(currentData)) {
      try {
        const snapshot = await db.collection(`chats/${chatId}/${key}`).get();
        currentData[key] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...serializeFirestoreData(doc.data()),
        }));
      } catch (err) {
        logger.warn(`Error fetching ${key}:`, err.message);
      }
    }

    // Get user display names
    const userNames = {};
    for (const memberId of chatData.members || []) {
      try {
        const userDoc = await db.collection('users').doc(memberId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userNames[memberId] = userData.displayName || userData.name || memberId;
        }
      } catch (err) {
        userNames[memberId] = memberId;
      }
    }

    // Try to fetch most recent backup for deleted data
    let backupData = null;
    if (includeBackups) {
      const bucketName = getBackupBucket();
      if (bucketName) {
        try {
          const bucket = storage.bucket(bucketName);
          const [files] = await bucket.getFiles({
            prefix: 'backups/chats/',
            maxResults: 500,
          });

          // Find most recent backup for this chat
          const chatBackups = files
            .filter((f) => f.name.includes(`chat-${chatId}.json.gz`))
            .sort((a, b) => b.name.localeCompare(a.name));

          if (chatBackups.length > 0) {
            const latestBackup = chatBackups[0];
            logger.info('Found backup:', latestBackup.name);

            const [compressedContent] = await latestBackup.download();
            const decompressed = await gunzip(compressedContent);
            backupData = JSON.parse(decompressed.toString('utf8'));
          }
        } catch (err) {
          logger.warn('Error reading backup:', err.message);
        }
      }
    }

    // Generate HTML
    const htmlContent = generateExportHtml(chatId, currentData, backupData, userNames);

    logger.info('Chat export complete', {
      chatId,
      messageCount: currentData.messages.length,
      hasBackupData: !!backupData,
      htmlSize: htmlContent.length,
    });

    // Return HTML content directly (avoids needing signed URL permissions)
    return {
      success: true,
      htmlContent,
      stats: {
        messages: currentData.messages.length,
        reminders: currentData.reminders.length,
        notes: currentData.notes.length,
        memories: currentData.memories.length,
        includesDeletedData: !!backupData,
      },
    };
  }
);

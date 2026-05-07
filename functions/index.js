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

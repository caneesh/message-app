const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const RATE_LIMITS = {
  toneRepair: { max: 10, windowType: 'hour' },
  messageToTask: { max: 20, windowType: 'day' },
  misunderstandingHelper: { max: 10, windowType: 'hour' },
};

function getWindowKey(feature, windowType) {
  const now = new Date();
  if (windowType === 'hour') {
    return `${feature}_${now.toISOString().slice(0, 13)}`;
  }
  return `${feature}_${now.toISOString().slice(0, 10)}`;
}

function getWindowEnd(windowType) {
  const now = new Date();
  if (windowType === 'hour') {
    return new Date(now.getTime() + 3600000);
  }
  return new Date(now.getTime() + 86400000);
}

async function checkAndIncrementRateLimit(db, uid, feature) {
  const limits = RATE_LIMITS[feature];
  if (!limits) {
    throw new Error(`Unknown feature: ${feature}`);
  }

  const windowKey = getWindowKey(feature, limits.windowType);
  const usageRef = db.doc(`users/${uid}/aiUsage/${windowKey}`);

  const result = await db.runTransaction(async (transaction) => {
    const usageDoc = await transaction.get(usageRef);
    const currentCount = usageDoc.exists ? usageDoc.data().count : 0;

    if (currentCount >= limits.max) {
      return { allowed: false, currentCount, limit: limits.max };
    }

    const updateData = {
      windowId: windowKey,
      feature,
      count: currentCount + 1,
      windowEnd: getWindowEnd(limits.windowType),
      lastRequestAt: FieldValue.serverTimestamp(),
    };

    if (!usageDoc.exists) {
      updateData.windowStart = FieldValue.serverTimestamp();
    }

    transaction.set(usageRef, updateData, { merge: true });

    return { allowed: true, currentCount: currentCount + 1, limit: limits.max };
  });

  return result;
}

async function getRateLimitStatus(db, uid, feature) {
  const limits = RATE_LIMITS[feature];
  if (!limits) return null;

  const windowKey = getWindowKey(feature, limits.windowType);
  const usageRef = db.doc(`users/${uid}/aiUsage/${windowKey}`);
  const usageDoc = await usageRef.get();

  if (!usageDoc.exists) {
    return { used: 0, limit: limits.max, remaining: limits.max };
  }

  const count = usageDoc.data().count || 0;
  return { used: count, limit: limits.max, remaining: Math.max(0, limits.max - count) };
}

module.exports = {
  checkAndIncrementRateLimit,
  getRateLimitStatus,
  RATE_LIMITS,
  getWindowKey,
};

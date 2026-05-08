const SENSITIVE_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, name: 'SSN with dashes' },
  { pattern: /\b\d{9}\b/, name: 'SSN without dashes', minContext: true },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, name: 'Credit card' },
  { pattern: /\b\d{13,19}\b/, name: 'Credit card no separators', minContext: true },
  { pattern: /password\s*[:=]\s*\S+/i, name: 'Password pattern' },
  { pattern: /\bpin\s*[:=]\s*\d{4,}/i, name: 'PIN pattern' },
  { pattern: /\b[A-Z]{1,2}\d{6,9}\b/, name: 'Passport-like' },
  { pattern: /\bssn\s*[:=]?\s*\d/i, name: 'SSN label' },
  { pattern: /\bcvv\s*[:=]?\s*\d{3,4}/i, name: 'CVV pattern' },
  { pattern: /\brouting\s*(number|#)?\s*[:=]?\s*\d{9}/i, name: 'Routing number' },
  { pattern: /\baccount\s*(number|#|num)?\s*[:=]?\s*\d{8,17}/i, name: 'Account number' },
];

const FALSE_POSITIVE_PATTERNS = [
  /\b\d{3}-\d{3}-\d{4}\b/,  // Phone number
  /\b\d{5}(-\d{4})?\b/,      // ZIP code
  /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/, // Date
  /\b\d{1,2}:\d{2}(:\d{2})?\b/, // Time
];

function containsSensitiveData(text) {
  if (!text || typeof text !== 'string') return false;

  for (const { pattern, minContext } of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        const matchedText = match[0];
        let isFalsePositive = false;
        for (const fpPattern of FALSE_POSITIVE_PATTERNS) {
          if (fpPattern.test(matchedText)) {
            isFalsePositive = true;
            break;
          }
        }
        if (!isFalsePositive) {
          if (minContext && matchedText.length < 10) {
            continue;
          }
          return true;
        }
      }
    }
  }
  return false;
}

function sanitizeForPreview(text, maxLength = 100) {
  if (!text || typeof text !== 'string') return '';
  let sanitized = text.slice(0, maxLength);
  sanitized = sanitized.replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, '[REDACTED]');
  sanitized = sanitized.replace(/\d{3}-\d{2}-\d{4}/g, '[REDACTED]');
  sanitized = sanitized.replace(/password\s*[:=]\s*\S+/gi, 'password: [REDACTED]');
  return sanitized;
}

module.exports = {
  containsSensitiveData,
  sanitizeForPreview,
  SENSITIVE_PATTERNS,
};

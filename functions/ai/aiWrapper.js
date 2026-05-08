const Anthropic = require('@anthropic-ai/sdk');
const { containsSensitiveData } = require('./sensitiveDataFilter');

const AI_TIMEOUT_MS = 10000;

function getAIClient() {
  const apiKey = process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('AI API key not configured');
  }
  return new Anthropic({ apiKey });
}

function getModel(type = 'fast') {
  if (type === 'smart') {
    return process.env.AI_MODEL_SMART || 'claude-sonnet-4-20250514';
  }
  return process.env.AI_MODEL_FAST || 'claude-haiku-4-5-20251001';
}

async function callAI(systemPrompt, userMessage, options = {}) {
  const { maxTokens = 500, modelType = 'fast' } = options;
  const model = getModel(modelType);

  if (containsSensitiveData(userMessage)) {
    return {
      success: false,
      error: 'SENSITIVE_DATA_IN_INPUT',
      content: null,
    };
  }

  const client = getAIClient();

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('AI_TIMEOUT')), AI_TIMEOUT_MS);
  });

  try {
    const responsePromise = client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const response = await Promise.race([responsePromise, timeoutPromise]);
    const content = response.content[0]?.text || '';

    if (containsSensitiveData(content)) {
      return {
        success: false,
        error: 'SENSITIVE_DATA_IN_OUTPUT',
        content: null,
      };
    }

    return {
      success: true,
      content,
      model,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    };
  } catch (error) {
    if (error.message === 'AI_TIMEOUT') {
      return { success: false, error: 'AI_TIMEOUT', content: null };
    }
    return { success: false, error: error.message || 'AI_PROVIDER_ERROR', content: null };
  }
}

function parseJSONResponse(content) {
  if (!content) return null;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = {
  callAI,
  parseJSONResponse,
  getModel,
  AI_TIMEOUT_MS,
};

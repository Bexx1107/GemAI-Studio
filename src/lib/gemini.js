import { GoogleGenAI } from '@google/genai';
import { STYLE_GUIDES, ENTITY_INSTRUCTIONS, MODELS } from './constants.js';

// ─── SDK Init ──────────────────────────────────────────────────

function getAI(apiKey) {
  return new GoogleGenAI({ apiKey });
}

// ─── Helpers ───────────────────────────────────────────────────

function getModelId(modelKey) {
  return MODELS[modelKey]?.id || MODELS.standard.id;
}

function getImageConfig(modelId, aspectRatio, resolution) {
  const config = {
    aspectRatio: (!aspectRatio || aspectRatio === 'auto') ? '16:9' : aspectRatio,
  };

  // imageSize only supported on non-standard models
  if (modelId !== MODELS.standard.id && resolution && resolution !== 'auto') {
    config.imageSize = resolution;
  }

  return config;
}

function getAspectRatioDescription(ratio) {
  if (!ratio || ratio === 'auto') ratio = '16:9';
  const map = {
    '16:9': '16:9 LANDSCAPE',
    '3:2': '3:2 PHOTO LANDSCAPE',
    '4:3': '4:3 CLASSIC',
    '5:4': '5:4 SOCIAL',
    '1:1': '1:1 SQUARE',
    '4:5': '4:5 INSTAGRAM',
    '9:16': '9:16 PORTRAIT',
    '3:4': '3:4 TALL',
    '2:3': '2:3 POSTER',
  };
  return map[ratio] || `${ratio}`;
}

function extractImageFromResponse(response) {
  const firstCandidate = response.candidates?.[0];
  if (!firstCandidate) {
    throw new Error('Generation failed: No response from model.');
  }

  const reason = firstCandidate.finishReason;
  if (reason === 'IMAGE_SAFETY' || reason === 'SAFETY') {
    throw new Error('SAFETY_BLOCK: Image blocked by safety filters. Try rephrasing your prompt.');
  }

  const parts = firstCandidate.content?.parts || [];
  let image = null;
  let text = '';

  for (const part of parts) {
    if (part.inlineData) {
      image = {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
      };
    }
    if (part.text) {
      text += part.text;
    }
  }

  if (!image && text) {
    throw new Error(`Model Refusal: ${text}`);
  }
  if (!image) {
    throw new Error('Generation failed: No image returned by the model.');
  }

  return { image, text };
}

// ─── Retry Wrapper ─────────────────────────────────────────────

async function withRetry(fn, { maxRetries = 3, baseDelay = 1000 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err.message || '';
      const status = err.status || err.httpStatusCode || 0;

      // Retry on 500/503 server errors or safety blocks
      const isRetryable =
        status === 500 ||
        status === 503 ||
        msg.includes('500') ||
        msg.includes('503') ||
        msg.includes('SAFETY_BLOCK');

      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// ─── Core Generation ───────────────────────────────────────────

export async function generateImage(apiKey, {
  modelKey,
  prompt,
  styleGuideKey,
  customStyleGuide,
  entityRefs = [],
  generalRefs = [],
  aspectRatio = '16:9',
  resolution = '2K',
}) {
  const ai = getAI(apiKey);
  const modelId = getModelId(modelKey);

  // ── 6-Part Prompt Construction ──

  const parts = [];

  // Part 1: System Instruction
  parts.push({
    text: 'Generate an image using the style guide and reference images provided below. The JSON style guide is the primary source of visual rules.',
  });

  // Part 2: Style Guide (JSON or custom text)
  const sg = STYLE_GUIDES[styleGuideKey];
  if (styleGuideKey === 'custom' && customStyleGuide?.trim()) {
    parts.push({ text: customStyleGuide.trim() });
  } else if (sg?.guide) {
    parts.push({
      text: typeof sg.guide === 'string' ? sg.guide : JSON.stringify(sg.guide, null, 2),
    });
  }

  // Part 3: Additional Instructions
  if (sg?.additionalInstructions) {
    parts.push({ text: '**ADDITIONAL INSTRUCTIONS:** ' + sg.additionalInstructions });
  }

  // Part 4: Scene Prompt
  parts.push({ text: `Scene: ${prompt}` });

  // Part 5: Reference Images (general refs + @mentioned entity refs)
  if (generalRefs.length > 0) {
    for (const img of generalRefs) {
      parts.push({
        inlineData: { mimeType: img.mimeType, data: img.base64 },
      });
    }
  }

  // Entity @mentions
  for (const ref of entityRefs) {
    if (!prompt.includes(`@${ref.name}`)) continue;

    const refInstruction = ENTITY_INSTRUCTIONS[ref.type] || '';
    parts.push({
      text: `**${ref.type.toUpperCase()} REFERENCE (@${ref.name}):** ${refInstruction}`,
    });
    parts.push({
      inlineData: { mimeType: ref.mimeType, data: ref.base64 },
    });
  }

  // Part 6: Final Command with aspect ratio
  parts.push({ text: `Output ${getAspectRatioDescription(aspectRatio)}.` });

  // ── Build Request Payload ──

  const requestPayload = {
    model: modelId,
    contents: { parts },
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: getImageConfig(modelId, aspectRatio, resolution),
    },
  };

  // ── Execute with Retry ──

  return withRetry(async () => {
    const response = await ai.models.generateContent(requestPayload);
    return extractImageFromResponse(response);
  }, { maxRetries: 3, baseDelay: 1500 });
}

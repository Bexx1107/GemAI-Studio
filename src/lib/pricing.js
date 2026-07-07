// ── GemAI Studio — Client-side Pricing & Usage Tracking ────────
// Ported from DMD Studio's usageTracker.js (July 2026 pricing)

// ── Model Pricing (per 1M tokens) ──────────────────────────────
const PRICING = {
  'gemini-2.5-flash-image':         { inputPer1M: 0.50,  outputPer1M: 30.00,  label: 'Banana',      defaultOutputTokens: 1120 },
  'gemini-3-pro-image-preview':     { inputPer1M: 2.00,  outputPer1M: 120.00, label: 'Banana Pro',   defaultOutputTokens: 1120 },
  'gemini-3-pro-image':             { inputPer1M: 2.00,  outputPer1M: 120.00, label: 'Banana Pro',   defaultOutputTokens: 1120 },
  'gemini-3.1-flash-image-preview': { inputPer1M: 0.50,  outputPer1M: 60.00,  label: 'Banana 2',    defaultOutputTokens: 1120 },
  'gemini-3.1-flash-image':         { inputPer1M: 0.50,  outputPer1M: 60.00,  label: 'Banana 2',    defaultOutputTokens: 1120 },
  'gemini-3.1-flash-lite-image':    { inputPer1M: 0.25,  outputPer1M: 34.00,  label: 'Banana Lite', defaultOutputTokens: 1120 },
};

// Resolution → approximate output tokens
const RESOLUTION_TOKENS = {
  'auto': 1120,
  '512':  747,
  '1K':   1120,
  '2K':   1680,
  '4K':   2520,
};

// ── Token Estimation ────────────────────────────────────────────
function estimateTextTokens(text) {
  if (!text) return 0;
  return Math.ceil(String(text).length / 4);
}

function calculateCost(modelId, inputTokens, outputTokens) {
  const pricing = PRICING[modelId];
  if (!pricing) return 0;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return inputCost + outputCost;
}

// ── Live Cost Estimation (UI preview) ───────────────────────────
export function estimateLiveCost(modelId, promptText = '', refImageCount = 0, resolution = 'auto', imageCount = 1, styleGuideText = '') {
  const pricing = PRICING[modelId];
  if (!pricing) return { inputTokens: 0, outputTokens: 0, costPerImage: 0, totalCost: 0, modelLabel: modelId };

  // Input tokens: prompt + system overhead + style guide + image refs
  const promptTokens = estimateTextTokens(promptText);
  const styleTokens = estimateTextTokens(styleGuideText);
  const systemOverhead = 200; // aspect ratio text, entity instructions, etc.
  const imageRefTokens = refImageCount * 258; // Google's standard per-image token count
  const inputTokens = promptTokens + systemOverhead + styleTokens + imageRefTokens;

  // Output tokens: resolution-based
  const outputTokens = RESOLUTION_TOKENS[resolution] || RESOLUTION_TOKENS['auto'];

  const costPerImage = calculateCost(modelId, inputTokens, outputTokens);
  const totalCost = costPerImage * imageCount;

  return {
    inputTokens,
    outputTokens,
    costPerImage,
    totalCost,
    modelLabel: pricing.label || modelId,
  };
}

// ── Usage Log (localStorage-backed) ─────────────────────────────
const STORAGE_KEY = 'gemai_usage_log';

function getLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveLog(log) {
  // Keep last 500 entries
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(-500)));
}

export function logGeneration({
  modelId,
  inputTokens = 0,
  outputTokens = 0,
  durationMs = 0,
  success = true,
  error = '',
  resolution = 'auto',
  imageCount = 1,
}) {
  const pricing = PRICING[modelId];
  if (!pricing && outputTokens === 0) {
    outputTokens = RESOLUTION_TOKENS[resolution] || RESOLUTION_TOKENS['auto'];
  }
  if (pricing && outputTokens === 0) {
    outputTokens = RESOLUTION_TOKENS[resolution] || pricing.defaultOutputTokens || 1120;
  }

  const cost = calculateCost(modelId, inputTokens, outputTokens) * imageCount;
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    modelId,
    modelLabel: pricing?.label || modelId,
    inputTokens,
    outputTokens,
    imageCount,
    estimatedCostUSD: cost,
    durationMs: Math.round(durationMs),
    success,
    error: error ? String(error).slice(0, 200) : '',
  };

  const log = getLog();
  log.push(entry);
  saveLog(log);
  return entry;
}

export function getUsageStats() {
  const entries = getLog();
  const totalCost = entries.reduce((s, e) => s + (e.estimatedCostUSD || 0), 0);
  const totalImages = entries.filter(e => e.success).reduce((s, e) => s + (e.imageCount || 1), 0);
  const totalCalls = entries.length;
  return { totalCost, totalImages, totalCalls, entries };
}

export function clearUsageLog() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getModelPricing(modelId) {
  return PRICING[modelId] || null;
}

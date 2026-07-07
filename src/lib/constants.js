// ─── GemAI Studio Constants ────────────────────────────────────
// Clean, curated constants for the GemAI Studio app.
// NOT a copy of the full DMD Studio config.

// ─── Models ────────────────────────────────────────────────────
// These are the REAL Gemini image model IDs

export const MODELS = {
  standard: { id: 'gemini-2.5-flash-image', label: 'Banana', desc: 'Fast & affordable. Great for quick iterations.' },
  banana2lite: { id: 'gemini-3.1-flash-lite-image', label: 'Banana Lite', desc: 'Fastest & cheapest. 1K resolution only.' },
  banana2: { id: 'gemini-3.1-flash-image-preview', label: 'Banana 2', desc: 'Next-gen fast model. Speed + quality balance.' },
  pro: { id: 'gemini-3-pro-image-preview', label: 'Banana Pro', desc: 'Highest quality. Best for final renders.' },
};

export const MODEL_DISPLAY = {
  standard: { emoji: '🍌', label: 'Banana' },
  banana2lite: { emoji: '🍌', label: 'Banana Lite' },
  banana2: { emoji: '🍌', label: 'Banana 2' },
  pro: { emoji: '🍌', label: 'Banana Pro' },
};

// ─── Aspect Ratios ─────────────────────────────────────────────

export const ASPECT_RATIOS = [
  { key: '16:9', label: '16:9', sub: 'Landscape', icon: '▬' },
  { key: '3:2', label: '3:2', sub: 'Photo', icon: '▬' },
  { key: '4:3', label: '4:3', sub: 'Classic', icon: '▬' },
  { key: '5:4', label: '5:4', sub: 'Social', icon: '▬' },
  { key: '1:1', label: '1:1', sub: 'Square', icon: '■' },
  { key: '4:5', label: '4:5', sub: 'Insta', icon: '▮' },
  { key: '9:16', label: '9:16', sub: 'Portrait', icon: '▮' },
  { key: '3:4', label: '3:4', sub: 'Tall', icon: '▮' },
  { key: '2:3', label: '2:3', sub: 'Poster', icon: '▮' },
];

// ─── Resolutions ───────────────────────────────────────────────

export const RESOLUTIONS = [
  { key: 'auto', label: 'Auto' },
  { key: '512', label: '512px' },
  { key: '1K', label: '1K' },
  { key: '2K', label: '2K' },
  { key: '4K', label: '4K' },
];

// ─── Style Guides ──────────────────────────────────────────────
// Ported from original DMD Studio — curated selection for GemAI Studio

export const STYLE_GUIDES = {
  none: { label: 'No Style Guide' },
  custom: { label: '✏️ Custom Style Guide' },
};

// ─── Entity Reference Instructions ─────────────────────────────

export const ENTITY_INSTRUCTIONS = {
  character: 'You MUST replicate this character\'s appearance, clothing, and facial features with 100% fidelity. Do not alter facial identity, clothing design, or character proportions. Pose and body language MUST change to accurately reflect the scene.',
  logo: 'You MUST replicate this logo with 100% perfect accuracy. DO NOT alter, distort, reinterpret, or modify the logo in any way.',
  asset: 'Use this as a strict visual reference. Generate this exact item in the scene, maintaining its design, color, and key features.',
  location: 'Treat this as world-building material — extract the environment\'s visual DNA: architecture style, materials, textures, color palette, lighting mood. Reconstruct this type of environment so it feels like the same world/place.',
};

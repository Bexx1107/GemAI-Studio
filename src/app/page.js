"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, Image as ImageIcon, Palette, Grid3x3,
  History, ChevronDown, Plus, X, Download, Eye,
  EyeOff, AlertTriangle, RefreshCw, Trash2, Key, User,
  FastForward, PenTool, Sun, Moon
} from 'lucide-react';
import { MODELS, MODEL_DISPLAY, STYLE_GUIDES, ASPECT_RATIOS, RESOLUTIONS } from '@/lib/constants';
import { generateImage } from '@/lib/gemini';
import { resizeImage, downloadImage, imageToDataUrl } from '@/lib/imageUtils';
import { estimateLiveCost, logGeneration } from '@/lib/pricing';

// ─── Sidebar ────────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, apiKey, setApiKey, lightMode, setLightMode, expanded, setExpanded }) {
  const [showKey, setShowKey] = useState(false);

  const tabs = [
    { id: 'generate', label: 'Generator', icon: Sparkles },
    { id: 'character', label: 'Character', icon: User },
    { id: 'restyle', label: 'Restyler', icon: Palette },
    { id: 'continue', label: 'Continue', icon: FastForward },
    { id: 'grid', label: 'Grider', icon: Grid3x3 },
    { id: 'draw', label: 'Draw Edit', icon: PenTool },
    { id: 'gallery', label: 'Gallery', icon: History },
  ];

  return (
    <aside
      className={`sidebar ${expanded ? 'expanded' : ''}`}
      onClick={() => { if (!expanded) setExpanded(true); }}
      style={{ cursor: expanded ? 'default' : 'pointer' }}
    >
      <div className="sidebar-brand" onClick={(e) => {
        if (expanded) {
          e.stopPropagation();
          setExpanded(false);
        }
      }} style={{ cursor: 'pointer' }}>
        <div className="sidebar-brand-icon">
          <Sparkles size={18} color="var(--accent)" />
        </div>
        <div className="sidebar-brand-text">
          <h1>GemAI <span>Studio</span></h1>
          <div className="sidebar-brand-sub">AI Image Platform</div>
        </div>
      </div>

      {/* Theme toggle */}
      <button className="theme-toggle" onClick={(e) => { e.stopPropagation(); setLightMode(!lightMode); }} title={lightMode ? 'Dark mode' : 'Light mode'}>
        {lightMode ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      <div className="sidebar-divider" />
      <div className="sidebar-section-label">Workspace</div>

      <nav className="sidebar-nav">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`sidebar-nav-item ${activeTab === id ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setActiveTab(id); }}
          >
            <Icon size={18} className="nav-icon" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="api-key-collapsed-icon">
          <Key size={16} />
        </div>
        <div className="api-key-section">
          <label><Key size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Gemini API Key</label>
          <div className="api-key-row">
            <input
              type={showKey ? 'text' : 'password'}
              className="api-key-input"
              placeholder="AIza..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="api-key-status">
            <span className={`status-dot ${apiKey ? 'connected' : 'disconnected'}`} />
            <span>{apiKey ? 'Key set · stored locally' : 'No API key'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Reference Image Upload ─────────────────────────────────────
function RefUpload({ refs, setRefs }) {
  const fileInputRef = useRef(null);
  const handleFiles = async (files) => {
    for (const file of files) {
      try {
        const img = await resizeImage(file);
        setRefs(prev => [...prev, { ...img, name: file.name.replace(/\.[^.]+$/, '') }]);
      } catch (e) { console.error('Failed to process image:', e); }
    }
  };
  return (
    <div className="ref-upload-zone">
      {refs.map((ref, i) => (
        <div key={i} className="ref-thumb">
          <img src={imageToDataUrl(ref.base64, ref.mimeType)} alt={ref.name} />
          <button className="ref-thumb-remove" onClick={() => setRefs(prev => prev.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button className="ref-add-btn" onClick={() => fileInputRef.current?.click()}>
        <Plus size={18} />
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={(e) => { handleFiles(Array.from(e.target.files)); e.target.value = ''; }}
      />
    </div>
  );
}

// ─── Lightbox ───────────────────────────────────────────────────
function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <img src={src} alt="" className="lightbox-img" onClick={(e) => e.stopPropagation()} />
      <button className="lightbox-close" onClick={onClose}>✕</button>
    </div>
  );
}

// ─── Tab Placeholder ────────────────────────────────────────────
const TAB_INFO = {
  character: { icon: User, title: 'Character Builder', desc: 'Create consistent character sheets from a source image or text description. Generates T-pose reference images with style control.', features: ['Source image extraction', 'T-pose sheet generation', 'Style reference matching', 'Custom modifications'] },
  restyle: { icon: Palette, title: 'Image Restyler', desc: 'Transform existing images into different visual styles. Upload a source image and apply style guides or reference images to redraw it.', features: ['Style transfer', 'Freedom control', 'Reference-based restyling', 'Custom style guides'] },
  continue: { icon: FastForward, title: 'Continue Scene', desc: 'Extend a generated image — continue the scene by expanding the composition or generating follow-up frames.', features: ['Scene continuation', 'Directional expansion', 'Style carry-over', 'Multi-frame sequences'] },
  grid: { icon: Grid3x3, title: 'Grider', desc: 'Generate and split 3×3 grids — character sheets, outfit variations, cinematic angles, or item variations from a single prompt.', features: ['Character outfit grids', 'Cinematic angle sheets', 'Item variation grids', '360° scene orbits'] },
  draw: { icon: PenTool, title: 'Draw to Edit', desc: 'Draw annotations on an image to guide edits. Circle, arrow, or scribble on areas you want changed — the AI interprets your markings.', features: ['Annotation-based editing', 'Region-specific changes', 'Clean output', 'Original comparison'] },
  gallery: { icon: History, title: 'Gallery', desc: 'Browse, search, and manage all your previously generated images. Persistent local storage keeps your history across sessions.', features: ['Full generation history', 'Search by prompt', 'Re-use as reference', 'Export & download'] },
};

function TabPlaceholder({ tabId }) {
  const info = TAB_INFO[tabId] || { icon: Sparkles, title: tabId, desc: '', features: [] };
  const TabIcon = info.icon;
  return (
    <div className="empty-state" style={{ height: '100%' }}>
      <div className="empty-state-icon">
        <TabIcon size={32} color="var(--accent)" />
      </div>
      <h3>{info.title}</h3>
      <p>{info.desc}</p>
      {info.features.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 }}>
          {info.features.map((f, i) => (
            <span key={i} style={{ padding: '4px 12px', borderRadius: 6, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{f}</span>
          ))}
        </div>
      )}
      <p style={{ marginTop: 16, fontSize: '0.7rem', color: 'var(--text-dim)' }}>Coming soon — Generator is fully functional now.</p>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function Home() {
  const [activeTab, setActiveTab] = useState('generate');
  const [expanded, setExpanded] = useState(false);

  // Theme
  const [lightMode, setLightModeState] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('gemai_theme');
    if (saved === 'light') setLightModeState(true);
  }, []);
  const setLightMode = (on) => {
    setLightModeState(on);
    localStorage.setItem('gemai_theme', on ? 'light' : 'dark');
  };
  useEffect(() => {
    document.body.classList.toggle('light-mode', lightMode);
  }, [lightMode]);

  // API key
  const [apiKey, setApiKeyState] = useState('');
  useEffect(() => {
    const saved = localStorage.getItem('gemai_api_key');
    if (saved) setApiKeyState(saved);
  }, []);
  const setApiKey = (key) => { setApiKeyState(key); localStorage.setItem('gemai_api_key', key); };

  // Generation settings
  const [prompt, setPrompt] = useState('');
  const [modelKey, setModelKey] = useState('pro');
  const [styleKey, setStyleKey] = useState('none');
  const [customStyleGuide, setCustomStyleGuide] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('2K');
  const [imageCount, setImageCount] = useState(1);
  const [generalRefs, setGeneralRefs] = useState([]);

  // Gallery
  const [galleryResults, setGalleryResults] = useState([]);
  const [error, setError] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Generate
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !apiKey) return;
    setError('');
    const batchId = crypto.randomUUID();
    const placeholders = Array.from({ length: imageCount }, (_, i) => ({
      id: `${batchId}-${i}`, prompt: prompt.trim(), _pending: true, timestamp: Date.now(),
    }));
    setGalleryResults(prev => [...placeholders, ...prev].slice(0, 30));

    Array.from({ length: imageCount }, (_, i) => {
      const startTime = Date.now();
      const modelId = MODELS[modelKey]?.id || modelKey;
      generateImage(apiKey, {
        modelKey, prompt: prompt.trim(), styleGuideKey: styleKey,
        customStyleGuide: styleKey === 'custom' ? customStyleGuide : undefined,
        generalRefs, aspectRatio, resolution: modelKey === 'banana2lite' ? 'auto' : resolution,
      })
        .then(r => {
          if (!r?.image?.base64) throw new Error('No image returned.');
          logGeneration({ modelId, inputTokens: costEst.inputTokens, outputTokens: costEst.outputTokens, durationMs: Date.now() - startTime, success: true, resolution, imageCount: 1 });
          setGalleryResults(prev => prev.map(item =>
            item.id === `${batchId}-${i}` ? { ...item, image: r.image, text: r.text, _pending: false } : item
          ));
        })
        .catch(e => {
          logGeneration({ modelId, inputTokens: costEst.inputTokens, durationMs: Date.now() - startTime, success: false, error: e.message, resolution, imageCount: 1 });
          setGalleryResults(prev => prev.map(item =>
            item.id === `${batchId}-${i}` ? { ...item, _pending: false, _error: e.message || String(e) } : item
          ));
        });
    });
  }, [apiKey, prompt, modelKey, styleKey, customStyleGuide, aspectRatio, resolution, imageCount, generalRefs]);

  // Retry
  const handleRetry = useCallback((item) => {
    setGalleryResults(prev => prev.map(r => r.id === item.id ? { ...r, _error: undefined, _pending: true } : r));
    generateImage(apiKey, {
      modelKey, prompt: item.prompt, styleGuideKey: styleKey,
      customStyleGuide: styleKey === 'custom' ? customStyleGuide : undefined,
      generalRefs, aspectRatio, resolution,
    })
      .then(r => { setGalleryResults(prev => prev.map(g => g.id === item.id ? { ...g, image: r.image, text: r.text, _pending: false } : g)); })
      .catch(e => { setGalleryResults(prev => prev.map(g => g.id === item.id ? { ...g, _pending: false, _error: e.message } : g)); });
  }, [apiKey, modelKey, styleKey, customStyleGuide, generalRefs, aspectRatio, resolution]);

  const hasResults = galleryResults.length > 0;
  const completedCount = galleryResults.filter(r => !r._pending && !r._error).length;

  // Live cost estimation
  const modelId = MODELS[modelKey]?.id || modelKey;
  const styleGuideText = styleKey !== 'none' && styleKey !== 'custom' && STYLE_GUIDES[styleKey]?.guide
    ? JSON.stringify(STYLE_GUIDES[styleKey].guide) : (styleKey === 'custom' ? customStyleGuide : '');
  const effectiveRes = modelKey === 'banana2lite' ? 'auto' : resolution;
  const costEst = estimateLiveCost(modelId, prompt, generalRefs.length, effectiveRes, imageCount, styleGuideText);

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab} setActiveTab={setActiveTab}
        apiKey={apiKey} setApiKey={setApiKey}
        lightMode={lightMode} setLightMode={setLightMode}
        expanded={expanded} setExpanded={setExpanded}
      />
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <main className="main-content" onClick={() => { if (expanded) setExpanded(false); }}>
        {activeTab === 'generate' ? (
          <div className="studio-layout">
            {/* ═══ LEFT: Controls ═══ */}
            <div className="controls-panel">
              <div className="controls-scroll">
                {error && (
                  <div className="error-banner animate-in">
                    <AlertTriangle size={14} /><span>{error}</span>
                    <button onClick={() => setError('')}><X size={12} /></button>
                  </div>
                )}

                {/* References */}
                <div>
                  <div className="ctrl-label">
                    References
                    {generalRefs.length > 0 && <span className="section-badge">{generalRefs.length}</span>}
                  </div>
                  <RefUpload refs={generalRefs} setRefs={setGeneralRefs} />
                </div>

                {/* Prompt */}
                <div>
                  <textarea className="prompt-textarea" style={{ minHeight: 120 }}
                    placeholder="Describe your image..."
                    value={prompt} onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleGenerate(); }}
                  />
                </div>

                {/* Settings strip */}
                <div className="settings-strip">
                  {/* Model */}
                  <div>
                    <div className="ctrl-label">Model</div>
                    <div className="pill-row cols-4">
                      {Object.entries(MODELS).map(([k]) => {
                        const d = MODEL_DISPLAY[k] || {};
                        return (
                          <button key={k} className={`pill-sm ${modelKey === k ? 'active' : ''}`} onClick={() => setModelKey(k)}>
                            {d.emoji} {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <div className="ctrl-label">Ratio</div>
                    <div className="pill-row cols-5">
                      {ASPECT_RATIOS.map(ar => (
                        <button key={ar.key} className={`pill-sm ${aspectRatio === ar.key ? 'active' : ''}`} onClick={() => setAspectRatio(ar.key)}>
                          {ar.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution + Count */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div className="ctrl-label">Resolution</div>
                      <div className="pill-row cols-5">
                        {RESOLUTIONS.map(r => {
                          const resDisabled = (modelKey === 'standard' || modelKey === 'banana2lite') && r.key !== 'auto';
                          return (
                          <button key={r.key}
                            className={`pill-sm ${resolution === r.key ? 'active' : ''} ${resDisabled ? 'disabled' : ''}`}
                            onClick={() => setResolution(r.key)} disabled={resDisabled}>
                            {r.label}
                          </button>
                        );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="ctrl-label">Count</div>
                      <div className="pill-row cols-3">
                        {[1, 2, 4].map(n => (
                          <button key={n} className={`pill-sm ${imageCount === n ? 'active' : ''}`} onClick={() => setImageCount(n)}>
                            {n}×
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Style */}
                  <div>
                    <div className="ctrl-label">Style</div>
                    <div className="select-wrap">
                      <select className="select-field" value={styleKey} onChange={(e) => setStyleKey(e.target.value)}>
                        {Object.entries(STYLE_GUIDES).map(([k, s]) => (<option key={k} value={k}>{s.label}</option>))}
                      </select>
                      <ChevronDown size={14} className="select-arrow" />
                    </div>
                    {styleKey === 'custom' && (
                      <textarea className="prompt-textarea" style={{ marginTop: 8, minHeight: 60, fontSize: '0.72rem', fontFamily: "'Courier New', monospace" }}
                        placeholder="Custom style rules..."
                        value={customStyleGuide} onChange={(e) => setCustomStyleGuide(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                {/* Live Cost Estimator + Generate */}
                <div>
                  <div className="cost-estimator">
                    <div className="cost-row">
                      <span>~{costEst.inputTokens} in</span>
                      <span>~{costEst.outputTokens} out</span>
                      <span className="cost-total">${costEst.totalCost < 0.001 ? '<0.001' : costEst.totalCost.toFixed(4)}</span>
                    </div>
                  </div>
                  <button className="generate-btn" onClick={handleGenerate} disabled={!prompt.trim() || !apiKey}>
                    <Sparkles size={18} />
                    Generate {imageCount > 1 ? `${imageCount} Images` : 'Image'}
                  </button>
                  {!apiKey && <p style={{ fontSize: '0.7rem', color: 'var(--amber)', marginTop: 8, textAlign: 'center' }}>Set your API key in the sidebar first.</p>}
                </div>
              </div>
            </div>

            {/* ═══ RIGHT: Preview ═══ */}
            <div className="preview-area">
              {hasResults && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }} className="animate-in">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {completedCount} image{completedCount !== 1 ? 's' : ''} generated
                  </span>
                  <button className="action-btn danger" onClick={() => setGalleryResults(prev => prev.filter(r => r._pending))}>
                    <Trash2 size={12} /> Clear
                  </button>
                </div>
              )}
              {hasResults ? (
                <div className="gallery-grid">
                  {galleryResults.map((item, i) => {
                    if (item._pending) return (
                      <div key={item.id} className="gallery-card animate-slide-up" style={{ animationDelay: `${(i % 4) * 60}ms` }}>
                        <div className="skeleton" style={{ aspectRatio: '1' }}>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                            <div className="spinner" /><span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Generating...</span>
                          </div>
                        </div>
                        <div className="gallery-card-footer"><p className="gallery-card-prompt">{item.prompt}</p></div>
                      </div>
                    );
                    if (item._error) {
                      const isSafety = item._error.includes('SAFETY');
                      return (
                        <div key={item.id} className="gallery-card animate-slide-up" style={{ animationDelay: `${(i % 4) * 60}ms` }}>
                          <div style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, background: 'rgba(239,68,68,0.04)' }}>
                            <AlertTriangle size={20} color={isSafety ? 'var(--amber)' : 'var(--red)'} />
                            <p style={{ fontSize: '0.7rem', color: '#fca5a5', textAlign: 'center', lineHeight: 1.5 }}>{item._error.replace('SAFETY_BLOCK: ', '').replace('Gemini API Error: ', '')}</p>
                            <button className="action-btn" onClick={() => handleRetry(item)}><RefreshCw size={11} /> Retry</button>
                          </div>
                          <div className="gallery-card-footer"><p className="gallery-card-prompt">{item.prompt}</p></div>
                        </div>
                      );
                    }
                    if (!item.image?.base64) return null;
                    const imgSrc = imageToDataUrl(item.image.base64, item.image.mimeType);
                    return (
                      <div key={item.id} className="gallery-card animate-slide-up" style={{ animationDelay: `${(i % 4) * 60}ms` }}>
                        <div className="gallery-card-img" onClick={() => setLightboxSrc(imgSrc)}>
                          <img src={imgSrc} alt="" />
                          <div className="gallery-card-overlay">
                            <button className="action-btn" onClick={(e) => { e.stopPropagation(); downloadImage(item.image.base64, item.image.mimeType, `gemai_${item.id.slice(0,8)}.png`); }}>
                              <Download size={11} /> Save
                            </button>
                          </div>
                        </div>
                        <div className="gallery-card-footer"><p className="gallery-card-prompt">{item.prompt}</p></div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon"><ImageIcon size={32} color="var(--accent)" /></div>
                  <h3>Your generated images will appear here</h3>
                  <p>Configure your settings on the left and write a prompt to begin creating.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <TabPlaceholder tabId={activeTab} />
        )}
      </main>
    </div>
  );
}

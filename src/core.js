/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   @eventop/sdk  v1.1.0                                       ║
 * ║   AI-powered guided tours — themeable, provider-agnostic     ║
 * ║                                                              ║
 * ║   Provider: always proxy through your own server.            ║
 * ║   Never expose API keys in client-side code.                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

(function (global, factory) {
  const Eventop = factory();
  
  if (typeof module === 'object' && module.exports) {
    module.exports = Eventop;
  }
  if (typeof define === 'function' && define.amd) {
    define(function() { return Eventop; });
  }
  // Always set on global in browser environments
  if (typeof window !== 'undefined') {
    window.Eventop = Eventop;
  } else if (typeof global !== 'undefined') {
    global.Eventop = Eventop;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SHEPHERD_CSS = 'https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/css/shepherd.css';
  const SHEPHERD_JS  = 'https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/js/shepherd.min.js';

  // ─── Internal state ──────────────────────────────────────────────────────────
  let _provider   = null;
  let _config     = null;
  let _tour       = null;
  let _isOpen     = false;
  let _messages   = [];
  let _mediaQuery = null;

  // Pause/resume state
  let _pausedSteps = null;
  let _pausedIndex = 0;

  // Active cleanup callbacks — cleared when tour ends or is paused
  let _cleanups = [];


  // ═══════════════════════════════════════════════════════════════════════════
  //  THEME ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  const DARK_TOKENS = {
    accent:          '#e94560',
    accentSecondary: '#a855f7',
    bg:              '#0f0f1a',
    surface:         '#1a1a2e',
    border:          '#2a2a4a',
    text:            '#e0e0f0',
    textDim:         '#6060a0',
    radius:          '16px',
    fontFamily:      "system-ui, -apple-system, 'Segoe UI', sans-serif",
  };

  const LIGHT_TOKENS = {
    accent:          '#e94560',
    accentSecondary: '#7c3aed',
    bg:              '#ffffff',
    surface:         '#f8f8fc',
    border:          '#e4e4f0',
    text:            '#1a1a2e',
    textDim:         '#888899',
    radius:          '16px',
    fontFamily:      "system-ui, -apple-system, 'Segoe UI', sans-serif",
  };

  const PRESETS = {
    default: {},
    minimal: { accent: '#000000', accentSecondary: '#333333', radius: '8px' },
    soft:    { accent: '#6366f1', accentSecondary: '#8b5cf6', radius: '20px' },
    glass:   { radius: '14px' },
  };

  function resolveTheme(themeConfig = {}) {
    const { mode = 'auto', preset = 'default', tokens = {} } = themeConfig;
    const isDark = mode === 'auto'
      ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true)
      : mode === 'dark';
    const base = isDark ? { ...DARK_TOKENS } : { ...LIGHT_TOKENS };
    return { ...base, ...(PRESETS[preset] || {}), ...tokens, _isDark: isDark };
  }

  function buildCSSVars(t) {
    return `
      --sai-accent:   ${t.accent};
      --sai-accent2:  ${t.accentSecondary};
      --sai-bg:       ${t.bg};
      --sai-surface:  ${t.surface};
      --sai-border:   ${t.border};
      --sai-text:     ${t.text};
      --sai-text-dim: ${t.textDim};
      --sai-radius:   ${t.radius};
      --sai-font:     ${t.fontFamily};
    `;
  }

  function applyTheme(t) {
    const panel = document.getElementById('sai-panel');
    const trigger = document.getElementById('sai-trigger');
    
    if (panel) {
        panel.style.cssText += buildCSSVars(t);
    }
    if (trigger) {
        trigger.style.cssText += buildCSSVars(t);
    }
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  POSITIONING
  // ═══════════════════════════════════════════════════════════════════════════

  function resolvePosition(posConfig = {}) {
    const { corner = 'bottom-right', offsetX = 28, offsetY = 28 } = posConfig;
    const isLeft = corner.includes('left');
    const isTop  = corner.includes('top');
    return {
      trigger: {
        [isLeft ? 'left' : 'right']: `${offsetX}px`,
        [isTop  ? 'top'  : 'bottom']: `${offsetY}px`,
      },
      panel: {
        [isLeft ? 'left' : 'right']: `${offsetX}px`,
        [isTop  ? 'top'  : 'bottom']: `${offsetY + 56 + 12}px`,
        transformOrigin: isTop ? 'top center' : 'bottom center',
      },
    };
  }

  function positionToCSS(obj) {
    return Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(';');
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  PROVIDER
  //  Only custom() is supported — route AI calls through your own server.
  //
  //  Your endpoint receives:  POST { systemPrompt, messages }
  //  Your endpoint must return: { message: string, steps: Step[] }
  //
  //  @example
  //  Eventop.init({
  //    provider: Eventop.providers.custom(async ({ systemPrompt, messages }) => {
  //      const res = await fetch('/api/guide', {
  //        method:  'POST',
  //        headers: { 'Content-Type': 'application/json' },
  //        body:    JSON.stringify({ systemPrompt, messages }),
  //      });
  //      return res.json();
  //    }),
  //    config: { ... },
  //  });
  // ═══════════════════════════════════════════════════════════════════════════

  const providers = {
    custom(fn) {
      if (typeof fn !== 'function') throw new Error('[Eventop] providers.custom() requires a function');
      return fn;
    },
  };


  // ═══════════════════════════════════════════════════════════════════════════
  //  SYSTEM PROMPT
  // ═══════════════════════════════════════════════════════════════════════════

  function buildSystemPrompt() {
    const screens = [
      ...new Set(
        (_config.features || [])
          .filter(f => f.screen?.id)
          .map(f => f.screen.id)
      ),
    ];

    const featureSummary = (_config.features || []).map(f => {
      const entry = {
        id:          f.id,
        name:        f.name,
        description: f.description,
        screen:      f.screen?.id || 'default',
      };
      if (f.flow?.length) {
        entry.note = `This feature has ${f.flow.length} sequential sub-steps. Include ONE step per flow entry.`;
      }
      return entry;
    });

    return `
You are an in-app assistant called "${_config.assistantName || 'AI Guide'}" for "${_config.appName}".
Your ONLY job: guide users step-by-step through tasks using the feature map below.

${screens.length > 1 ? `SCREENS: This app has multiple screens: ${screens.join(', ')}. Features are screen-specific. The SDK handles navigation — just pick the right features.` : ''}

FEATURE MAP (only reference IDs from this list):
${JSON.stringify(featureSummary, null, 2)}

RESPOND ONLY with this exact JSON — no markdown, no extra text:
{
  "message": "Friendly 1-2 sentence intro about what you are helping with.",
  "steps": [
    {
      "id": "feature-id-from-map",
      "title": "3-5 word title",
      "text": "Exact instruction. Max 2 sentences.",
      "selector": "#selector-from-feature-map",
      "position": "bottom"
    }
  ]
}

RULES:
1. The step "id" MUST match a feature id from the feature map.
2. Only use selectors and IDs from the feature map. Never invent them.
3. No matching feature → steps: [], explain kindly in message.
4. position values: top | bottom | left | right | auto only.
5. Order steps logically. For multi-step flows, order as the user encounters them.
6. For forms: ALWAYS include a step for the form section or first input BEFORE the
   continue/submit button. The button step must always be LAST in its section.
7. If a feature has a flow, include one step per flow entry using the same feature id —
   the SDK expands them automatically.
8. Never skip features in a required sequence. Include every step end-to-end.
`.trim();
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  AI ORCHESTRATION
  // ═══════════════════════════════════════════════════════════════════════════

  function parseAIResponse(raw) {
    const clean = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    try {
      const p = JSON.parse(clean);
      if (typeof p.message !== 'string' || !Array.isArray(p.steps)) throw new Error('Bad shape');
      return p;
    } catch {
      console.error('[Eventop] Unparseable AI response:', raw);
      throw new Error('AI returned an unreadable response. Please try again.');
    }
  }

  async function callAI(userMessage) {
    const systemPrompt    = buildSystemPrompt();
    const messagesWithNew = [..._messages, { role: 'user', content: userMessage }];
    const result          = await _provider({ systemPrompt, messages: messagesWithNew });
    _messages.push({ role: 'user',      content: userMessage });
    _messages.push({ role: 'assistant', content: result.message });
    return result;
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  SCREEN NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  async function ensureOnCorrectScreen(feature) {
    if (!feature.screen) return;
    if (typeof feature.screen.check === 'function' && feature.screen.check()) return;

    addMsg('ai', 'Taking you to the right screen first…');

    if (typeof feature.screen.navigate === 'function') {
      feature.screen.navigate();
    }

    const waitSelector = feature.screen.waitFor || feature.selector;
    if (waitSelector) await waitForElement(waitSelector, 10000);
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  FLOW EXPANSION
  //  A feature with flow[] gets expanded into multiple Shepherd steps.
  //  Developer supplies selectors; AI supplies copy for the parent step.
  // ═══════════════════════════════════════════════════════════════════════════

  function expandFlowSteps(aiStep, feature) {
    if (!feature.flow?.length) return [aiStep];

    return feature.flow.map((entry, i) => ({
      id:        `${aiStep.id}-flow-${i}`,
      title:     i === 0
        ? aiStep.title
        : `${aiStep.title} (${i + 1}/${feature.flow.length})`,
      text:      i === 0
        ? aiStep.text
        : `Step ${i + 1} of ${feature.flow.length}: continue with the action highlighted below.`,
      position:  aiStep.position || 'bottom',
      selector:  entry.selector  || null,
      waitFor:   entry.waitFor   || null,
      advanceOn: entry.advanceOn || null,
      _parentId: aiStep.id,
    }));
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  SHEPHERD RUNNER
  // ═══════════════════════════════════════════════════════════════════════════

  function loadCSS(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async function ensureShepherd() {
    if (typeof Shepherd !== 'undefined') return;
    loadCSS(SHEPHERD_CSS);
    await loadScript(SHEPHERD_JS);
  }

  function waitForElement(selector, timeout = 8000) {
    return new Promise(resolve => {
      if (document.querySelector(selector)) return resolve();

      const timer = setTimeout(() => {
        observer.disconnect();
        console.warn(`[Eventop] waitFor("${selector}") timed out — continuing`);
        resolve();
      }, timeout);

      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          clearTimeout(timer);
          observer.disconnect();
          resolve();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      _cleanups.push(() => { clearTimeout(timer); observer.disconnect(); });
    });
  }

  function mergeWithFeature(step) {
    if (!_config?.features) return step;
    const feature = _config.features.find(f => f.id === step.id);
    if (!feature) return step;
    return {
      waitFor:   feature.waitFor   || null,
      advanceOn: feature.advanceOn || null,
      validate:  feature.validate  || null,
      screen:    feature.screen    || null,
      flow:      feature.flow      || null,
      ...step,
      selector: feature.selector || step.selector, // feature map always wins
    };
  }

  function wireAdvanceOn(shepherdStep, advanceOn, tour) {
    if (!advanceOn?.selector || !advanceOn?.event) return;

    function handler(e) {
      if (e.target.matches(advanceOn.selector) || e.target.closest(advanceOn.selector)) {
        setTimeout(() => {
          if (tour && !tour.isActive()) return;
          tour.next();
        }, advanceOn.delay || 300);
      }
    }

    document.addEventListener(advanceOn.event, handler, true);
    _cleanups.push(() => document.removeEventListener(advanceOn.event, handler, true));

    shepherdStep.on('show', () => {
      const nextBtn = shepherdStep.getElement()
        ?.querySelector('.shepherd-footer .shepherd-button:not(.shepherd-button-secondary)');
      if (nextBtn && !shepherdStep._isLast) {
        nextBtn.style.opacity = '0.4';
        nextBtn.title = 'Complete the action above to continue';
      }
    });
  }

  function addProgressIndicator(shepherdStep, index, total) {
    shepherdStep.on('show', () => {
      const header = shepherdStep.getElement()?.querySelector('.shepherd-header');
      if (!header || header.querySelector('.sai-progress')) return;
      const pct     = Math.round(((index + 1) / total) * 100);
      const wrapper = document.createElement('div');
      wrapper.className = 'sai-progress';
      wrapper.innerHTML = `
        <div class="sai-progress-bar">
          <div class="sai-progress-fill" style="width:${pct}%"></div>
        </div>
        <span class="sai-progress-label">${index + 1} / ${total}</span>
      `;
      header.appendChild(wrapper);
    });
  }

  function showResumeButton(fromIndex) {
    const msgs = document.getElementById('sai-messages');
    if (!msgs) return;

    document.getElementById('sai-resume-prompt')?.remove();

    const div = document.createElement('div');
    div.id = 'sai-resume-prompt';
    div.className = 'sai-msg sai-ai';
    div.innerHTML = `
      Tour paused. Ready when you are.
      <br/>
      <button class="sai-chip" id="sai-resume-btn" style="display:inline-block;margin-top:8px;">
        ▶ Resume from step ${fromIndex + 1}
      </button>
    `;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;

    document.getElementById('sai-resume-btn')?.addEventListener('click', () => {
      div.remove();
      if (!_pausedSteps) return;
      const steps = _pausedSteps;
      const idx   = _pausedIndex;
      _pausedSteps = null;
      _pausedIndex = 0;
      if (_isOpen) togglePanel();
      runTour(steps.slice(idx));
    });

    if (!_isOpen) togglePanel();
  }

  async function runTour(steps, options = {}) {
    await ensureShepherd();

    if (_tour) { _tour.cancel(); }
    _cleanups.forEach(fn => fn());
    _cleanups = [];
    _tour     = null;

    if (!steps?.length) return;

    const { showProgress = true, waitTimeout = 8000 } = options;

    // Merge AI steps with feature map
    const mergedSteps = steps.map(mergeWithFeature);

    // Navigate to the correct screen for the first step if needed
    const firstFeature = _config?.features?.find(f => f.id === mergedSteps[0]?.id);
    if (firstFeature) await ensureOnCorrectScreen(firstFeature);

    // Expand flow[] features into individual Shepherd steps
    const expandedSteps = mergedSteps.flatMap(step => {
      const feature = _config?.features?.find(f => f.id === step.id);
      return feature ? expandFlowSteps(step, feature) : [step];
    });

    const ShepherdClass = typeof Shepherd !== 'undefined' ? Shepherd : window.Shepherd;

    _tour = new ShepherdClass.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        scrollTo:   { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true },
        classes:    'sai-shepherd-step',
      },
    });

    expandedSteps.forEach((step, i) => {
      const isLast  = i === expandedSteps.length - 1;
      const hasAuto = !!(step.advanceOn?.selector && step.advanceOn?.event);
      const buttons = [];

      if (i > 0) {
        buttons.push({ text: '← Back', action: _tour.back, secondary: true });
      }
      buttons.push({
        text:   isLast ? 'Done ✓' : 'Next →',
        action: isLast ? _tour.complete : _tour.next,
      });
      buttons.push({
        text:      '⏸ Pause',
        secondary: true,
        action:    function () { _tour.cancel(); },
      });

      const shepherdStep = _tour.addStep({
        id:    step.id || `sai-step-${i}`,
        title: step.title,
        text:  step.text,
        attachTo: step.selector
          ? { element: step.selector, on: step.position || 'bottom' }
          : undefined,
        beforeShowPromise: step.waitFor
          ? () => waitForElement(step.waitFor, waitTimeout)
          : undefined,
        buttons,
      });

      shepherdStep._isLast = isLast;

      if (hasAuto) wireAdvanceOn(shepherdStep, step.advanceOn, _tour);
      if (showProgress && expandedSteps.length > 1) {
        addProgressIndicator(shepherdStep, i, expandedSteps.length);
      }
    });

    _tour.on('complete', () => {
      _cleanups.forEach(fn => fn());
      _cleanups    = [];
      _pausedSteps = null;
      _pausedIndex = 0;
      _tour        = null;
    });

    // Cancel → pause instead of hard destroy
    _tour.on('cancel', () => {
      const currentStepEl = _tour.getCurrentStep();
      const currentIdx    = currentStepEl
        ? expandedSteps.findIndex(s => s.id === currentStepEl.id)
        : 0;

      _cleanups.forEach(fn => fn());
      _cleanups    = [];
      _pausedSteps = expandedSteps;
      _pausedIndex = Math.max(0, currentIdx);
      _tour        = null;

      showResumeButton(_pausedIndex);
    });

    _tour.start();
  }

  function stepComplete() {
    if (_tour?.isActive()) _tour.next();
  }

  function stepFail(message) {
    if (!_tour?.isActive()) return;
    const current = _tour.getCurrentStep();
    if (!current) return;
    const el = current.getElement();
    el?.querySelector('.sai-step-error')?.remove();
    if (message) {
      const err = document.createElement('div');
      err.className   = 'sai-step-error';
      err.textContent = '⚠ ' + message;
      el?.querySelector('.shepherd-text')?.appendChild(err);
    }
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  STYLES
  // ═══════════════════════════════════════════════════════════════════════════

  function injectStyles(theme, pos) {
    if (document.getElementById('sai-styles')) return;

    const triggerCSS = positionToCSS(pos.trigger);
    const panelCSS   = positionToCSS(pos.panel);
    const isDark     = theme._isDark;
    const stepBg     = isDark ? 'var(--sai-bg)'     : '#ffffff';
    const stepSurf   = isDark ? 'var(--sai-surface)' : '#f8f8fc';
    const stepText   = isDark ? 'var(--sai-text)'    : '#1a1a2e';
    const stepBorder = isDark ? 'var(--sai-border)'  : '#e4e4f0';

    const style = document.createElement('style');
    style.id = 'sai-styles';
    style.textContent = `
      #sai-trigger, #sai-panel { ${buildCSSVars(theme)} }

      /* ── Trigger ── */
      #sai-trigger {
        position: fixed; ${triggerCSS};
        width: 54px; height: 54px; border-radius: 50%;
        background: var(--sai-surface); border: 2px solid var(--sai-accent);
        color: var(--sai-text); font-size: 20px; cursor: pointer; z-index: 99998;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 20px color-mix(in srgb, var(--sai-accent) 40%, transparent);
        transition: transform .2s ease, box-shadow .2s ease;
        font-family: var(--sai-font); padding: 0;
      }
      #sai-trigger:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 28px color-mix(in srgb, var(--sai-accent) 55%, transparent);
      }
      #sai-trigger .sai-pulse {
        position: absolute; width: 100%; height: 100%; border-radius: 50%;
        background: color-mix(in srgb, var(--sai-accent) 30%, transparent);
        animation: sai-pulse 2.2s ease-out infinite; pointer-events: none;
      }
      #sai-trigger.sai-paused .sai-pulse { animation: none; }
      #sai-trigger.sai-paused::after {
        content: '⏸'; position: absolute; bottom: -2px; right: -2px;
        font-size: 12px; background: var(--sai-accent); border-radius: 50%;
        width: 18px; height: 18px; display: flex; align-items: center;
        justify-content: center; color: #fff; line-height: 1;
      }
      @keyframes sai-pulse {
        0%   { transform: scale(1);    opacity: .8; }
        100% { transform: scale(1.75); opacity: 0;  }
      }

      /* ── Panel ── */
      #sai-panel {
        position: fixed; ${panelCSS};
        width: 340px; background: var(--sai-bg);
        border: 1px solid var(--sai-border); border-radius: var(--sai-radius);
        display: flex; flex-direction: column; z-index: 99999; overflow: hidden;
        box-shadow: 0 16px 48px rgba(0,0,0,.18); font-family: var(--sai-font);
        transform: translateY(12px) scale(.97); opacity: 0; pointer-events: none;
        transition: transform .25s cubic-bezier(.34,1.56,.64,1), opacity .2s ease;
        max-height: 520px;
      }
      #sai-panel.sai-open { transform: translateY(0) scale(1); opacity: 1; pointer-events: all; }

      /* ── Header ── */
      #sai-header {
        display: flex; align-items: center; gap: 10px; padding: 13px 15px;
        background: var(--sai-surface); border-bottom: 1px solid var(--sai-border);
      }
      #sai-avatar {
        width: 30px; height: 30px; border-radius: 50%;
        background: linear-gradient(135deg, var(--sai-accent), var(--sai-accent2));
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; flex-shrink: 0; color: #fff;
      }
      #sai-header-info { flex: 1; min-width: 0; }
      #sai-header-info h4 {
        margin: 0; font-size: 13px; font-weight: 600; color: var(--sai-text);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #sai-header-info p {
        margin: 0; font-size: 11px; color: var(--sai-text-dim);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #sai-close {
        background: none; border: none; color: var(--sai-text-dim); cursor: pointer;
        font-size: 18px; line-height: 1; padding: 0; flex-shrink: 0; transition: color .15s;
      }
      #sai-close:hover { color: var(--sai-text); }

      /* ── Messages ── */
      #sai-messages {
        flex: 1; overflow-y: auto; padding: 12px;
        display: flex; flex-direction: column; gap: 9px;
        min-height: 160px; max-height: 280px;
        scrollbar-width: thin; scrollbar-color: var(--sai-border) transparent;
      }
      #sai-messages::-webkit-scrollbar { width: 4px; }
      #sai-messages::-webkit-scrollbar-thumb { background: var(--sai-border); border-radius: 2px; }
      .sai-msg {
        max-width: 86%; padding: 8px 11px; border-radius: 11px;
        font-size: 13px; line-height: 1.55; animation: sai-in .18s ease both;
      }
      @keyframes sai-in {
        from { opacity: 0; transform: translateY(5px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .sai-msg.sai-ai {
        background: var(--sai-surface); color: var(--sai-text);
        border-bottom-left-radius: 3px; align-self: flex-start;
        border: 1px solid var(--sai-border);
      }
      .sai-msg.sai-user {
        background: var(--sai-accent); color: #fff;
        border-bottom-right-radius: 3px; align-self: flex-end;
      }
      .sai-msg.sai-error {
        background: color-mix(in srgb, #ef4444 10%, var(--sai-bg));
        color: #ef4444;
        border: 1px solid color-mix(in srgb, #ef4444 25%, var(--sai-bg));
        align-self: flex-start;
      }

      /* ── Typing indicator ── */
      .sai-typing {
        display: flex; gap: 4px; padding: 9px 12px; align-self: flex-start;
        background: var(--sai-surface); border: 1px solid var(--sai-border);
        border-radius: 11px; border-bottom-left-radius: 3px;
      }
      .sai-typing span {
        width: 5px; height: 5px; border-radius: 50%;
        background: var(--sai-text-dim); animation: sai-bounce 1.2s infinite;
      }
      .sai-typing span:nth-child(2) { animation-delay: .15s; }
      .sai-typing span:nth-child(3) { animation-delay: .3s; }
      @keyframes sai-bounce {
        0%,80%,100% { transform: translateY(0); }
        40%          { transform: translateY(-5px); }
      }

      /* ── Suggestions ── */
      #sai-suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 10px; }
      .sai-chip {
        font-size: 11px; padding: 5px 10px; border-radius: 20px;
        background: transparent; border: 1px solid var(--sai-border);
        color: var(--sai-text-dim); cursor: pointer; font-family: inherit; transition: all .15s;
      }
      .sai-chip:hover {
        border-color: var(--sai-accent); color: var(--sai-accent);
        background: color-mix(in srgb, var(--sai-accent) 6%, transparent);
      }

      /* ── Input row ── */
      #sai-inputrow {
        display: flex; align-items: center; gap: 7px; padding: 9px 11px;
        border-top: 1px solid var(--sai-border); background: var(--sai-bg);
      }
      #sai-input {
        flex: 1; background: var(--sai-surface); border: 1px solid var(--sai-border);
        border-radius: 8px; padding: 7px 11px; color: var(--sai-text);
        font-size: 13px; outline: none; transition: border-color .15s; font-family: inherit;
      }
      #sai-input::placeholder { color: var(--sai-text-dim); }
      #sai-input:focus { border-color: var(--sai-accent); }
      #sai-send {
        width: 32px; height: 32px; flex-shrink: 0; border-radius: 8px;
        background: var(--sai-accent); border: none; color: #fff; font-size: 14px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: filter .15s, transform .1s; line-height: 1;
      }
      #sai-send:hover  { filter: brightness(1.1); }
      #sai-send:active { transform: scale(.93); }
      #sai-send:disabled { background: var(--sai-border); cursor: not-allowed; }

      /* ── Shepherd step overrides ── */
      .sai-shepherd-step {
        background: ${stepBg} !important;
        border: 1px solid ${stepBorder} !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 36px rgba(0,0,0,.18) !important;
        max-width: 290px !important;
        font-family: var(--sai-font, system-ui) !important;
      }
      .sai-shepherd-step.shepherd-has-title .shepherd-content .shepherd-header {
        background: ${stepSurf} !important; padding: 11px 15px 8px !important;
        border-bottom: 1px solid ${stepBorder} !important;
      }
      .sai-shepherd-step .shepherd-title {
        color: var(--sai-accent, #e94560) !important;
        font-size: 13px !important; font-weight: 700 !important;
      }
      .sai-shepherd-step .shepherd-text {
        color: ${stepText} !important; font-size: 13px !important;
        line-height: 1.6 !important; padding: 10px 15px !important;
      }
      .sai-shepherd-step .shepherd-footer {
        border-top: 1px solid ${stepBorder} !important; padding: 8px 11px !important;
        background: ${stepBg} !important; display: flex; gap: 5px; flex-wrap: wrap;
      }
      .sai-shepherd-step .shepherd-button {
        background: var(--sai-accent, #e94560) !important; color: #fff !important;
        border: none !important; border-radius: 6px !important; padding: 6px 13px !important;
        font-size: 12px !important; font-weight: 600 !important; cursor: pointer !important;
        transition: filter .15s !important; font-family: var(--sai-font, system-ui) !important;
      }
      .sai-shepherd-step .shepherd-button:hover { filter: brightness(1.1) !important; }
      .sai-shepherd-step .shepherd-button-secondary {
        background: transparent !important; color: var(--sai-text-dim, #888) !important;
        border: 1px solid ${stepBorder} !important;
      }
      .sai-shepherd-step .shepherd-button-secondary:hover {
        background: ${stepSurf} !important; color: ${stepText} !important;
      }
      .sai-shepherd-step .shepherd-cancel-icon { color: var(--sai-text-dim, #888) !important; }
      .sai-shepherd-step .shepherd-cancel-icon:hover { color: ${stepText} !important; }
      .sai-shepherd-step[data-popper-placement] > .shepherd-arrow::before {
        background: ${stepBorder} !important;
      }

      /* ── Progress bar ── */
      .sai-progress { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-shrink: 0; }
      .sai-progress-bar {
        width: 60px; height: 3px; border-radius: 2px; background: ${stepBorder}; overflow: hidden;
      }
      .sai-progress-fill {
        height: 100%; border-radius: 2px;
        background: var(--sai-accent, #e94560); transition: width .3s ease;
      }
      .sai-progress-label {
        font-size: 10px; color: var(--sai-text-dim, #888);
        white-space: nowrap; font-family: var(--sai-font, system-ui);
      }

      /* ── Step error ── */
      .sai-step-error {
        margin-top: 8px; padding: 6px 10px;
        background: color-mix(in srgb, #ef4444 12%, ${stepBg});
        border: 1px solid color-mix(in srgb, #ef4444 25%, ${stepBorder});
        border-radius: 6px; color: #ef4444; font-size: 12px; line-height: 1.5;
        animation: sai-in .18s ease;
      }

      /* ── Glass preset ── */
      .sai-glass-preset .sai-shepherd-step {
        background: rgba(255, 255, 255, 0.10) !important;
        backdrop-filter: blur(18px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(18px) saturate(180%) !important;
        border: 1px solid rgba(255, 255, 255, 0.22) !important;
        box-shadow: 0 8px 36px rgba(0,0,0,.12) !important;
      }
      .sai-glass-preset .sai-shepherd-step .shepherd-text,
      .sai-glass-preset .sai-shepherd-step .shepherd-title {
        color: #ffffff !important;
        text-shadow: 0 1px 3px rgba(0,0,0,.35);
      }
      .sai-glass-preset .sai-shepherd-step .shepherd-footer,
      .sai-glass-preset .sai-shepherd-step .shepherd-header {
        background: transparent !important;
        border-color: rgba(255,255,255,0.15) !important;
      }
    `;
    document.head.appendChild(style);
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  CHAT UI
  // ═══════════════════════════════════════════════════════════════════════════

  function buildChat(theme, positionCSS) {
    if (document.getElementById('sai-trigger')) return;

    injectStyles(theme, positionCSS);

    const trigger = document.createElement('button');
    trigger.id = 'sai-trigger';
    trigger.title = 'Need help?';
    trigger.setAttribute('aria-label', 'Open help assistant');
    trigger.innerHTML = '<span class="sai-pulse" aria-hidden="true"></span>✦';
    document.body.appendChild(trigger);

    const panel = document.createElement('div');
    panel.id = 'sai-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', `${_config.assistantName || 'AI Guide'} chat`);
    panel.innerHTML = `
      <div id="sai-header">
        <div id="sai-avatar" aria-hidden="true">✦</div>
        <div id="sai-header-info">
          <h4>${escHTML(_config.assistantName || 'AI Guide')}</h4>
          <p>Ask me anything about ${escHTML(_config.appName)}</p>
        </div>
        <button id="sai-close" aria-label="Close help assistant">×</button>
      </div>
      <div id="sai-messages" role="log" aria-live="polite"></div>
      <div id="sai-suggestions" aria-label="Suggested questions"></div>
      <div id="sai-inputrow">
        <input id="sai-input" type="text" placeholder="What do you need help with?"
               autocomplete="off" aria-label="Ask a question"/>
        <button id="sai-send" aria-label="Send message">➤</button>
      </div>
    `;
    document.body.appendChild(panel);

    if (_config.theme?.preset === 'glass') {
      document.body.classList.add('sai-glass-preset');
    }

    if (_config.suggestions?.length) {
      const container = panel.querySelector('#sai-suggestions');
      _config.suggestions.forEach(s => {
        const btn = document.createElement('button');
        btn.className   = 'sai-chip';
        btn.textContent = s;
        btn.addEventListener('click', () => handleSend(s));
        container.appendChild(btn);
      });
    }

    trigger.addEventListener('click', togglePanel);
    panel.querySelector('#sai-close').addEventListener('click', togglePanel);
    panel.querySelector('#sai-send').addEventListener('click', () => {
      const v = panel.querySelector('#sai-input').value.trim();
      if (v) handleSend(v);
    });
    panel.querySelector('#sai-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const v = e.target.value.trim();
        if (v) handleSend(v);
      }
    });

    addMsg('ai', `Hey! 👋 I can guide you through ${_config.appName}. What would you like to do?`);

    // Auto theme switching
    if (_config.theme?.mode === 'auto' || !_config.theme?.mode) {
      _mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      _mediaQuery.addEventListener('change', () => {
        const newTheme = resolveTheme(_config.theme);
        applyTheme(newTheme);
        document.getElementById('sai-styles')?.remove();
        injectStyles(newTheme, positionCSS);
      });
    }
  }

  function escHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function togglePanel() {
    _isOpen = !_isOpen;
    document.getElementById('sai-panel')  ?.classList.toggle('sai-open', _isOpen);
    document.getElementById('sai-trigger')?.classList.toggle('sai-paused', !!_pausedSteps);
    if (_isOpen) document.getElementById('sai-input')?.focus();
  }

  function addMsg(type, text) {
    const msgs = document.getElementById('sai-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className   = `sai-msg sai-${type}`;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    const msgs = document.getElementById('sai-messages');
    const el   = document.createElement('div');
    el.className = 'sai-typing'; el.id = 'sai-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() { document.getElementById('sai-typing')?.remove(); }

  function setDisabled(d) {
    ['sai-input', 'sai-send'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = d;
    });
  }

  async function handleSend(text) {
    const input = document.getElementById('sai-input');
    if (input) input.value = '';

    document.getElementById('sai-suggestions').style.display = 'none';

    // New message clears any existing pause state
    _pausedSteps = null;
    _pausedIndex = 0;
    document.getElementById('sai-resume-prompt')?.remove();
    document.getElementById('sai-trigger')?.classList.remove('sai-paused');

    addMsg('user', text);
    setDisabled(true);
    showTyping();

    try {
      const result = await callAI(text);
      hideTyping();
      addMsg('ai', result.message);
      if (result.steps?.length) {
        setTimeout(() => {
          togglePanel();
          runTour(result.steps);
        }, 600);
      }
    } catch (err) {
      hideTyping();
      addMsg('error', err.message || 'Something went wrong. Please try again.');
      console.error('[Eventop]', err);
    } finally {
      setDisabled(false);
      document.getElementById('sai-input')?.focus();
    }
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  const Eventop = {
    providers,

    init(opts = {}) {
      if (!opts.provider)         throw new Error('[Eventop] provider is required');
      if (!opts.config?.appName)  throw new Error('[Eventop] config.appName is required');
      if (!opts.config?.features) throw new Error('[Eventop] config.features is required');

      _provider = opts.provider;
      _config   = opts.config;

      const theme  = resolveTheme(_config.theme);
      const posCSS = resolvePosition(_config.position);

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => buildChat(theme, posCSS));
      } else {
        buildChat(theme, posCSS);
      }

      ensureShepherd();
    },

    open()  { if (!_isOpen) togglePanel(); },
    close() { if (_isOpen)  togglePanel(); },

    runTour,

    cancelTour() {
      _pausedSteps = null;
      _pausedIndex = 0;
      if (_tour) { _tour.cancel(); }
      _cleanups.forEach(fn => fn());
      _cleanups = [];
      _tour     = null;
      document.getElementById('sai-trigger')?.classList.remove('sai-paused');
      document.getElementById('sai-resume-prompt')?.remove();
      document.body.classList.remove('sai-glass-preset');
    },

    resumeTour() {
      if (!_pausedSteps) return;
      const steps = _pausedSteps;
      const idx   = _pausedIndex;
      _pausedSteps = null;
      _pausedIndex = 0;
      document.getElementById('sai-resume-prompt')?.remove();
      document.getElementById('sai-trigger')?.classList.remove('sai-paused');
      if (_isOpen) togglePanel();
      runTour(steps.slice(idx));
    },

    isPaused()    { return !!_pausedSteps; },
    isActive()    { return !!(_tour?.isActive()); },
    stepComplete,
    stepFail,

    /** @internal — used by the React package to sync the live feature registry */
    _updateConfig(partial) {
      if (!_config) return;
      _config = { ..._config, ...partial };
    },
  };

  return Eventop;
}));
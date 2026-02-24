// Builds and manages the chat panel DOM.
// Also exports the low-level message helpers used by navigation.js and tour.js
// so they can surface status messages without importing the full chat module.

import { resolveTheme, applyTheme } from './theme.js';
import { injectStyles, loadShepherdCSS } from './styles.js';
import * as state from './state.js';
import { callAI } from './ai.js';
import { previewRoutesNeeded, announceNavigationPlan } from './navigation.js';

// Imported lazily inside handleSend to avoid a circular dep at module parse time.
// (chat → tour → chat would otherwise cycle.)
let _runTour = null;
export function setRunTour(fn) { _runTour = fn; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function escHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Panel visibility ─────────────────────────────────────────────────────────

export function togglePanel() {
  state.setIsOpen(!state.isOpen);
  document.getElementById('sai-panel')  ?.classList.toggle('sai-open', state.isOpen);
  document.getElementById('sai-trigger')?.classList.toggle('sai-paused', !!state.pausedSteps);
  if (state.isOpen) document.getElementById('sai-input')?.focus();
}

// ─── Message helpers (also used by navigation.js / tour.js) ──────────────────

export function addMsg(type, text) {
  const msgs = document.getElementById('sai-messages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className   = `sai-msg sai-${type}`;
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

export function showTyping() {
  const msgs = document.getElementById('sai-messages');
  const el   = document.createElement('div');
  el.className = 'sai-typing'; el.id = 'sai-typing';
  el.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

export function hideTyping() { document.getElementById('sai-typing')?.remove(); }

export function setDisabled(d) {
  ['sai-input', 'sai-send'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = d;
  });
}

// ─── Pause/resume UI ──────────────────────────────────────────────────────────

/**
 * Renders the "Tour paused — Resume from step N" bubble in the chat.
 * Also opens the panel if it's currently closed.
 *
 * @param {number} fromIndex  — zero-based step index to resume from
 */
export function showResumeButton(fromIndex) {
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
    if (!state.pausedSteps) return;
    const steps = state.pausedSteps;
    const idx   = state.pausedIndex;
    state.setPausedSteps(null);
    state.setPausedIndex(0);
    if (state.isOpen) togglePanel();
    _runTour?.(steps.slice(idx));
  });

  if (!state.isOpen) togglePanel();
}

// ─── Send / AI round-trip ─────────────────────────────────────────────────────

export async function handleSend(text) {
  const input = document.getElementById('sai-input');
  if (input) input.value = '';

  document.getElementById('sai-suggestions').style.display = 'none';

  // New message clears any existing pause state
  state.setPausedSteps(null);
  state.setPausedIndex(0);
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
      const routesNeeded = previewRoutesNeeded(result.steps);
      if (routesNeeded.length > 0) {
        announceNavigationPlan(routesNeeded);
      }

      const delay = routesNeeded.length > 0 ? 1200 : 600;
      setTimeout(() => {
        togglePanel();
        _runTour?.(result.steps);
      }, delay);
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

// ─── DOM builder ─────────────────────────────────────────────────────────────

/**
 * Mounts the trigger button and chat panel into document.body.
 * Idempotent — safe to call multiple times (exits early if already mounted).
 *
 * @param {object} theme   — resolved theme tokens
 * @param {object} posCSS  — resolved position object from resolvePosition()
 */
export function buildChat(theme, posCSS) {
  if (document.getElementById('sai-trigger')) return;

  loadShepherdCSS();
  injectStyles(theme, posCSS);

  // ── Trigger button ──
  const trigger = document.createElement('button');
  trigger.id = 'sai-trigger';
  trigger.title = 'Need help?';
  trigger.setAttribute('aria-label', 'Open help assistant');
  trigger.innerHTML = '<span class="sai-pulse" aria-hidden="true"></span>✦';
  document.body.appendChild(trigger);

  // ── Panel ──
  const panel = document.createElement('div');
  panel.id = 'sai-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', `${state.config.assistantName || 'AI Guide'} chat`);
  panel.innerHTML = `
    <div id="sai-header">
      <div id="sai-avatar" aria-hidden="true">✦</div>
      <div id="sai-header-info">
        <h4>${escHTML(state.config.assistantName || 'AI Guide')}</h4>
        <p>Ask me anything about ${escHTML(state.config.appName)}</p>
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

  if (state.config.theme?.preset === 'glass') {
    document.body.classList.add('sai-glass-preset');
  }

  // ── Suggestion chips ──
  if (state.config.suggestions?.length) {
    const container = panel.querySelector('#sai-suggestions');
    state.config.suggestions.forEach(s => {
      const btn = document.createElement('button');
      btn.className   = 'sai-chip';
      btn.textContent = s;
      btn.addEventListener('click', () => handleSend(s));
      container.appendChild(btn);
    });
  }

  // ── Event listeners ──
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

  addMsg('ai', `Hey! 👋 I can guide you through ${state.config.appName}. What would you like to do?`);

  // ── Auto theme switching ──
  if (state.config.theme?.mode === 'auto' || !state.config.theme?.mode) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    state.setMediaQuery(mq);
    mq.addEventListener('change', () => {
      const newTheme = resolveTheme(state.config.theme);
      applyTheme(newTheme);
      document.getElementById('sai-styles')?.remove();
      injectStyles(newTheme, posCSS);
    });
  }
}
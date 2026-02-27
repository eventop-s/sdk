// Injects the single <style> block that themes both the chat panel and the
// Shepherd step overlays. Split from the UI builder so styles can be refreshed
// independently on theme changes.

import { buildCSSVars } from './theme.js';
import { positionToCSS } from './positioning.js';

const SHEPHERD_CSS = 'https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/css/shepherd.css';

export function loadShepherdCSS() {
  if (document.querySelector(`link[href="${SHEPHERD_CSS}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = SHEPHERD_CSS;
  document.head.appendChild(l);
}

/**
 * Injects (or replaces) the #sai-styles <style> element.
 *
 * @param {object} theme  — resolved theme token object
 * @param {object} pos    — resolved position object from resolvePosition()
 */
export function injectStyles(theme, pos) {
  if (document.getElementById('sai-styles')) return;

  const triggerCSS = positionToCSS(pos.trigger);
  const panelCSS   = positionToCSS(pos.panel);
  const isDark     = theme._isDark;
  const stepBg     = isDark ? 'var(--sai-bg)'      : '#ffffff';
  const stepSurf   = isDark ? 'var(--sai-surface)'  : '#f8f8fc';
  const stepText   = isDark ? 'var(--sai-text)'     : '#1a1a2e';
  const stepBorder = isDark ? 'var(--sai-border)'   : '#e4e4f0';

  const style = document.createElement('style');
  style.id = 'sai-styles';
  style.textContent = `
    #sai-trigger, #sai-panel { ${buildCSSVars(theme)} }

    /* ── Ring Light Animation ── */
    @keyframes sai-ring-pulse {
      0% {
        box-shadow: 
          0 0 0 0 rgba(var(--sai-accent-rgb), 0.7),
          0 0 0 0 rgba(var(--sai-accent-rgb), 0.5),
          0 0 0 0 rgba(var(--sai-accent-rgb), 0.3);
      }
      50% {
        box-shadow: 
          0 0 0 8px rgba(var(--sai-accent-rgb), 0),
          0 0 0 16px rgba(var(--sai-accent-rgb), 0.3),
          0 0 0 24px rgba(var(--sai-accent-rgb), 0);
      }
      100% {
        box-shadow: 
          0 0 0 16px rgba(var(--sai-accent-rgb), 0),
          0 0 0 32px rgba(var(--sai-accent-rgb), 0),
          0 0 0 48px rgba(var(--sai-accent-rgb), 0);
      }
    }

    @keyframes sai-ring-pulse-hard {
      0% {
        box-shadow: 
          inset 0 0 0 2px var(--sai-accent),
          0 0 0 3px var(--sai-accent),
          0 0 20px var(--sai-accent);
      }
      50% {
        box-shadow: 
          inset 0 0 0 2px var(--sai-accent),
          0 0 0 8px var(--sai-accent),
          0 0 40px var(--sai-accent);
      }
      100% {
        box-shadow: 
          inset 0 0 0 2px var(--sai-accent),
          0 0 0 3px var(--sai-accent),
          0 0 20px var(--sai-accent);
      }
      }

    @keyframes sai-element-highlight {
      0% { filter: brightness(1); }
      50% { filter: brightness(1.15); }
      100% { filter: brightness(1); }
    }

    /* Highlighted element styles */
    .sai-highlighted {
      position: relative !important;
      animation: sai-ring-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
      z-index: 99997 !important;
    }

    .sai-highlighted.sai-highlight-hard {
      animation: sai-ring-pulse-hard 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
    }

    .sai-highlighted.sai-highlight-subtle {
      animation: sai-element-highlight 2s ease-in-out infinite !important;
      filter: drop-shadow(0 0 8px var(--sai-accent)) !important;
    }

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
    .sai-msg.sai-nav {
      background: color-mix(in srgb, var(--sai-accent2) 8%, var(--sai-surface));
      color: var(--sai-text);
      border: 1px solid color-mix(in srgb, var(--sai-accent2) 20%, var(--sai-border));
      border-bottom-left-radius: 3px; align-self: flex-start;
      font-size: 12px;
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
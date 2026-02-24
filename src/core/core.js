// Static imports are hoisted and resolved by the bundler (Rollup/esbuild/Vite)
// before the UMD wrapper runs. Never use dynamic require() here.
import * as state                             from './state.js';
import { providers }                          from './providers.js';
import { resolveTheme }                       from './theme.js';
import { resolvePosition }                    from './positioning.js';
import { buildChat, togglePanel, setRunTour } from './chat.js';
import { ensureShepherd, runTour, stepComplete, stepFail } from './tour.js';

// Break the navigation.js ↔ chat.js circular dependency:
// chat.js needs runTour but can't import tour.js (tour imports chat).
// We inject runTour into chat after both modules are loaded.
setRunTour(runTour);

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   @eventop/sdk  v1.3.0                                       ║
 * ║   AI-powered guided tours — themeable, provider-agnostic     ║
 * ║                                                              ║
 * ║   Provider: always proxy through your own server.            ║
 * ║   Never expose API keys in client-side code.                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Module map
 * ──────────────────────────────────────────────────────────────
 *  state.js       Shared mutable state — single source of truth
 *  theme.js       Design tokens + CSS variable builder
 *  positioning.js Corner/offset → CSS position values
 *  providers.js   AI provider factory helpers
 *  prompt.js      System prompt builder
 *  ai.js          Provider request/response + conversation history
 *  navigation.js  Route navigation, element waiting, announcements
 *  flow.js        Expands feature flow[] into step arrays
 *  tour.js        Shepherd.js runner, pause/resume, step helpers
 *  styles.js      <style> injection (chat panel + Shepherd overrides)
 *  chat.js        Chat panel DOM, messaging, send handler
 *  core.js        ← YOU ARE HERE — public API + UMD wrapper
 */

(function (global, factory) {
  const Eventop = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = Eventop;
  }
  if (typeof define === 'function' && define.amd) {
    define(function () { return Eventop; });
  }
  if (typeof window !== 'undefined') {
    window.Eventop = Eventop;
  } else if (typeof global !== 'undefined') {
    global.Eventop = Eventop;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (
  // Dependencies are injected by the bundler (Rollup / esbuild / Vite).
  // When building for the browser, run: rollup -i core.js -o dist/eventop.umd.js -f umd -n Eventop
  //
  // The factory receives nothing — all imports are resolved at bundle time
  // because static `import` statements are hoisted above the UMD wrapper by
  // modern bundlers. This file must be processed by a bundler before use in
  // a plain <script> tag.
) {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  const Eventop = {
    providers,

    /**
     * Initialise the SDK. Must be called once before anything else.
     *
     * @param {object} opts
     * @param {Function}  opts.provider        — AI provider function
     * @param {object}    opts.config           — app config
     * @param {string}    opts.config.appName
     * @param {Array}     opts.config.features
     * @param {Function}  [opts.config.router]  — framework navigate fn
     * @param {object}    [opts.config.theme]
     * @param {object}    [opts.config.position]
     * @param {string[]}  [opts.config.suggestions]
     * @param {string}    [opts.config.assistantName]
     */
    init(opts = {}) {
      if (!opts.provider)         throw new Error('[Eventop] provider is required');
      if (!opts.config?.appName)  throw new Error('[Eventop] config.appName is required');
      if (!opts.config?.features) throw new Error('[Eventop] config.features is required');

      state.setProvider(opts.provider);
      state.setConfig(opts.config);
      state.setRouter(opts.config.router || null);

      const theme  = resolveTheme(opts.config.theme);
      const posCSS = resolvePosition(opts.config.position);

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => buildChat(theme, posCSS));
      } else {
        buildChat(theme, posCSS);
      }

      ensureShepherd();
    },

    /** Programmatically open the chat panel. */
    open()  { if (!state.isOpen) togglePanel(); },

    /** Programmatically close the chat panel. */
    close() { if (state.isOpen)  togglePanel(); },

    /** Start a tour directly with a pre-built step array. */
    runTour,

    /** Cancel any active or paused tour and clean up completely. */
    cancelTour() {
      state.setPausedSteps(null);
      state.setPausedIndex(0);
      if (state.tour) { state.tour.cancel(); }
      state.runAndClearCleanups();
      state.setTour(null);
      document.getElementById('sai-trigger')?.classList.remove('sai-paused');
      document.getElementById('sai-resume-prompt')?.remove();
      document.body.classList.remove('sai-glass-preset');
    },

    /** Resume a paused tour from where it was cancelled. */
    resumeTour() {
      if (!state.pausedSteps) return;
      const steps = state.pausedSteps;
      const idx   = state.pausedIndex;
      state.setPausedSteps(null);
      state.setPausedIndex(0);
      document.getElementById('sai-resume-prompt')?.remove();
      document.getElementById('sai-trigger')?.classList.remove('sai-paused');
      if (state.isOpen) togglePanel();
      runTour(steps.slice(idx));
    },

    /** @returns {boolean} true if a tour is currently paused */
    isPaused() { return !!state.pausedSteps; },

    /** @returns {boolean} true if a Shepherd tour is actively running */
    isActive() { return !!(state.tour?.isActive()); },

    /**
     * Advance the active tour step programmatically.
     * Call this from your own UI when you want to signal step completion.
     */
    stepComplete,

    /**
     * Inject an error message into the current tour step.
     * @param {string} message
     */
    stepFail,

    /**
     * @internal — used by the React package to sync the live feature registry.
     * @param {object} partial — partial config to merge
     */
    _updateConfig(partial) {
      if (!state.config) return;
      state.setConfig({ ...state.config, ...partial });
      if (partial.router !== undefined) state.setRouter(partial.router);
    },
  };

  return Eventop;
}));
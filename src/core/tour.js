// Loads Shepherd.js, builds + runs tours, wires up advanceOn listeners,
// progress indicators, pause/resume, and step-level error display.
// ENHANCED: Adds animated ring light effect to highlighted elements.

import * as state from './state.js';
import { expandFlowSteps } from './flow.js';
import {
  navigateToRoute,
  ensureOnCorrectScreen,
  waitForElement,
  getCurrentRoute,
} from './navigation.js';
import { showResumeButton } from './chat.js';

const SHEPHERD_JS = 'https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/js/shepherd.min.js';

// ─── Shepherd loader ──────────────────────────────────────────────────────────

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

export async function ensureShepherd() {
  if (typeof Shepherd !== 'undefined') return;
  await loadScript(SHEPHERD_JS);
}

// ─── Highlight management ────────────────────────────────────────────────────

/**
 * Applies the ring light animation to an element.
 * 
 * @param {HTMLElement} el 
 * @param {string} [style='default'] - 'default' | 'hard' | 'subtle'
 */
export function applyHighlight(el, style = 'default') {
  if (!el) return;
  
  // Set CSS variables for accent color parsing in RGB format
  const accentColor = getComputedStyle(el).getPropertyValue('--sai-accent') || '#e94560';
  const rgb = hexToRgb(accentColor.trim());
  if (rgb) {
    el.style.setProperty('--sai-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  }
  
  el.classList.add('sai-highlighted');
  
  if (style === 'hard') {
    el.classList.add('sai-highlight-hard');
  } else if (style === 'subtle') {
    el.classList.add('sai-highlight-subtle');
  }
  
  // Scroll into view with extra padding
  if (el.scrollIntoView) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Removes the ring light animation from an element.
 */
export function removeHighlight(el) {
  if (!el) return;
  el.classList.remove('sai-highlighted', 'sai-highlight-hard', 'sai-highlight-subtle');
}

/**
 * Converts hex color to RGB object.
 * @param {string} hex 
 * @returns {object|null}
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// ─── Feature-map merge ────────────────────────────────────────────────────────

/**
 * Merges an AI step with its matching entry from the live feature map.
 * The feature map always wins for `selector` so mismatches are impossible.
 *
 * @param {object} step
 * @returns {object}
 */
export function mergeWithFeature(step) {
  if (!state.config?.features) return step;
  const feature = state.config.features.find(f => f.id === (step._parentId || step.id));
  if (!feature) return step;
  return {
    waitFor:   feature.waitFor   || null,
    advanceOn: feature.advanceOn || null,
    validate:  feature.validate  || null,
    screen:    feature.screen    || null,
    flow:      feature.flow      || null,
    route:     feature.route     || null,
    ...step,
    selector: feature.selector || step.selector, // feature map always wins
  };
}

// ─── Step orchestration ───────────────────────────────────────────────────────

/**
 * Builds a `beforeShowPromise` for a Shepherd step that handles:
 *   1. Cross-page navigation (route prop) with automatic waiting
 *   2. Legacy screen navigation (screen.navigate)
 *   3. Element waiting (waitFor prop)
 *   4. Ring light animation application
 *
 * @param {object} step
 * @param {number} waitTimeout
 * @returns {() => Promise<void>}
 */
function makeBeforeShowPromise(step, waitTimeout) {
  return () => (async () => {
    const freshMerged = mergeWithFeature(step);

    const targetRoute = freshMerged.route;
    if (targetRoute && getCurrentRoute() !== targetRoute) {
      await navigateToRoute(targetRoute, freshMerged.name || step.title);

      const postNavMerge = mergeWithFeature(step);

      if (postNavMerge.selector) {
        try {
          step._shepherdRef?.updateStepOptions?.({
            attachTo: { element: postNavMerge.selector, on: step.position || 'bottom' },
          });
        } catch (_) { /* non-fatal */ }

        await waitForElement(postNavMerge.selector, waitTimeout);
        
        // Apply ring light animation to the element
        const el = document.querySelector(postNavMerge.selector);
        if (el) applyHighlight(el, step._highlightStyle || 'default');
        
        return;
      }
    }

    if (freshMerged.screen) {
      await ensureOnCorrectScreen(freshMerged);
    }

    if (freshMerged.waitFor) {
      await waitForElement(freshMerged.waitFor, waitTimeout);
    }
    
    // Apply ring light animation to the main selector
    if (freshMerged.selector) {
      const el = document.querySelector(freshMerged.selector);
      if (el) applyHighlight(el, step._highlightStyle || 'default');
    }
  })();
}

// ─── Event wiring ─────────────────────────────────────────────────────────────

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
  state.pushCleanup(() => document.removeEventListener(advanceOn.event, handler, true));

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

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Starts a Shepherd tour from the given steps array.
 * ENHANCED: Applies ring light animations to highlighted elements.
 *
 * @param {Array}  steps
 * @param {object} [options]
 * @param {boolean} [options.showProgress=true]
 * @param {number}  [options.waitTimeout=8000]
 * @param {string}  [options.highlightStyle='default'] - 'default' | 'hard' | 'subtle'
 */
export async function runTour(steps, options = {}) {
  await ensureShepherd();

  if (state.tour) { state.tour.cancel(); }
  state.runAndClearCleanups();
  state.setTour(null);

  if (!steps?.length) return;

  const { 
    showProgress = true, 
    waitTimeout = 8000,
    highlightStyle = 'default' 
  } = options;

  const mergedSteps = steps.map(step => ({
    ...mergeWithFeature(step),
    _highlightStyle: highlightStyle
  }));

  // Legacy: navigate to the correct screen for the first step
  const firstFeature = state.config?.features?.find(f => f.id === mergedSteps[0]?.id);
  if (firstFeature?.screen) await ensureOnCorrectScreen(firstFeature);

  // Expand flow[] into individual Shepherd steps
  const expandedSteps = mergedSteps.flatMap(step => {
    const feature = state.config?.features?.find(f => f.id === step.id);
    return feature ? expandFlowSteps(step, feature) : [step];
  });

  const ShepherdClass = typeof Shepherd !== 'undefined' ? Shepherd : window.Shepherd;

  const tour = new ShepherdClass.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      scrollTo:   { behavior: 'smooth', block: 'center' },
      cancelIcon: { enabled: true },
      classes:    'sai-shepherd-step',
    },
  });
  state.setTour(tour);

  expandedSteps.forEach((step, i) => {
    const isLast  = i === expandedSteps.length - 1;
    const hasAuto = !!(step.advanceOn?.selector && step.advanceOn?.event);
    const buttons = [];

    if (i > 0) {
      buttons.push({ text: '← Back', action: tour.back, secondary: true });
    }
    buttons.push({
      text:   isLast ? 'Done ✓' : 'Next →',
      action: isLast ? tour.complete : tour.next,
    });
    buttons.push({
      text:      '⏸ Pause',
      secondary: true,
      action:    function () { tour.cancel(); },
    });

    const shepherdStep = tour.addStep({
      id:    step.id || `sai-step-${i}`,
      title: step.title,
      text:  step.text,
      attachTo: step.selector
        ? { element: step.selector, on: step.position || 'bottom' }
        : undefined,
      beforeShowPromise: makeBeforeShowPromise(step, waitTimeout),
      buttons,
    });

    step._shepherdRef = shepherdStep;
    shepherdStep._isLast = isLast;
    
    // Clean up highlight on hide
    shepherdStep.on('hide', () => {
      if (step.selector) {
        const el = document.querySelector(step.selector);
        if (el) removeHighlight(el);
      }
    });

    if (hasAuto) wireAdvanceOn(shepherdStep, step.advanceOn, tour);
    if (showProgress && expandedSteps.length > 1) {
      addProgressIndicator(shepherdStep, i, expandedSteps.length);
    }
  });

  tour.on('complete', () => {
    // Clean up all highlights
    document.querySelectorAll('.sai-highlighted').forEach(el => {
      removeHighlight(el);
    });
    state.runAndClearCleanups();
    state.setPausedSteps(null);
    state.setPausedIndex(0);
    state.setTour(null);
  });

  // Cancel → pause (not hard destroy)
  tour.on('cancel', () => {
    const currentStepEl = tour.getCurrentStep();
    const currentIdx    = currentStepEl
      ? expandedSteps.findIndex(s => s.id === currentStepEl.id)
      : 0;

    // Clean up all highlights
    document.querySelectorAll('.sai-highlighted').forEach(el => {
      removeHighlight(el);
    });

    state.runAndClearCleanups();
    state.setPausedSteps(expandedSteps);
    state.setPausedIndex(Math.max(0, currentIdx));
    state.setTour(null);

    showResumeButton(state.pausedIndex);
  });

  tour.start();
}

/**
 * Advances the active tour to the next step programmatically.
 * Useful when your own UI signals step completion.
 */
export function stepComplete() {
  if (state.tour?.isActive()) state.tour.next();
}

/**
 * Injects an error message into the current Shepherd step's text area.
 *
 * @param {string} [message]
 */
export function stepFail(message) {
  if (!state.tour?.isActive()) return;
  const current = state.tour.getCurrentStep();
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
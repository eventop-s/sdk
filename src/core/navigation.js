// Handles all navigation concerns:
//   • Route-based navigation (new, preferred)
//   • Legacy screen-based navigation (backward-compat)
//   • Pre-tour route announcement
//   • Waiting for DOM elements and URL changes

import * as state from './state.js';
import { addMsg } from './chat.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the current pathname. Centralised so it's easy to mock in tests.
 */
export function getCurrentRoute() {
  return typeof window !== 'undefined' ? window.location.pathname : '/';
}

/**
 * Polls until `window.location.pathname === targetRoute` or timeout.
 * Resolves (never rejects) so a slow router doesn't blow up the tour.
 *
 * @param {string} targetRoute
 * @param {number} [timeout=8000]
 * @returns {Promise<void>}
 */
export function waitForRouteChange(targetRoute, timeout = 8000) {
  return new Promise(resolve => {
    if (window.location.pathname === targetRoute) return resolve();

    const interval = setInterval(() => {
      if (window.location.pathname === targetRoute) {
        clearInterval(interval);
        clearTimeout(timer);
        resolve();
      }
    }, 50);

    const timer = setTimeout(() => {
      clearInterval(interval);
      console.warn(`[Eventop] Route change to "${targetRoute}" timed out — continuing`);
      resolve();
    }, timeout);

    state.pushCleanup(() => { clearInterval(interval); clearTimeout(timer); });
  });
}

/**
 * Waits for a CSS selector to appear in the DOM (up to `timeout` ms).
 * Resolves without throwing so a missing element doesn't crash the tour.
 *
 * @param {string} selector
 * @param {number} [timeout=8000]
 * @returns {Promise<void>}
 */
export function waitForElement(selector, timeout = 8000) {
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
    state.pushCleanup(() => { clearTimeout(timer); observer.disconnect(); });
  });
}

// ─── Route navigation ─────────────────────────────────────────────────────────

/**
 * Navigate to `route` using (in priority order):
 *   1. state.router — the function passed by the developer
 *   2. window.history.pushState + popstate — best-effort fallback for SPAs
 *
 * Shows a friendly chat message, then waits for the URL to confirm the change.
 *
 * @param {string} route
 * @param {string} [featureName]
 * @returns {Promise<void>}
 */
export async function navigateToRoute(route, featureName) {
  if (!route || getCurrentRoute() === route) return;

  addMsg('ai', `↗ Taking you to ${featureName ? `the ${featureName} area` : route}…`);

  try {
    if (state.router) {
      await Promise.resolve(state.router(route));
    } else {
      window.history.pushState({}, '', route);
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }
  } catch (err) {
    console.warn('[Eventop] Navigation error:', err);
  }

  await waitForRouteChange(route, 8000);
  await new Promise(r => setTimeout(r, 80));
}

// ─── Route preview / announcement ────────────────────────────────────────────

/**
 * Inspects the AI's step list and returns which routes will be visited
 * that the user isn't already on — in visit order, deduplicated.
 *
 * @param {Array}  aiSteps
 * @returns {Array<{ route: string, featureName: string }>}
 */
export function previewRoutesNeeded(aiSteps) {
  const currentRoute = getCurrentRoute();
  const seen         = new Set([currentRoute]);
  const ordered      = [];

  aiSteps.forEach(step => {
    const feature = state.config?.features?.find(f => f.id === step.id);
    if (feature?.route && !seen.has(feature.route)) {
      seen.add(feature.route);
      ordered.push({ route: feature.route, featureName: feature.name });
    }
  });

  return ordered;
}

/**
 * Adds a human-readable pre-tour navigation announcement to the chat.
 *
 * @param {Array<{ route: string, featureName: string }>} routesNeeded
 */
export function announceNavigationPlan(routesNeeded) {
  if (!routesNeeded.length) return;

  const names = routesNeeded.map(r => r.featureName || r.route);
  let msg;

  if (names.length === 1) {
    msg = `🗺 I'll navigate you to the ${names[0]} area automatically — no need to go there yourself.`;
  } else {
    const list = names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    msg = `🗺 This tour visits ${names.length} areas: ${list}. I'll navigate between them automatically.`;
  }

  addMsg('ai', msg);
}

// ─── Legacy screen navigation ─────────────────────────────────────────────────

/**
 * Handles the legacy `screen` prop on features (backward-compat).
 * Checks `screen.check()` and calls `screen.navigate()` if needed,
 * then waits for `screen.waitFor` or `feature.selector` to appear.
 *
 * @param {object} feature — a feature config object
 * @returns {Promise<void>}
 */
export async function ensureOnCorrectScreen(feature) {
  if (!feature.screen) return;
  if (typeof feature.screen.check === 'function' && feature.screen.check()) return;

  addMsg('ai', 'Taking you to the right screen first…');

  if (typeof feature.screen.navigate === 'function') {
    feature.screen.navigate();
  }

  const waitSelector = feature.screen.waitFor || feature.selector;
  if (waitSelector) await waitForElement(waitSelector, 10000);
}
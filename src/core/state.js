// Single source of truth for all mutable SDK state.
// Every module imports from here so there is no circular dependency on core.js.
//
// NOTE: modules should mutate these properties directly, e.g.
//   import * as state from './state.js';
//   state.tour = new Shepherd.Tour(...);

/** @type {Function|null} The resolved AI provider function */
export let provider = null;

/** @type {object|null} The merged SDK config object */
export let config = null;

/** @type {Function|null} Framework router function (e.g. React Router's navigate) */
export let router = null;

/** @type {object|null} Active Shepherd.Tour instance */
export let tour = null;

/** @type {boolean} Whether the chat panel is currently visible */
export let isOpen = false;

/** @type {Array<{role:string,content:string}>} AI conversation history */
export let messages = [];

/** @type {MediaQueryList|null} Used for auto dark/light switching */
export let mediaQuery = null;

/** @type {Array<object>|null} Steps saved when a tour is paused */
export let pausedSteps = null;

/** @type {number} Step index to resume from after a pause */
export let pausedIndex = 0;

/** @type {Array<Function>} Cleanup callbacks — called when tour ends or is paused */
export let cleanups = [];

// ─── Setters ─────────────────────────────────────────────────────────────────
// Using setter functions keeps mutations explicit and grep-friendly.

export function setProvider(v)    { provider    = v; }
export function setConfig(v)      { config      = v; }
export function setRouter(v)      { router      = v; }
export function setTour(v)        { tour        = v; }
export function setIsOpen(v)      { isOpen      = v; }
export function setMessages(v)    { messages    = v; }
export function setMediaQuery(v)  { mediaQuery  = v; }
export function setPausedSteps(v) { pausedSteps = v; }
export function setPausedIndex(v) { pausedIndex = v; }
export function setCleanups(v)    { cleanups    = v; }
export function pushCleanup(fn)   { cleanups.push(fn); }
export function runAndClearCleanups() {
  cleanups.forEach(fn => fn());
  cleanups = [];
}
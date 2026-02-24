# SDK Architecture

The core SDK (`@eventop/sdk`) is split into focused single-responsibility modules. This document explains what each module owns, how they relate, and where to make changes.

## Module Map

```
core.js          Public API + UMD wrapper (entry point)
  ├── state.js          Shared mutable state
  ├── providers.js      AI provider factory
  ├── theme.js          Design tokens + CSS variable builder
  ├── positioning.js    Corner/offset config → CSS strings
  ├── prompt.js         AI system prompt builder
  ├── ai.js             Provider call + conversation history
  ├── navigation.js     Route navigation + element waiting
  ├── flow.js           Expands feature flow[] into step arrays
  ├── tour.js           Shepherd.js runner + pause/resume
  ├── styles.js         <style> block injection
  └── chat.js           Chat panel DOM + send handler
```

## Module Responsibilities

### `state.js`
The single source of truth for all mutable runtime state. Every other module imports from here — nothing stores its own private state.

Contains: active tour instance, config, provider function, router, conversation history, pause state, cleanup callbacks.

If you need to add a new piece of runtime state, add it here with a matching setter.

---

### `core.js`
The public-facing entry point. It wires up the modules, exposes the public API (`init`, `open`, `close`, `runTour`, `cancelTour`, `resumeTour`, etc.), and wraps everything in a UMD factory so it works as a `<script>` tag, CommonJS require, or ES module.

Also responsible for breaking the `chat ↔ tour` circular dependency by calling `setRunTour(runTour)` after both modules load.

Don't put logic here. If you're adding behaviour, it belongs in one of the modules below.

---

### `theme.js`
Owns all design token definitions (`DARK_TOKENS`, `LIGHT_TOKENS`, `PRESETS`) and the functions that resolve a user's theme config into a flat token object (`resolveTheme`) and serialize it to CSS custom properties (`buildCSSVars`, `applyTheme`).

If you're adding a new theme preset or token, this is the only file you need to touch.

---

### `positioning.js`
Converts the `position` config (`corner`, `offsetX`, `offsetY`) into concrete CSS values for the trigger button and chat panel. Small and self-contained — no dependencies.

---

### `providers.js`
Factory helpers for creating AI provider functions. Currently only exposes `custom(fn)`. Add new built-in providers (OpenAI, Gemini, etc.) here as named exports.

---

### `prompt.js`
Builds the system prompt string sent to the AI on every request. Takes the live `config` object and returns a formatted string with the feature map embedded.

This is the first place to look when tuning AI behaviour or output format.

---

### `ai.js`
Handles the request/response cycle with the AI provider. Calls `buildSystemPrompt`, sends the conversation history, parses the JSON response (`parseAIResponse`), and updates the conversation history in `state`.

If the AI response format changes, update `parseAIResponse` here.

---

### `navigation.js`
Everything related to moving the user around the app:

- `navigateToRoute` — calls the framework router or falls back to `pushState`
- `waitForElement` — polls the DOM until a selector appears
- `waitForRouteChange` — polls `window.location` until the URL matches
- `ensureOnCorrectScreen` — legacy `screen.navigate()` support
- `previewRoutesNeeded` / `announceNavigationPlan` — pre-tour route announcement

Also imports `addMsg` from `chat.js` to surface status messages to the user.

---

### `flow.js`
Pure utility. Takes a single AI step and a feature config and returns an array of expanded steps when the feature has a `flow[]` property. No dependencies, easy to unit test.

---

### `tour.js`
Loads Shepherd.js, builds the tour, wires up `advanceOn` listeners, progress indicators, and handles the pause-on-cancel behaviour. Calls back into `navigation.js` for per-step navigation via `makeBeforeShowPromise`.

Exposes `runTour`, `stepComplete`, and `stepFail` for use by `core.js` and the public API.

---

### `styles.js`
Injects the single `#sai-styles` `<style>` element that covers both the chat panel UI and the Shepherd step overrides. Reads resolved theme tokens to generate the correct light/dark values at inject time.

The style block is regenerated on system theme change (handled in `chat.js`).

---

### `chat.js`
Builds and manages the chat panel DOM. Also owns the low-level message helpers (`addMsg`, `showTyping`, `hideTyping`) that other modules use to surface status to the user.

Handles the full send flow: takes user input → calls `ai.js` → announces navigation → kicks off the tour via the injected `runTour` reference.

Also renders the pause/resume UI (`showResumeButton`).

## Circular Dependencies

There is one intentional circular reference between `navigation.js` and `chat.js`:

- `navigation.js` calls `addMsg` (from `chat.js`) to show "Taking you to…" messages
- `chat.js` calls `announceNavigationPlan` (from `navigation.js`) before starting a tour

ES modules handle this at runtime without issues because both only reference named function exports (not values evaluated at module init time).

The `chat ↔ tour` cycle is broken explicitly. `chat.js` cannot import `tour.js` (tour imports chat), so `runTour` is injected via `setRunTour(fn)` in `core.js` after all modules are loaded.

## Adding a New Feature

| Task | File(s) to change |
|---|---|
| New theme preset | `theme.js` → `PRESETS` |
| New AI provider | `providers.js` |
| Change AI output format | `prompt.js` + `ai.js` |
| New tour behaviour | `tour.js` |
| New chat UI element | `chat.js` |
| New navigation strategy | `navigation.js` |
| New runtime state | `state.js` |
| New public API method | `core.js` |

## Build

The Rollup config needs no changes — it traces the import graph automatically from `src/index.js`. Adding new modules is picked up without any config update.
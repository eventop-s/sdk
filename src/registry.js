/**
 * FeatureRegistry
 *
 * The live map of everything registered in the React tree — both mounted
 * (full entries) and unmounted (ghost entries).
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Full entry  — component is currently mounted                       │
 * │  { id, name, description, route, selector, ... }                   │
 * │                                                                     │
 * │  Ghost entry — component has unmounted (navigated away)             │
 * │  { id, name, description, route, selector: null, _ghost: true }    │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Why ghosts?
 *
 *   The AI system prompt is built from the registry snapshot. Without ghosts,
 *   features on other pages don't exist in the snapshot when the user is
 *   elsewhere — the AI can't pick them, so cross-page tours never start.
 *
 *   With ghosts, every feature the app has ever rendered stays in the
 *   snapshot permanently. The AI always has the full picture. The tour
 *   runner already resolves selectors lazily (after navigation), so a
 *   null selector on a ghost is fine — it gets filled in at show-time
 *   once the component mounts on the target page.
 *
 * Lifecycle:
 *
 *   EventopTarget mounts   → registerFeature()  → full entry
 *   EventopTarget unmounts → unregisterFeature() → ghost entry (metadata kept)
 *   EventopTarget remounts → registerFeature()  → full entry again (selector restored)
 *
 * Flow steps follow the same pattern — they're pruned on unmount but the
 * parent feature ghost keeps the feature visible to the AI.
 *
 * Nested steps:
 *   Steps can have children steps (sub-steps) by passing a parentStep prop.
 *   This lets you model flows like:
 *
 *   Feature: "Create styled text"
 *     Step 0: Click Add Text
 *     Step 1: Type your content          ← parentStep: 0
 *       Step 1.0: Select the text        ← parentStep: 1, index: 0
 *       Step 1.1: Open font picker       ← parentStep: 1, index: 1
 *       Step 1.2: Choose a font          ← parentStep: 1, index: 2
 *     Step 2: Click Done
 */
export function createFeatureRegistry() {
  // Map<featureId, featureData>
  // Values are either full entries or ghost entries (_ghost: true)
  const features  = new Map();
  // Map<featureId, Map<stepKey, stepData>>
  const flowSteps = new Map();

  const listeners = new Set();
  function notify() { listeners.forEach(fn => fn()); }


  // ── Feature registration ─────────────────────────────────────────────────

  function registerFeature(feature) {
    // Restore a ghost or create a fresh full entry.
    // Always overwrite so a remount gets the latest selector.
    features.set(feature.id, {
      ...feature,
      _ghost:        false,
      _registeredAt: Date.now(),
    });
    notify();
  }

  function unregisterFeature(id) {
    if (!features.has(id)) return;

    // Downgrade to ghost — keep all metadata, null out the live selector.
    // Flow steps are pruned separately (their DOM elements are gone too).
    const feature = features.get(id);
    features.set(id, {
      id:               feature.id,
      name:             feature.name,
      description:      feature.description,
      route:            feature.route            || null,
      navigate:         feature.navigate         || null,
      navigateWaitFor:  feature.navigateWaitFor  || null,
      _registeredAt:    feature._registeredAt,
      selector:         null,
      advanceOn:        null,
      waitFor:          null,
      _ghost:           true,
    });

    // Prune flow steps — their selectors are dead too.
    // They'll re-register when the component remounts on the target page.
    flowSteps.delete(id);

    notify();
  }


  // ── Step registration ────────────────────────────────────────────────────

  function registerStep(featureId, index, parentStep, stepData) {
    if (!flowSteps.has(featureId)) {
      flowSteps.set(featureId, new Map());
    }
    const key = parentStep != null ? `${parentStep}.${index}` : String(index);
    flowSteps.get(featureId).set(key, {
      ...stepData,
      index,
      parentStep: parentStep ?? null,
      key,
    });
    notify();
  }

  function unregisterStep(featureId, index, parentStep) {
    const map = flowSteps.get(featureId);
    if (!map) return;
    const key = parentStep != null ? `${parentStep}.${index}` : String(index);
    map.delete(key);
    if (map.size === 0) flowSteps.delete(featureId);
    notify();
  }


  // ── Snapshot ─────────────────────────────────────────────────────────────

  function buildFlow(featureId) {
    const map = flowSteps.get(featureId);
    if (!map || map.size === 0) return null;

    const allSteps = Array.from(map.values());

    const topLevel = allSteps
      .filter(s => s.parentStep == null)
      .sort((a, b) => a.index - b.index);

    const result = [];
    topLevel.forEach(step => {
      result.push(step);
      const children = allSteps
        .filter(s => s.parentStep === step.index)
        .sort((a, b) => a.index - b.index);
      result.push(...children);
    });

    return result.length > 0 ? result : null;
  }

  /**
   * Returns the full feature array — both live and ghost entries.
   *
   * Ghost entries have selector: null. The SDK core handles this correctly:
   *   - The AI system prompt uses name/description/route (always present)
   *   - The tour runner resolves the selector lazily after navigation,
   *     at which point the component has remounted and re-registered
   *
   * screen.check() returns false for ghosts so the SDK knows navigation
   * is needed before showing the step.
   */
  function snapshot() {
    return Array.from(features.values()).map(feature => {
      const flow    = buildFlow(feature.id);
      const isGhost = feature._ghost === true;

      return {
        id:          feature.id,
        name:        feature.name,
        description: feature.description,
        selector:    feature.selector  || null,
        route:       feature.route     || null,
        advanceOn:   feature.advanceOn || null,
        waitFor:     feature.waitFor   || null,
        _ghost:      isGhost,
        ...(flow ? { flow } : {}),
        screen: {
          id:       feature.id,
          // Ghost entries always fail the check → SDK knows to navigate
          check:    () => features.get(feature.id)?._ghost !== true,
          navigate: feature.navigate        || null,
          waitFor:  feature.navigateWaitFor || feature.selector || null,
        },
      };
    });
  }


  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Returns true only for fully mounted (non-ghost) features.
   */
  function isRegistered(id) {
    const f = features.get(id);
    return !!f && !f._ghost;
  }

  return {
    registerFeature,
    unregisterFeature,
    registerStep,
    unregisterStep,
    snapshot,
    isRegistered,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
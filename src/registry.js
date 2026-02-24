/**
 * FeatureRegistry
 *
 * The live map of everything currently mounted in the React tree.
 *
 * Features   — registered by EventopTarget
 * Flow steps — registered by EventopStep, attached to a feature by id
 *
 * Both features and steps can live anywhere in the component tree.
 * They don't need to be co-located. An EventopStep just needs to know
 * which feature id it belongs to.
 *
 * Nested steps:
 *   Steps can themselves have children steps (sub-steps) by passing
 *   a parentStep prop to EventopStep. This lets you model flows like:
 *
 *   Feature: "Create styled text"
 *     Step 0: Click Add Text
 *     Step 1: Type your content          ← parentStep: 0
 *       Step 1.0: Select the text        ← parentStep: 1, index: 0
 *       Step 1.1: Open font picker       ← parentStep: 1, index: 1
 *       Step 1.2: Choose a font          ← parentStep: 1, index: 2
 *     Step 2: Click Done
 *
 *   In practice most flows are flat (index 0, 1, 2, 3...) but the
 *   registry supports nested depth for complex interactions.
 *
 * Route awareness:
 *   Features can declare the pathname they live on via `route`.
 *   The snapshot() includes this so the SDK core can navigate
 *   automatically when a tour step targets a feature on a different page.
 */
export function createFeatureRegistry() {
  // Map<featureId, featureData>
  const features  = new Map();
  // Map<featureId, Map<stepKey, stepData>>
  const flowSteps = new Map();

  const listeners = new Set();
  function notify() { listeners.forEach(fn => fn()); }

  // ── Feature registration ─────────────────────────────────────────────────

  function registerFeature(feature) {
    features.set(feature.id, {
      ...feature,
      _registeredAt: Date.now(),
    });
    notify();
  }

  function unregisterFeature(id) {
    features.delete(id);
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
   * Returns the live feature array in the format the SDK core expects.
   *
   * `route` is now included in every feature entry so the core can detect
   * when navigation is needed before showing a step.
   */
  function snapshot() {
    return Array.from(features.values()).map(feature => {
      const flow = buildFlow(feature.id);
      return {
        id:          feature.id,
        name:        feature.name,
        description: feature.description,
        selector:    feature.selector,
        route:       feature.route     || null,
        advanceOn:   feature.advanceOn || null,
        waitFor:     feature.waitFor   || null,
        ...(flow ? { flow } : {}),
        screen: {
          id:       feature.id,
          check:    () => features.has(feature.id),
          navigate: feature.navigate || null,
          waitFor:  feature.navigateWaitFor || feature.selector || null,
        },
      };
    });
  }

  return {
    registerFeature,
    unregisterFeature,
    registerStep,
    unregisterStep,
    snapshot,
    isRegistered: (id) => features.has(id),
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
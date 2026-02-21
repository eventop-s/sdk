/**
 * FeatureRegistry
 *
 * The live map of everything currently mounted in the React tree.
 *
 * Features   — registered by ShepherdTarget
 * Flow steps — registered by ShepherdStep, attached to a feature by id
 *
 * Both features and steps can live anywhere in the component tree.
 * They don't need to be co-located. A ShepherdStep just needs to know
 * which feature id it belongs to.
 *
 * Nested steps:
 *   Steps can themselves have children steps (sub-steps) by passing
 *   a parentStep prop to ShepherdStep. This lets you model flows like:
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
 */
export function createFeatureRegistry() {
  // Map<featureId, featureData>
  const features  = new Map();
  // Map<featureId, Map<stepKey, stepData>>
  // stepKey is either a number (flat) or "parentIndex.childIndex" (nested)
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

  /**
   * Register a flow step.
   *
   * @param {string} featureId      - Parent feature id
   * @param {number} index          - Position in the flat flow (0, 1, 2…)
   * @param {number|null} parentStep - If set, this is a sub-step of parentStep
   * @param {object} stepData       - { selector, waitFor, advanceOn, ... }
   */
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

  /**
   * Build the flat flow array the SDK core expects.
   *
   * For nested steps we inline sub-steps after their parent step,
   * in index order. This means a flow like:
   *
   *   Step 0 (flat)
   *   Step 1 (flat)
   *     Step 1.0 (sub-step of 1)
   *     Step 1.1 (sub-step of 1)
   *   Step 2 (flat)
   *
   * becomes the SDK flow: [step0, step1, step1.0, step1.1, step2]
   *
   * The AI writes titles/text for the parent feature.
   * Sub-steps inherit the parent step's text with a "(N/M)" suffix added
   * by the SDK's expandFlowSteps() function.
   */
  function buildFlow(featureId) {
    const map = flowSteps.get(featureId);
    if (!map || map.size === 0) return null;

    const allSteps = Array.from(map.values());

    // Separate top-level and nested steps
    const topLevel = allSteps
      .filter(s => s.parentStep == null)
      .sort((a, b) => a.index - b.index);

    const result = [];
    topLevel.forEach(step => {
      result.push(step);
      // Inline any sub-steps after the parent
      const children = allSteps
        .filter(s => s.parentStep === step.index)
        .sort((a, b) => a.index - b.index);
      result.push(...children);
    });

    return result.length > 0 ? result : null;
  }

  /**
   * Returns the live feature array in the format the SDK core expects.
   * screen.check() is automatic — mounted = available.
   */
  function snapshot() {
    return Array.from(features.values()).map(feature => {
      const flow = buildFlow(feature.id);
      return {
        id:          feature.id,
        name:        feature.name,
        description: feature.description,
        selector:    feature.selector,
        advanceOn:   feature.advanceOn  || null,
        waitFor:     feature.waitFor    || null,
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

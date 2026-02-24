// Expands a feature's `flow[]` array into individual Shepherd-ready step objects.
// A feature with no `flow` is returned as-is (wrapped in an array).

/**
 * @param {object} aiStep   — the step object returned by the AI
 * @param {object} feature  — the matching feature config (may have a .flow array)
 * @returns {Array<object>} one or more expanded step objects
 */
export function expandFlowSteps(aiStep, feature) {
  if (!feature.flow?.length) return [aiStep];

  return feature.flow.map((entry, i) => ({
    id:        `${aiStep.id}-flow-${i}`,
    title:     i === 0
      ? aiStep.title
      : `${aiStep.title} (${i + 1}/${feature.flow.length})`,
    text:      i === 0
      ? aiStep.text
      : `Step ${i + 1} of ${feature.flow.length}: continue with the action highlighted below.`,
    position:  aiStep.position || 'bottom',
    selector:  entry.selector  || null,
    waitFor:   entry.waitFor   || null,
    advanceOn: entry.advanceOn || null,
    _parentId: aiStep.id,
  }));
}
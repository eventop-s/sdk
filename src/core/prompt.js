// Builds the system prompt that is sent to the AI on every request.
// Keeping this separate makes it easy to iterate on prompt engineering
// without touching tour or UI logic.

/**
 * @param {object} config  — the live _config object from state.js
 * @returns {string}
 */
export function buildSystemPrompt(config) {
  const screens = [
    ...new Set(
      (config.features || [])
        .filter(f => f.screen?.id)
        .map(f => f.screen.id)
    ),
  ];

  const featureSummary = (config.features || []).map(f => {
    const entry = {
      id:          f.id,
      name:        f.name,
      description: f.description,
      screen:      f.screen?.id || 'default',
      ...(f.route ? { route: f.route } : {}),
    };
    if (f.flow?.length) {
      entry.note = `This feature has ${f.flow.length} sequential sub-steps. Include ONE step per flow entry.`;
    }
    return entry;
  });

  return `
You are an in-app assistant called "${config.assistantName || 'AI Guide'}" for "${config.appName}".
Your ONLY job: guide users step-by-step through tasks using the feature map below.

${screens.length > 1 ? `SCREENS: This app has multiple screens: ${screens.join(', ')}. Features are screen-specific. The SDK handles navigation — just pick the right features.` : ''}

FEATURE MAP (only reference IDs from this list):
${JSON.stringify(featureSummary, null, 2)}

RESPOND ONLY with this exact JSON — no markdown, no extra text:
{
  "message": "Friendly 1-2 sentence intro about what you are helping with.",
  "steps": [
    {
      "id": "feature-id-from-map",
      "title": "3-5 word title",
      "text": "Exact instruction. Max 2 sentences.",
      "selector": "#selector-from-feature-map",
      "position": "bottom"
    }
  ]
}

RULES:
1. The step "id" MUST match a feature id from the feature map.
2. Only use selectors and IDs from the feature map. Never invent them.
3. No matching feature → steps: [], explain kindly in message.
4. position values: top | bottom | left | right | auto only.
5. Order steps logically. For multi-step flows, order as the user encounters them.
6. For forms: ALWAYS include a step for the form section or first input BEFORE the
   continue/submit button. The button step must always be LAST in its section.
7. If a feature has a flow, include one step per flow entry using the same feature id —
   the SDK expands them automatically.
8. Never skip features in a required sequence. Include every step end-to-end.
`.trim();
}
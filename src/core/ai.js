// Handles the request/response cycle with the AI provider.
// Parses the structured JSON the AI must return and maintains conversation history.

import { buildSystemPrompt } from './prompt.js';
import * as state from './state.js';

/**
 * Strips markdown code fences and parses the AI's JSON response.
 * Throws a user-friendly error if the response is malformed.
 *
 * @param {string} raw
 * @returns {{ message: string, steps: Array }}
 */
export function parseAIResponse(raw) {
  const clean = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i,     '')
    .replace(/```\s*$/i,     '')
    .trim();

  try {
    const p = JSON.parse(clean);
    if (typeof p.message !== 'string' || !Array.isArray(p.steps)) {
      throw new Error('Bad shape');
    }
    return p;
  } catch {
    console.error('[Eventop] Unparseable AI response:', raw);
    throw new Error('AI returned an unreadable response. Please try again.');
  }
}

/**
 * Sends the user's message to the provider, updates conversation history,
 * and returns the parsed AI result.
 *
 * @param {string} userMessage
 * @returns {Promise<{ message: string, steps: Array }>}
 */
export async function callAI(userMessage) {
  const systemPrompt    = buildSystemPrompt(state.config);
  const messagesWithNew = [...state.messages, { role: 'user', content: userMessage }];

  const result = await state.provider({ systemPrompt, messages: messagesWithNew });

  state.setMessages([
    ...state.messages,
    { role: 'user',      content: userMessage },
    { role: 'assistant', content: result.message },
  ]);

  return result;
}
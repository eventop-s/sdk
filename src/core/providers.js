// Factory helpers for creating AI provider functions.
// Extend this file to add new built-in providers (OpenAI, Gemini, etc.).

export const providers = {
  custom(fn) {
    if (typeof fn !== 'function') {
      throw new Error('[Eventop] providers.custom() requires a function');
    }
    return fn;
  },
};
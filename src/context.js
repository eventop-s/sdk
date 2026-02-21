import { createContext, useContext } from 'react';

/**
 * Root context — holds the global feature registry.
 * Set by EventopAIProvider at the root of the app.
 */
export const EventopRegistryContext = createContext(null);

/**
 * Feature scope context — set by EventopTarget.
 * Tells any EventopStep inside the tree which feature it belongs to,
 * so you can nest EventopStep inside a EventopTarget without repeating
 * the feature id. Also supports explicit feature="id" on EventopStep
 * for steps that live outside their parent EventopTarget in the tree.
 */
export const EventopFeatureScopeContext = createContext(null);

export function useRegistry() {
  const ctx = useContext(EventopRegistryContext);
  if (!ctx) throw new Error('[EventopAI] Must be used inside <EventopAIProvider>.');
  return ctx;
}

export function useFeatureScope() {
  return useContext(EventopFeatureScopeContext); // null is fine — steps can declare feature explicitly
}

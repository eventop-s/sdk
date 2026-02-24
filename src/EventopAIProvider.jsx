import { useEffect, useRef, useCallback } from 'react';
import { EventopRegistryContext } from './context.js';
import { createFeatureRegistry } from './registry.js';

/**
 * EventopProvider  (exported as EventopAIProvider)
 *
 * Drop this once at the root of your app.
 * Every EventopTarget and EventopStep anywhere in the tree will
 * register with this provider automatically.
 *
 * NEW: `router` prop — a function that navigates to a given pathname.
 * Pass your framework's navigation function here so the SDK can move
 * the user to the right page before showing a tour step.
 *
 * The SDK will:
 *   1. Announce which pages the tour will visit (before starting)
 *   2. Call router(path) automatically when a step needs a different page
 *   3. Wait for the target element to appear before showing the step
 *
 * @example — React Router v6
 * import { useNavigate } from 'react-router-dom';
 *
 * function Root() {
 *   const navigate = useNavigate();
 *   return (
 *     <EventopAIProvider router={navigate} ...>
 *       <App />
 *     </EventopAIProvider>
 *   );
 * }
 *
 * @example — Next.js App Router
 * 'use client';
 * import { useRouter } from 'next/navigation';
 *
 * export function EventopProvider({ children }) {
 *   const router = useRouter();
 *   return (
 *     <EventopAIProvider router={(path) => router.push(path)} ...>
 *       {children}
 *     </EventopAIProvider>
 *   );
 * }
 *
 * @example — Next.js Pages Router
 * 'use client';
 * import { useRouter } from 'next/router';
 *
 * export function EventopProvider({ children }) {
 *   const router = useRouter();
 *   return (
 *     <EventopAIProvider router={(path) => router.push(path)} ...>
 *       {children}
 *     </EventopAIProvider>
 *   );
 * }
 */
export function EventopProvider({
  children,
  provider,
  appName,
  assistantName,
  suggestions,
  theme,
  position,
  router,
}) {
  if (!provider) throw new Error('[Eventop] <EventopProvider> requires a provider prop.');
  if (!appName)  throw new Error('[Eventop] <EventopProvider> requires an appName prop.');

  const registry = useRef(createFeatureRegistry()).current;
  const sdkReady = useRef(false);

  const syncToSDK = useCallback(() => {
    if (!sdkReady.current || !window.Eventop) return;
    window.Eventop._updateConfig?.({ features: registry.snapshot() });
  }, [registry]);

  useEffect(() => {
    async function boot() {
      await import('./core.js');

      window.Eventop.init({
        provider,
        config: {
          appName,
          assistantName,
          suggestions,
          theme,
          position,
          router,
          features:      registry.snapshot(),
          _providerName: 'custom',
        },
      });
      sdkReady.current = true;
      syncToSDK();
    }

    boot();

    const unsub = registry.subscribe(syncToSDK);
    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.Eventop?.cancelTour();
      }
    };
  }, [provider, appName, assistantName, suggestions, theme, position, registry, syncToSDK]);
  // Note: `router` is intentionally omitted from the deps array above.
  // Router instances from useNavigate / useRouter are stable references —
  // including them would re-boot the SDK on every render.
  // Instead, we sync router updates via a separate effect below.

  // ── Keep the router reference fresh without re-booting the SDK ─────────────
  // When the router instance changes (rare, but can happen in Next.js during
  // hydration), we push the new reference into the already-running SDK core.
  useEffect(() => {
    if (sdkReady.current && window.Eventop) {
      window.Eventop._updateConfig?.({ router });
    }
  }, [router]);

  const ctx = {
    registerFeature:   registry.registerFeature,
    unregisterFeature: registry.unregisterFeature,
    registerStep:      registry.registerStep,
    unregisterStep:    registry.unregisterStep,
    isRegistered:      registry.isRegistered,
  };

  return (
    <EventopRegistryContext.Provider value={ctx}>
      {children}
    </EventopRegistryContext.Provider>
  );
}
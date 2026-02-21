import { useEffect, useRef, useCallback } from 'react';
import { EventopRegistryContext } from './context.js';
import { createFeatureRegistry } from './registry.js';

/**
 * EventopProvider
 *
 * Drop this once at the root of your app.
 * Every EventopTarget and EventopStep anywhere in the tree will
 * register with this provider automatically.
 *
 * @example
 * <EventopProvider
 *   provider={myServerFetcher}
 *   appName="PixelCraft"
 *   assistantName="Pixel AI"
 *   suggestions={['Add a shadow', 'Export design']}
 *   theme={{ mode: 'dark', tokens: { accent: '#6366f1' } }}
 *   position={{ corner: 'bottom-right' }}
 * >
 *   <App />
 * </EventopProvider>
 */
export function EventopProvider({
  children,
  provider,
  appName,
  assistantName,
  suggestions,
  theme,
  position,
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
    function boot() {
      window.Eventop.init({
        provider,
        config: {
          appName,
          assistantName,
          suggestions,
          theme,
          position,
          features:      registry.snapshot(),
          _providerName: 'custom',
        },
      });
      sdkReady.current = true;
      syncToSDK();
    }

    if (window.Eventop) {
      boot();
    } else {
      const s = document.createElement('script');
      s.src    = 'https://unpkg.com/shepherd-ai-sdk/dist/shepherd-ai.umd.js';
      s.onload = boot;
      document.head.appendChild(s);
    }

    const unsub = registry.subscribe(syncToSDK);
    return () => { unsub(); window.Eventop?.cancelTour(); };
  }, []);

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
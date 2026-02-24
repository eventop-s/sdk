import { useEffect, useRef, Children, cloneElement } from 'react';
import { useRegistry, EventopFeatureScopeContext } from './context.js';

/**
 * EventopTarget
 *
 * Wraps any component and registers it as an Eventop feature at the call site.
 * The wrapped component does not need to know about Eventop.
 *
 * NEW: `route` prop — the pathname where this feature lives (e.g. "/settings/export").
 * When a tour step points at a feature that has `route`, the SDK will automatically
 * navigate there before showing the step and explain to the user why it's navigating.
 *
 * @example — React Router
 * <EventopTarget id="billing" name="Billing" route="/settings/billing">
 *   <BillingSection />
 * </EventopTarget>
 *
 * @example — Next.js App Router
 * <EventopTarget id="export" name="Export" route="/canvas/export">
 *   <ExportButton />
 * </EventopTarget>
 */
export function EventopTarget({
  children,
  id,
  name,
  description,
  route,
  navigate,
  navigateWaitFor,
  advanceOn,
  waitFor,
  ...rest
}) {
  const registry = useRegistry();
  const ref      = useRef(null);

  const dataAttr = `data-evtp-${id}`;
  const selector = `[${dataAttr}]`;

  useEffect(() => {
    if (!id || !name) {
      console.warn('[Eventop] <EventopTarget> requires id and name props.');
      return;
    }

    registry.registerFeature({
      id,
      name,
      description,
      route,
      selector,
      navigate,
      navigateWaitFor,
      waitFor,
      advanceOn: advanceOn ? { selector, ...advanceOn } : null,
    });

    return () => registry.unregisterFeature(id);
  }, [id, name, description, route]);

  const child = Children.only(children);

  let wrapped;
  try {
    wrapped = cloneElement(child, {
      [dataAttr]: '',
      ref: (node) => {
        ref.current = node;
        const originalRef = child.ref;
        if (typeof originalRef === 'function') originalRef(node);
        else if (originalRef && 'current' in originalRef) originalRef.current = node;
      },
    });
  } catch {
    wrapped = (
      <span {...{ [dataAttr]: '' }} ref={ref} style={{ display: 'contents' }}>
        {child}
      </span>
    );
  }

  return (
    <EventopFeatureScopeContext.Provider value={id}>
      {wrapped}
    </EventopFeatureScopeContext.Provider>
  );
}
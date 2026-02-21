import { useEffect, useRef, Children, cloneElement } from 'react';
import { useRegistry, EventopFeatureScopeContext } from './context.js';

/**
 * EventopTarget
 *
 * Wraps any component and registers it as an Eventop feature at the call site.
 * The wrapped component does not need to know about Eventop.
 */
export function EventopTarget({
  children,
  id,
  name,
  description,
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
      selector,
      navigate,
      navigateWaitFor,
      waitFor,
      advanceOn: advanceOn ? { selector, ...advanceOn } : null,
    });

    return () => registry.unregisterFeature(id);
  }, [id, name, description]);

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
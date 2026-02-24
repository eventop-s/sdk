'use client';

import { useEffect, useRef, Children } from 'react';
import { useRegistry, EventopFeatureScopeContext } from './context.js';

/**
 * EventopTarget
 *
 * Wraps any component and registers it as an Eventop feature at the call site.
 * The wrapped component does not need to know about Eventop, forward unknown
 * props, or accept refs.
 *
 * Instead of passing the data attribute through React's prop system (which fails
 * silently if the component doesn't spread ...rest), we render a transparent
 * wrapper span and set the attribute directly on the first real child DOM element
 * after mount. This works universally — your own components, shadcn, MUI, Radix,
 * any third-party component, regardless of whether it forwards unknown props.
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
}) {
  const registry   = useRegistry();
  const wrapperRef = useRef(null);

  const dataAttr = `data-evtp-${id}`;
  const selector = `[${dataAttr}]`;

  useEffect(() => {
    if (!id || !name) {
      console.warn('[Eventop] <EventopTarget> requires id and name props.');
      return;
    }

    // Set the attribute directly on the first real child DOM element.
    // This bypasses React's prop system entirely — works regardless of whether
    // the wrapped component forwards unknown props.
    const firstChild = wrapperRef.current?.firstElementChild;
    if (firstChild) {
      firstChild.setAttribute(dataAttr, '');
    } else {
      console.warn(
        `[Eventop] <EventopTarget id="${id}"> could not find a child DOM element to attach to. ` +
        `Make sure the wrapped component renders at least one DOM element.`
      );
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

    return () => {
      // Clean up the injected attribute on unmount
      const el = wrapperRef.current?.firstElementChild;
      if (el) el.removeAttribute(dataAttr);

      registry.unregisterFeature(id);
    };
  }, [id, name, description, route]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <EventopFeatureScopeContext.Provider value={id}>
      {/*
        display:contents makes the span invisible to layout — it contributes
        no box of its own. The data attribute lands on firstElementChild (the
        real DOM element), so Shepherd always anchors to the correct bounding box.
      */}
      <span ref={wrapperRef} style={{ display: 'contents' }}>
        {Children.only(children)}
      </span>
    </EventopFeatureScopeContext.Provider>
  );
}
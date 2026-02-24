'use client';

import { useEffect, useRef, Children } from 'react';
import { useRegistry, useFeatureScope } from './context.js';

/**
 * EventopStep
 *
 * Registers one step in a multi-step flow. Can live anywhere in the tree.
 * Steps self-assemble into order via the `index` prop.
 *
 * Uses the same direct DOM attribute injection as EventopTarget — works
 * with any component regardless of whether it forwards unknown props.
 */
export function EventopStep({
  children,
  feature,
  index,
  parentStep,
  waitFor,
  advanceOn,
}) {
  const registry     = useRegistry();
  const featureScope = useFeatureScope();
  const featureId    = feature || featureScope;
  const wrapperRef   = useRef(null);

  if (!featureId) {
    console.warn('[Eventop] <EventopStep> needs either a feature prop or an <EventopTarget> ancestor.');
  }
  if (index == null) {
    console.warn('[Eventop] <EventopStep> requires an index prop.');
  }

  const dataAttr = `data-evtp-step-${featureId}-${parentStep != null ? `${parentStep}-` : ''}${index}`;
  const selector = `[${dataAttr}]`;

  useEffect(() => {
    if (!featureId || index == null) return;

    // Inject attribute directly onto the first real child DOM element
    const firstChild = wrapperRef.current?.firstElementChild;
    if (firstChild) {
      firstChild.setAttribute(dataAttr, '');
    }

    registry.registerStep(featureId, index, parentStep ?? null, {
      selector,
      waitFor:   waitFor   || null,
      advanceOn: advanceOn ? { selector, ...advanceOn } : null,
    });

    return () => {
      const el = wrapperRef.current?.firstElementChild;
      if (el) el.removeAttribute(dataAttr);

      registry.unregisterStep(featureId, index, parentStep ?? null);
    };
  }, [featureId, index, parentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span ref={wrapperRef} style={{ display: 'contents' }}>
      {Children.only(children)}
    </span>
  );
}
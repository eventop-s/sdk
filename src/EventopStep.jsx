import { useEffect, useRef, Children, cloneElement } from 'react';
import { useRegistry, useFeatureScope } from './context.js';

/**
 * EventopStep
 *
 * Registers one step in a multi-step flow. Can live anywhere in the tree.
 * Steps self-assemble into order via the `index` prop.
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
  const ref          = useRef(null);

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

    registry.registerStep(featureId, index, parentStep ?? null, {
      selector,
      waitFor:   waitFor   || null,
      advanceOn: advanceOn ? { selector, ...advanceOn } : null,
    });

    return () => registry.unregisterStep(featureId, index, parentStep ?? null);
  }, [featureId, index, parentStep]);

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

  return wrapped;
}
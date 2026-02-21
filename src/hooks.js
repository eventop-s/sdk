import { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
//  useEventopAI
//
//  Access the SDK programmatic API from inside any component.
//  Use for stepComplete(), stepFail(), open(), close() etc.
//
//  @example
//  function CheckoutForm() {
//    const { stepComplete, stepFail } = useEventopAI();
//
//    async function handleNext() {
//      const ok = await validateEmail(email);
//      if (ok) stepComplete();
//      else stepFail('Please enter a valid email address.');
//    }
//  }
// ═══════════════════════════════════════════════════════════════════════════

export function useEventop() {
  const sdk = () => window.Eventop;

  return {
    open:         ()      => sdk()?.open(),
    close:        ()      => sdk()?.close(),
    cancelTour:   ()      => sdk()?.cancelTour(),
    resumeTour:   ()      => sdk()?.resumeTour(),
    isActive:     ()      => sdk()?.isActive()  ?? false,
    isPaused:     ()      => sdk()?.isPaused()  ?? false,
    stepComplete: ()      => sdk()?.stepComplete(),
    stepFail:     (msg)   => sdk()?.stepFail(msg),
    runTour:      (steps) => sdk()?.runTour(steps),
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  useEventopTour
//
//  Reactively tracks tour state so you can render your own UI.
//  Polls at 300ms — lightweight enough for a status indicator.
//
//  @example
//  function TourBar() {
//    const { isActive, isPaused, resume, cancel } = useEventopTour();
//    if (!isActive && !isPaused) return null;
//    return (
//      <div>
//        {isPaused && <button onClick={resume}>Resume tour</button>}
//        <button onClick={cancel}>End</button>
//      </div>
//    );
//  }
// ═══════════════════════════════════════════════════════════════════════════

export function useEventopTour() {
  const [state, setState] = useState({ isActive: false, isPaused: false });

  useEffect(() => {
    const id = setInterval(() => {
      const sdk = window.Eventop;
      if (!sdk) return;
      const next = { isActive: sdk.isActive(), isPaused: sdk.isPaused() };
      setState(prev =>
        prev.isActive !== next.isActive || prev.isPaused !== next.isPaused ? next : prev
      );
    }, 300);
    return () => clearInterval(id);
  }, []);

  return {
    ...state,
    resume: useCallback(() => window.Eventop?.resumeTour(), []),
    cancel: useCallback(() => window.Eventop?.cancelTour(), []),
    open:   useCallback(() => window.Eventop?.open(),       []),
    close:  useCallback(() => window.Eventop?.close(),      []),
  };
}
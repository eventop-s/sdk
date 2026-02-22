window.EventopAI = {
  init,
  open,
  close,
  cancelTour,
  resumeTour,
  stepComplete,
  stepFail,
  isActive,
  isPaused,
  runTour,
  _updateConfig,
  providers,
};

export default window.EventopAI;
export { EventopProvider as EventopAIProvider }  from '../EventopAIProvider.jsx';
export { EventopTarget }    from '../EventopTarget.jsx';
export { EventopStep }      from '../EventopStep.jsx';
export { useEventopAI as useEventopAI }       from '../hooks.js';
export { useEventopTour }   from '../hooks.js';
// Converts a corner/offset config into CSS position values for the
// trigger button and the chat panel.

export function resolvePosition(posConfig = {}) {
  const { corner = 'bottom-right', offsetX = 28, offsetY = 28 } = posConfig;
  const isLeft = corner.includes('left');
  const isTop  = corner.includes('top');
  return {
    trigger: {
      [isLeft ? 'left' : 'right']: `${offsetX}px`,
      [isTop  ? 'top'  : 'bottom']: `${offsetY}px`,
    },
    panel: {
      [isLeft ? 'left' : 'right']: `${offsetX}px`,
      [isTop  ? 'top'  : 'bottom']: `${offsetY + 56 + 12}px`,
      transformOrigin: isTop ? 'top center' : 'bottom center',
    },
  };
}

export function positionToCSS(obj) {
  return Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(';');
}
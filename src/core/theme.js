// Resolves design tokens from user config and builds CSS variable strings.

export const DARK_TOKENS = {
  accent:          '#e94560',
  accentSecondary: '#a855f7',
  bg:              '#0f0f1a',
  surface:         '#1a1a2e',
  border:          '#2a2a4a',
  text:            '#e0e0f0',
  textDim:         '#6060a0',
  radius:          '16px',
  fontFamily:      "system-ui, -apple-system, 'Segoe UI', sans-serif",
};

export const LIGHT_TOKENS = {
  accent:          '#e94560',
  accentSecondary: '#7c3aed',
  bg:              '#ffffff',
  surface:         '#f8f8fc',
  border:          '#e4e4f0',
  text:            '#1a1a2e',
  textDim:         '#888899',
  radius:          '16px',
  fontFamily:      "system-ui, -apple-system, 'Segoe UI', sans-serif",
};

export const PRESETS = {
  default: {},
  minimal: { accent: '#000000', accentSecondary: '#333333', radius: '8px' },
  soft:    { accent: '#6366f1', accentSecondary: '#8b5cf6', radius: '20px' },
  glass:   { radius: '14px' },
};

export function resolveTheme(themeConfig = {}) {
  const { mode = 'auto', preset = 'default', tokens = {} } = themeConfig;
  const isDark = mode === 'auto'
    ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true)
    : mode === 'dark';
  const base = isDark ? { ...DARK_TOKENS } : { ...LIGHT_TOKENS };
  return { ...base, ...(PRESETS[preset] || {}), ...tokens, _isDark: isDark };
}

export function buildCSSVars(t) {
  return `
    --sai-accent:   ${t.accent};
    --sai-accent2:  ${t.accentSecondary};
    --sai-bg:       ${t.bg};
    --sai-surface:  ${t.surface};
    --sai-border:   ${t.border};
    --sai-text:     ${t.text};
    --sai-text-dim: ${t.textDim};
    --sai-radius:   ${t.radius};
    --sai-font:     ${t.fontFamily};
  `;
}

export function applyTheme(t) {
  const panel   = document.getElementById('sai-panel');
  const trigger = document.getElementById('sai-trigger');
  if (panel)   panel.style.cssText   += buildCSSVars(t);
  if (trigger) trigger.style.cssText += buildCSSVars(t);
}
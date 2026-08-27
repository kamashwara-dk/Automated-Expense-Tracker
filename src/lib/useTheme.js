'use client';

import { useEffect } from 'react';

export const THEME_CONFIGS = {
  dark: {
    '--background':    '#070b12',
    '--bg-card':       'rgba(15,23,42,0.55)',
    '--bg-header':     'rgba(7,11,18,0.88)',
    '--bg-nav':        'rgba(7,11,18,0.92)',
    '--bg-modal':      'rgba(10,15,26,0.97)',
    '--border-subtle': 'rgba(255,255,255,0.07)',
  },
  midnight: {
    '--background':    '#03060f',
    '--bg-card':       'rgba(6,14,35,0.70)',
    '--bg-header':     'rgba(3,6,15,0.94)',
    '--bg-nav':        'rgba(3,6,15,0.96)',
    '--bg-modal':      'rgba(4,8,20,0.98)',
    '--border-subtle': 'rgba(80,100,200,0.10)',
  },
};

export const ACCENT_CONFIGS = {
  mint:   '#74FFAC',
  violet: '#a78bfa',
  sky:    '#38bdf8',
  amber:  '#fbbf24',
  rose:   '#fb7185',
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export function applyTheme(theme = 'dark', accent = 'mint') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const themeVars  = THEME_CONFIGS[theme]  || THEME_CONFIGS.dark;
  const accentHex  = ACCENT_CONFIGS[accent] || ACCENT_CONFIGS.mint;
  const accentRgb  = hexToRgb(accentHex);

  Object.entries(themeVars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.setProperty('--accent',     accentHex);
  root.style.setProperty('--accent-rgb', accentRgb);
  root.style.setProperty('--accent-dim', `rgba(${accentRgb},0.15)`);

  // Also set body background immediately so there's no flash
  document.body.style.backgroundColor = themeVars['--background'];
}

/** React hook — call once at app root */
export function useTheme(theme = 'dark', accent = 'mint') {
  useEffect(() => {
    applyTheme(theme, accent);
  }, [theme, accent]);
}

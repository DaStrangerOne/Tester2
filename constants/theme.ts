// Red Team AI — Design Tokens
export const Colors = {
  // Base
  bg: '#080808',
  bgSecondary: '#0f0f0f',
  surface: '#141414',
  surfaceElevated: '#1a1a1a',
  surfaceBorder: '#222222',

  // Brand
  primary: '#ff2222',
  primaryDim: '#cc1a1a',
  primaryGlow: 'rgba(255,34,34,0.15)',
  primaryMuted: 'rgba(255,34,34,0.08)',

  // Accent
  accent: '#00ff41',
  accentDim: '#00cc33',
  accentGlow: 'rgba(0,255,65,0.12)',
  accentMuted: 'rgba(0,255,65,0.06)',

  // Status
  warning: '#ffaa00',
  info: '#3399ff',
  success: '#00ff41',
  danger: '#ff2222',

  // Text
  textPrimary: '#e8e8e8',
  textSecondary: '#999999',
  textMuted: '#555555',
  textAccent: '#00ff41',
  textDanger: '#ff4444',

  // Overlay
  overlay: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(0,0,0,0.4)',
};

export const Typography = {
  // Sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 19,
  xl: 22,
  xxl: 28,
  hero: 36,

  // Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 999,
};

export const Shadow = {
  redGlow: {
    shadowColor: '#ff2222',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  greenGlow: {
    shadowColor: '#00ff41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
};

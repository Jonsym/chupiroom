/**
 * ChupiRoom shared theme.
 * Cinematic, minimal, premium. Core identity: deep near-black (#101111) +
 * soft off-white accent (#E0DDEE). No purple/neon — the accent carries every
 * highlight, key border and primary action.
 */

export const colors = {
  background: '#101111',
  surface: '#181A1B',
  surfaceElevated: '#212325',
  /** Primary accent — buttons, highlights, key borders, key details. */
  accent: '#E0DDEE',
  /** Dimmed accent — secondary icons/text, subtle details. */
  accentSoft: '#B8B5C8',
  white: '#FFFFFF',
  mutedText: '#8C8E93',
  /** Subtle hairline borders, tied to the accent identity. */
  border: 'rgba(224,221,238,0.10)',
  /** Reserved for destructive actions only. */
  danger: '#E06C75',
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 34,
  display: 44,
} as const;

/** Reusable gradient stops. Kept subtle for a cinematic dark feel. */
export const gradients = {
  screen: ['#171819', '#0E0F10'] as const,
  accent: ['#E0DDEE', '#CFCBDD'] as const,
};

export const theme = {
  colors,
  radius,
  spacing,
  fontSize,
  gradients,
} as const;

export type Theme = typeof theme;

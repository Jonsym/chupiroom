/**
 * Single source of truth for the app's visible brand.
 * Update the name here and it propagates across every screen.
 */
export const APP_NAME = 'ChupiRoom';

/** Split form for two-tone wordmark rendering ("Chupi" + "Room"). */
export const APP_NAME_PARTS = {
  primary: 'Chupi',
  accent: 'Room',
} as const;

export const APP_TAGLINE =
  'El party game para tus streams y tus fiestas. Sin cuentas, sin internet, solo caos.';

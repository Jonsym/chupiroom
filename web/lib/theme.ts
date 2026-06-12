/**
 * ChupiRoom web theme tokens — the single source for brand values needed in
 * TypeScript/JS. These mirror the mobile palette in `constants/theme.ts`
 * (deep near-black + soft off-white accent #E0DDEE). Tailwind reads the same
 * values from the `@theme` block in `app/globals.css`.
 */
export const brand = {
  background: "#101111",
  surface: "#181A1B",
  surfaceElevated: "#212325",
  accent: "#E0DDEE",
  accentSoft: "#B8B5C8",
  muted: "#8C8E93",
  border: "rgba(224,221,238,0.10)",
  danger: "#E06C75",
} as const;

export const APP_NAME = "ChupiRoom";

/** Up-to-two-letter initials for an avatar circle. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}

/** Muted, on-brand avatar palette (mirrors the mobile AVATAR_COLORS). */
export const AVATAR_COLORS = [
  "#E0DDEE",
  "#9B98AC",
  "#C6A8A2",
  "#A6B5AE",
  "#B9B0C9",
  "#C9C2A8",
  "#A0AAB8",
  "#C2A6B4",
] as const;

const NAME_KEY = "chupiroom:web:displayName";

/** Remember the viewer's display name locally for convenience. */
export function getStoredName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // ignore storage failures
  }
}

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Small shared web style system for ChupiRoom (Phase 1, presentational only).
 * Built on the Tailwind theme tokens defined in app/globals.css.
 */

/** Wordmark: "Chupi" in accent off-white, "Room" dimmed. Links home. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`font-black tracking-tight ${className}`}>
      <span className="text-accent">Chupi</span>
      <span className="text-accent-soft">Room</span>
    </Link>
  );
}

/** Cinematic dark page shell: soft radial glow + centered, max-width content. */
export function GlowShell({ children }: { children: ReactNode }) {
  return (
    <main className="cr-glow flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-8">{children}</div>
    </main>
  );
}

/** Elevated surface card with a hairline accent border. */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-full rounded-3xl border border-border bg-surface/80 p-7 backdrop-blur ${className}`}>
      {children}
    </div>
  );
}

/** Small uppercase label chip. */
export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-accent-soft">
      {children}
    </span>
  );
}

/** Primary / secondary call-to-action rendered as a link (no client logic yet). */
export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const base =
    "flex h-12 w-full items-center justify-center rounded-full px-5 text-base font-bold transition-colors";
  const look =
    variant === "primary"
      ? "bg-accent text-background hover:bg-accent-soft"
      : "border border-border bg-surface-elevated text-accent hover:bg-surface";
  return (
    <Link href={href} className={`${base} ${look}`}>
      {children}
    </Link>
  );
}

/** Large, centered room code (monospace). */
export function CodeBadge({ code }: { code: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Código</span>
      <span className="font-mono text-4xl font-black tracking-[0.3em] text-accent">{code}</span>
    </div>
  );
}

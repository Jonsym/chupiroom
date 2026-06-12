"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type Opts = {
  enabled: boolean;
  allowHorizontal: boolean;
  allowUp: boolean;
  onUp?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
};

const THRESHOLD = 70;

/**
 * Lightweight pointer/touch swipe for the offline card — no dependencies.
 * Tracks the live drag (for a tactile transform) and fires a direction on
 * release past the threshold. Vertical = up only; horizontal = left/right.
 */
export function useCardSwipe({ enabled, allowHorizontal, allowUp, onUp, onLeft, onRight }: Opts) {
  const [drag, setDrag] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const curRef = useRef({ x: 0, y: 0 });

  const reset = () => {
    startRef.current = null;
    curRef.current = { x: 0, y: 0 };
    setDrag({ x: 0, y: 0, active: false });
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!enabled) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    curRef.current = { x: 0, y: 0 };
    setDrag({ x: 0, y: 0, active: true });
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // capture is best-effort
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!startRef.current) return;
    const x = e.clientX - startRef.current.x;
    const y = e.clientY - startRef.current.y;
    curRef.current = { x, y };
    setDrag({ x, y, active: true });
  };

  const onPointerUp = () => {
    if (!startRef.current) return;
    const { x, y } = curRef.current;
    reset();
    if (allowHorizontal && Math.abs(x) > Math.abs(y) && Math.abs(x) > THRESHOLD) {
      if (x > 0) onRight?.();
      else onLeft?.();
      return;
    }
    if (allowUp && y < -THRESHOLD && Math.abs(y) > Math.abs(x)) {
      onUp?.();
    }
  };

  return {
    drag,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}

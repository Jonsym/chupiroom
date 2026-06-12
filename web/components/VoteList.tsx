"use client";

import { initials } from "@/lib/theme";

export type VoteOption = { key: string; name: string; color: string };

/**
 * Votaciones option list — mirrors the mobile VoteList: rounded player rows with
 * an avatar, name, and a vote-count badge. The current pick / winner is outlined
 * in the accent colour. Presentational only; the parent owns vote state.
 */
export function VoteList({
  options,
  counts,
  showResult,
  winners = [],
  selectedKey = null,
  disabled = false,
  onSelect,
}: {
  options: VoteOption[];
  counts: Record<string, number>;
  showResult: boolean;
  winners?: string[];
  selectedKey?: string | null;
  disabled?: boolean;
  onSelect?: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {showResult && (
        <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-accent">
          {winners.length > 1 ? "¡Empate!" : "Más votado"}
        </p>
      )}
      {options.map((o) => {
        const count = counts[o.key] ?? 0;
        const isWinner = showResult && winners.includes(o.key);
        const isSelected = selectedKey === o.key;
        const outlined = isWinner || isSelected;
        const countOn = count > 0 || isWinner;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onSelect?.(o.key)}
            disabled={disabled}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition-colors ${
              outlined ? "border-accent bg-[rgba(224,221,238,0.12)]" : "border-border bg-surface-elevated"
            } ${disabled ? "cursor-default" : "hover:border-accent/40"}`}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold text-background"
              style={{ backgroundColor: o.color }}
            >
              {initials(o.name)}
            </span>
            <span className="flex-1 truncate font-bold text-accent">{o.name}</span>
            <span
              className={`flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-sm font-extrabold ${
                countOn ? "border-accent bg-accent text-background" : "border-border bg-surface text-accent-soft"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

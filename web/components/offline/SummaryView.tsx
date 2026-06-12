"use client";

import { GlowShell, Logo, Panel, Pill } from "@/components/brand";
import { OFFLINE_TYPE_LABEL } from "@/lib/offline/cards";
import type { OfflineSummary } from "./OfflineGame";

export function SummaryView({
  summary,
  onAgain,
  onHome,
}: {
  summary: OfflineSummary;
  onAgain: () => void;
  onHome: () => void;
}) {
  return (
    <GlowShell>
      <div className="flex flex-col items-center gap-3 text-center">
        <Pill>Resumen</Pill>
        <Logo className="text-3xl" />
        <p className="text-2xl font-black text-accent">¡Partida terminada!</p>
      </div>

      <Panel className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface-elevated px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Rondas</span>
            <span className="text-2xl font-black text-accent">{summary.roundsPlayed}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface-elevated px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Juegos</span>
            <span className="text-2xl font-black text-accent">{summary.games.length}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Juegos jugados</span>
          <div className="flex flex-wrap gap-2">
            {summary.games.map((g) => (
              <span
                key={g}
                className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs font-bold text-accent-soft"
              >
                {OFFLINE_TYPE_LABEL[g]}
              </span>
            ))}
          </div>
        </div>

        {summary.votes.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Más votados</span>
            {summary.votes.map((v, i) => (
              <div
                key={i}
                className="flex flex-col gap-0.5 rounded-2xl border border-border bg-surface-elevated px-4 py-2.5"
              >
                <span className="text-sm font-semibold text-accent-soft">{v.question}</span>
                <span className="font-bold text-accent">
                  {v.winners.length > 0 ? v.winners.join(", ") : "Sin votos"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={onAgain}
          className="flex h-12 w-full items-center justify-center rounded-full bg-accent px-5 text-base font-bold text-background transition-colors hover:bg-accent-soft"
        >
          Jugar otra vez
        </button>
        <button
          type="button"
          onClick={onHome}
          className="flex h-12 w-full items-center justify-center rounded-full border border-border bg-surface-elevated px-5 text-base font-bold text-accent transition-colors hover:bg-surface"
        >
          Volver al inicio
        </button>
      </div>
    </GlowShell>
  );
}
